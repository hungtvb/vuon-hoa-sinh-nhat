"use strict";
/* MÀN MƯA LỜI CHÚC 3D + GIỮ TAY GOM THÀNH TIM.
   - Lưới chữ 8 lớp sâu x 15 cột rơi như mưa (sprite canvas), 100 tim/hoa xen kẽ,
     thẻ ảnh polaroid trôi tự xoay, ~1000 hạt sáng (Points).
   - Giữ tay: mọi hạt bị hút về ngón tay, xoáy như lốc; giữ đủ 1,8s thì siết thành
     trái tim lấp đầy bằng chính các mảnh vừa gom; tim bay về giữa màn hình.
   Mọi chuyển động là vật lý từng khung hình (vận tốc + lực hút + xoáy + phanh). */
window.Rain = (function () {
  const MESSAGES = [
    "Chúc mừng sinh nhật chị", "Chúc chị luôn khỏe mạnh", "Tuổi mới rực rỡ hơn",
    "Hạnh phúc ngập tràn", "Cười thật nhiều nhé chị", "Bình an mỗi ngày",
    "May mắn luôn mỉm cười", "Mọi điều ước đều thành thật", "Thêm một tuổi thêm vui",
    "Công việc thuận lợi", "Luôn xinh đẹp như hôm nay", "Được thương thật nhiều",
    "Chị là tuyệt nhất", "Năm nay thật nhiều tin vui", "Thương chị nhiều"
  ];
  const TEXTCOLORS = ["#8A2A4E", "#C2437C", "#A03A63", "#6D2A4A", "#7A344F"];
  const HOLD_S = 1.8;

  let scene, camera, lite = false;
  let group = null;               // nhóm chứa toàn bộ cơn mưa
  let fallers = [];               // {obj, kind, speed, seed, vel, baseOpacity, local}
  let sparkles = null, sparkleMat = null, glow = null;
  let sparkleHome = null, sparkleTarget = null, sparkleVel = null, heartGlow = null;
  let mode = "off";               // off | fall | gather | form | heart | burst
  let rainFade = 0;
  let holding = false, holdProgress = 0;
  let pointerPx = { x: 0, y: 0 };
  let attractor = new THREE.Vector3(0, 0, 0);
  let heartCenter = new THREE.Vector3(0, 0.8, 0);
  let formT = 0, flyT = -1, burstT = 0;
  let pulse = 1;
  const api = { onFormed: null, onProgress: null };

  /* ---------- textures ---------- */
  function textTexture(text, color, hand) {
    const fs = hand ? 64 : 56;
    const c = document.createElement("canvas");
    const g0 = c.getContext("2d");
    g0.font = (hand ? "700 " : "700 ") + fs + "px " + (hand ? "'Dancing Script'" : "'Playfair Display'") + ", serif";
    const w = Math.ceil(g0.measureText(text).width) + 44;
    c.width = w; c.height = 96;
    const g = c.getContext("2d");
    g.font = (hand ? "700 " : "700 ") + fs + "px " + (hand ? "'Dancing Script'" : "'Playfair Display'") + ", serif";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(255,255,255,0.95)"; g.shadowBlur = 16;
    g.fillStyle = color;
    g.fillText(text, w / 2, 50); g.fillText(text, w / 2, 50);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return { tex, aspect: w / 96 };
  }
  function heartTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 10, 0, 118);
    grad.addColorStop(0, "#FF7A95"); grad.addColorStop(1, "#E0245E");
    g.shadowColor = "rgba(255,255,255,0.9)"; g.shadowBlur = 12;
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(64, 112);
    g.bezierCurveTo(6, 74, 12, 22, 44, 22);
    g.bezierCurveTo(56, 22, 62, 30, 64, 38);
    g.bezierCurveTo(66, 30, 72, 22, 84, 22);
    g.bezierCurveTo(116, 22, 122, 74, 64, 112);
    g.fill();
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  function flowerTexture(c1, c2) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    g.shadowColor = "rgba(255,255,255,0.85)"; g.shadowBlur = 8;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      g.fillStyle = i % 2 ? c1 : c2;
      g.beginPath();
      g.ellipse(64 + Math.cos(a) * 24, 64 + Math.sin(a) * 24, 17, 24, a + Math.PI / 2, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#F2A93B";
    g.beginPath(); g.arc(64, 64, 11, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    return tex;
  }
  function sparkleTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,252,230,1)");
    grad.addColorStop(0.35, "rgba(255,240,190,0.75)");
    grad.addColorStop(1, "rgba(255,240,190,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  function photoTexture(url) {
    const c = document.createElement("canvas"); c.width = 256; c.height = 300;
    const g = c.getContext("2d");
    g.fillStyle = "#FFFDF9"; g.fillRect(0, 0, 256, 300);
    g.fillStyle = "#F6CFE0"; g.fillRect(14, 14, 228, 228);
    const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
    const img = new Image();
    img.onload = () => {
      g.fillStyle = "#FFFDF9"; g.fillRect(0, 0, 256, 300);
      g.drawImage(img, 14, 14, 228, 228);
      tex.needsUpdate = true;
    };
    img.src = url;
    return tex;
  }

  /* ---------- build ---------- */
  function build(sc, cam, isLite) {
    scene = sc; camera = cam; lite = !!isLite;
    group = new THREE.Group(); group.visible = false; scene.add(group);
    const HERO = { "Chúc mừng sinh nhật chị": 1, "Chúc chị luôn khỏe mạnh": 1, "Thương chị nhiều": 1 };
    const textPool = MESSAGES.map((m, i) => {
      const hero = !!HERO[m];
      const t = textTexture(m, TEXTCOLORS[i % TEXTCOLORS.length], hero);
      t.hero = hero;
      return t;
    });
    const heartTex = heartTexture();
    const flowerTexA = flowerTexture("#F78FB3", "#F5A8C9");
    const flowerTexB = flowerTexture("#FFD66B", "#FFC7AE");
    const cols = lite ? 10 : 15, layers = 8;
    const rand = (a, b) => a + Math.random() * (b - a);

    function addSprite(tex, aspect, hWorld, x, y, z, baseOpacity, kind, speed) {
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
      const s = new THREE.Sprite(mat);
      s.scale.set(hWorld * aspect, hWorld, 1);
      s.position.set(x, y, z);
      group.add(s);
      fallers.push({ obj: s, kind, speed, seed: Math.random() * 10, vel: new THREE.Vector3(), baseOpacity, local: new THREE.Vector3(), spin: 0, baseScale: s.scale.clone(), formScale: 1, scaleK: 0 });
      return s;
    }
    // lưới chữ
    for (let l = 0; l < layers; l++) {
      const z = -l * 4.2;
      const scaleF = 1.18 - l * 0.075;
      for (let col = 0; col < cols; col++) {
        const pickT = textPool[Math.floor(Math.random() * textPool.length)];
        const x = -26 + (52 / (cols - 1)) * col + rand(-1.4, 1.4);
        addSprite(pickT.tex, pickT.aspect, 1.55 * scaleF * (pickT.hero ? 1.35 : 1), x, rand(-30, 40), z,
          (0.98 - l * 0.06), "text", (13 + Math.random() * 7) * (0.7 + 0.3 * scaleF));
      }
    }
    // tim + hoa xen kẽ
    const nHearts = lite ? 60 : 100;
    for (let i = 0; i < nHearts; i++) {
      const isFlower = i % 4 === 3;
      addSprite(isFlower ? (i % 8 === 3 ? flowerTexA : flowerTexB) : heartTex, 1,
        rand(0.65, 1.05), rand(-27, 27), rand(-38, 46), rand(-26, 2),
        rand(0.75, 0.97), isFlower ? "flower" : "heart", rand(5, 15));
    }
    // thẻ ảnh polaroid
    const arts = ["../assets/art/cake.webp", "../assets/art/bouquet.webp", "../assets/art/envelope.webp"];
    arts.forEach((url, i) => {
      for (let k = 0; k < 2; k++) {
        const mat = new THREE.MeshBasicMaterial({ map: photoTexture(url), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, color: 0xCFCFCF });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(3.1, 3.65), mat);
        m.position.set(rand(-18, 18), rand(-16, 38), rand(-14, -4));
        m.rotation.z = rand(-0.4, 0.4);
        group.add(m);
        fallers.push({ obj: m, kind: "photo", speed: rand(3, 5.5), seed: Math.random() * 10, vel: new THREE.Vector3(), baseOpacity: 0.96, local: new THREE.Vector3(), spin: rand(-0.25, 0.25), baseScale: m.scale.clone(), formScale: 1, scaleK: 0 });
      }
    });
    // hạt sáng
    const nSpark = lite ? 450 : 1000;
    const pos = new Float32Array(nSpark * 3);
    for (let i = 0; i < nSpark; i++) {
      pos[i * 3] = rand(-32, 32); pos[i * 3 + 1] = rand(-36, 40); pos[i * 3 + 2] = rand(-30, 6);
    }
    sparkleHome = pos.slice();
    sparkleTarget = new Float32Array(nSpark * 3);
    for (let i = 0; i < nSpark; i++) {
      const hp = (i % 3 !== 0) ? curvePoint(i) : insidePoint();
      sparkleTarget[i * 3] = hp.x; sparkleTarget[i * 3 + 1] = hp.y; sparkleTarget[i * 3 + 2] = (Math.random() - 0.5) * 2.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    sparkleMat = new THREE.PointsMaterial({ size: 0.55, map: sparkleTexture(), transparent: true, opacity: 0, depthWrite: false, color: 0xFFF0BE, sizeAttenuation: true });
    sparkles = new THREE.Points(geo, sparkleMat);
    group.add(sparkles);
    // quầng sáng hồng đặt sau trái tim khi gom thành hình
    const gc = document.createElement("canvas"); gc.width = gc.height = 256;
    const gg = gc.getContext("2d");
    const ggrad = gg.createRadialGradient(128, 128, 10, 128, 128, 128);
    ggrad.addColorStop(0, "rgba(255,120,170,0.55)");
    ggrad.addColorStop(0.55, "rgba(255,130,175,0.22)");
    ggrad.addColorStop(1, "rgba(255,130,175,0)");
    gg.fillStyle = ggrad; gg.fillRect(0, 0, 256, 256);
    const gtex = new THREE.CanvasTexture(gc);
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, transparent: true, opacity: 0, depthWrite: false }));
    glow.scale.set(30, 30, 1);
    group.add(glow);
    // lõi tim: hình tim mềm phát sáng làm nền cho hạt (chiêu của mẫu "trái tim ngân hà")
    const hc = document.createElement("canvas"); hc.width = hc.height = 512;
    const hg = hc.getContext("2d");
    hg.beginPath();
    for (let i = 0; i <= 120; i++) {
      const tt = (i / 120) * Math.PI * 2;
      const hx = 16 * Math.pow(Math.sin(tt), 3);
      const hy = 13 * Math.cos(tt) - 5 * Math.cos(2 * tt) - 2 * Math.cos(3 * tt) - Math.cos(4 * tt);
      const px = 256 + hx * 13, py = 256 - (hy + 2.7) * 13;
      if (i === 0) hg.moveTo(px, py); else hg.lineTo(px, py);
    }
    hg.closePath();
    const hgrad = hg.createRadialGradient(256, 270, 20, 256, 270, 250);
    hgrad.addColorStop(0, "rgba(255,85,140,0.95)");
    hgrad.addColorStop(0.55, "rgba(255,105,160,0.55)");
    hgrad.addColorStop(0.85, "rgba(255,120,170,0.18)");
    hgrad.addColorStop(1, "rgba(255,120,170,0)");
    hg.shadowColor = "rgba(255,80,140,0.8)"; hg.shadowBlur = 34;
    hg.fillStyle = hgrad;
    hg.fill(); hg.fill();
    const htex = new THREE.CanvasTexture(hc); htex.encoding = THREE.sRGBEncoding;
    heartGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: htex, transparent: true, opacity: 0, depthWrite: false }));
    heartGlow.scale.set(21.2, 21.2, 1);
    group.add(heartGlow);
  }

  function start() { group.visible = true; if (mode === "off") mode = "fall"; }

  /* ---------- tương tác ---------- */
  const _ray = new THREE.Raycaster();
  const _plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const _ndc = new THREE.Vector2();
  function pointerWorld(px, py, z) {
    _ndc.set((px / window.innerWidth) * 2 - 1, -(py / window.innerHeight) * 2 + 1);
    _ray.setFromCamera(_ndc, camera);
    _plane.constant = -z;
    const out = new THREE.Vector3();
    _ray.ray.intersectPlane(_plane, out);
    return out;
  }
  function setHold(active, px, py) {
    if (mode !== "fall" && mode !== "gather") return;
    holding = active;
    if (px !== undefined) { pointerPx = { x: px, y: py }; }
    if (active) mode = "gather";
  }
  function heartPoint(i, n) {
    // 68% điểm nằm trên đường viền tim (công thức tham số), 32% lấp bên trong
    if (i % 3 !== 2) {
      const t = ((i * 2.39996) % (Math.PI * 2)); // rải vàng theo vòng
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      return new THREE.Vector3(x * 0.60, y * 0.60 + 0.4, (Math.random() - 0.5) * 1.7);
    }
    for (let tries = 0; tries < 12; tries++) {
      const x = (Math.random() * 2 - 1) * 1.05, y = (Math.random() * 2 - 1) * 1.05;
      const q = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
      if (q < 0) return new THREE.Vector3(x * 9.2, y * 9.2 + 0.4, (Math.random() - 0.5) * 1.4);
    }
    return new THREE.Vector3(0, 0.4, 0);
  }
  function curvePoint(k) {
    const t = (k * 2.39996) % (Math.PI * 2);
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return new THREE.Vector3(x * 0.54, y * 0.54 + 0.4, (Math.random() - 0.5) * 1.7);
  }
  function insidePoint() {
    for (let tries = 0; tries < 14; tries++) {
      const x = (Math.random() * 2 - 1) * 1.02, y = (Math.random() * 2 - 1) * 1.02;
      const q = Math.pow(x * x + y * y - 1, 3) - x * x * Math.pow(y, 3);
      if (q < -0.06) return new THREE.Vector3(x * 7.95, y * 7.45 - 1.0, (Math.random() - 0.5) * 1.3);
    }
    return new THREE.Vector3(0, 0.4, 0);
  }
  function formHeart() {
    mode = "form"; formT = 0; flyT = -1;
    heartCenter.copy(attractor);
    heartCenter.x = Math.max(-6, Math.min(6, heartCenter.x));
    heartCenter.y = Math.max(-4, Math.min(6, heartCenter.y));
    heartCenter.z = 0;
    const outline = fallers.filter(f => f.kind !== "text");
    const texts = fallers.filter(f => f.kind === "text");
    outline.forEach((f, k) => { f.local.copy(curvePoint(k)); f.formScale = f.kind === "photo" ? 0.55 : 0.95; });
    texts.forEach((f, k) => {
      // phần chữ đầu lấp thêm viền cho dày, còn lại lấp ruột
      f.local.copy(k < 26 ? curvePoint(outline.length + k) : insidePoint());
      f.formScale = 0.42;
    });
  }
  function burstHeart() {
    if (mode !== "heart") return;
    mode = "burst"; burstT = 0;
    if (sparkleTarget) {
      sparkleVel = new Float32Array(sparkleTarget.length);
      const posA = sparkles.geometry.attributes.position.array;
      for (let i = 0; i < sparkleTarget.length; i += 3) {
        let dx = posA[i] - heartCenter.x, dy = posA[i + 1] - heartCenter.y, dz = posA[i + 2];
        const d = Math.max(0.4, Math.hypot(dx, dy, dz));
        const sp = 4 + Math.random() * 10;
        sparkleVel[i] = dx / d * sp; sparkleVel[i + 1] = dy / d * sp + 1.6; sparkleVel[i + 2] = dz / d * sp;
      }
    }
    fallers.forEach(f => {
      const dir = f.obj.position.clone().sub(heartCenter);
      dir.z = (Math.random() - 0.5) * 0.6;
      dir.normalize().multiplyScalar(5 + Math.random() * 12);
      dir.y += 2.2;
      f.vel.copy(dir);
      f.spin = (Math.random() - 0.5) * 6;
    });
  }

  /* ---------- update ---------- */
  function update(dt, t) {
    if (!group || mode === "off") return;
    if (rainFade < 1) rainFade = Math.min(1, rainFade + dt / 1.2);
    const damp = Math.exp(-1.9 * dt), dampForm = Math.exp(-3.4 * dt);

    if (mode === "gather" || mode === "fall") {
      if (holding && mode === "gather") {
        holdProgress = Math.min(1, holdProgress + dt / HOLD_S);
        attractor.copy(pointerWorld(pointerPx.x, pointerPx.y, 0));
        if (holdProgress >= 1) formHeart();
      } else {
        holdProgress = Math.max(0, holdProgress - dt / 1.1);
        if (mode === "gather" && holdProgress <= 0) mode = "fall";
      }
      if (api.onProgress) api.onProgress(holdProgress, holding);
    }

    fallers.forEach(f => {
      const p = f.obj.position;
      if (mode === "fall") {
        p.y -= f.speed * dt;
        p.x += Math.sin(t * 0.9 + f.seed) * 0.35 * dt;
        if (f.kind === "photo") { f.obj.rotation.z += f.spin * dt * 0.4; f.obj.rotation.y = Math.sin(t * 0.5 + f.seed) * 0.35; }
        if (p.y < -34) { p.y = 40 + Math.random() * 4; p.x = (Math.random() - 0.5) * 54; }
        f.obj.material.opacity = f.baseOpacity * rainFade;
      } else if (mode === "gather") {
        if (holding) {
          const aw = pointerWorld(pointerPx.x, pointerPx.y, p.z);
          const dir = aw.clone().sub(p); const d = Math.max(0.001, dir.length());
          const pull = 48 * (1.1 + holdProgress * 1.3) * Math.min(1, d / 5 + 0.45);
          const acc = dir.multiplyScalar(pull / d);
          const tang = new THREE.Vector3(-dir.y, dir.x, 0).multiplyScalar(24 * (1 - holdProgress * 0.3) / d);
          f.vel.add(acc.add(tang).multiplyScalar(dt));
        } else {
          f.vel.y -= f.speed * 0.6 * dt;
        }
        f.vel.multiplyScalar(damp);
        p.add(f.vel.clone().multiplyScalar(dt));
        f.obj.material.opacity = f.baseOpacity * rainFade;
      } else if (mode === "form" || mode === "heart") {
        f.scaleK = Math.min(1, (f.scaleK || 0) + dt * 2.2);
        const sk = 1 + (f.formScale - 1) * f.scaleK;
        f.obj.scale.set(f.baseScale.x * sk, f.baseScale.y * sk, 1);
        const target = heartCenter.clone().add(f.local.clone().multiplyScalar(mode === "heart" ? pulse : 1));
        const acc = target.sub(p).multiplyScalar(24);
        f.vel.add(acc.multiplyScalar(dt)).multiplyScalar(dampForm);
        p.add(f.vel.clone().multiplyScalar(dt));
        if (f.kind === "photo") { f.obj.rotation.z *= 0.94; f.obj.rotation.y *= 0.94; }
        f.obj.material.opacity = f.baseOpacity;
      } else if (mode === "burst") {
        f.vel.y -= 2.4 * dt;
        f.vel.multiplyScalar(Math.exp(-0.7 * dt));
        p.add(f.vel.clone().multiplyScalar(dt));
        if (f.obj.material.rotation !== undefined) f.obj.material.rotation += f.spin * dt;
        f.obj.material.opacity = Math.max(0, f.baseOpacity * (1 - burstT / 2.7));
      }
    });

    if (mode === "form") {
      formT += dt;
      if (formT > 1.0 && flyT < 0) flyT = 0;
      if (flyT >= 0) {
        flyT += dt;
        const k = Math.min(1, flyT / 1.25), e = k * k * (3 - 2 * k);
        heartCenter.lerp(new THREE.Vector3(0, 0.8, 0), e * 0.12 + 0.02);
        if (k >= 1 || heartCenter.distanceTo(new THREE.Vector3(0, 0.8, 0)) < 0.05) {
          heartCenter.set(0, 0.8, 0); mode = "heart";
          if (api.onFormed) api.onFormed();
        }
      }
    }
    if (heartGlow) {
      const ht = (mode === "form" || mode === "heart") ? 0.95 : 0;
      heartGlow.material.opacity += (ht - heartGlow.material.opacity) * Math.min(1, dt * (mode === "burst" ? 6 : 2));
      heartGlow.position.set(heartCenter.x, heartCenter.y - 0.99, -2.5);
      const hs = 21.2 * (mode === "heart" ? pulse : 1);
      heartGlow.scale.set(hs, hs, 1);
    }
    if (mode === "burst") {
      burstT += dt;
      if (burstT > 2.9) { mode = "off"; group.visible = false; }
    }
    if (sparkles) {
      const posA = sparkles.geometry.attributes.position.array;
      if (mode === "gather") {
        const kk = 1 - Math.exp(-1.1 * dt);
        for (let i = 0; i < posA.length; i += 3) {
          posA[i] += (attractor.x - posA[i]) * kk * 0.4;
          posA[i + 1] += (attractor.y - posA[i + 1]) * kk * 0.4;
        }
        sparkles.geometry.attributes.position.needsUpdate = true;
      } else if (mode === "fall") {
        const kk = 1 - Math.exp(-0.7 * dt);
        for (let i = 0; i < posA.length; i += 3) {
          posA[i] += (sparkleHome[i] - posA[i]) * kk;
          posA[i + 1] += (sparkleHome[i + 1] - posA[i + 1]) * kk;
          posA[i + 2] += (sparkleHome[i + 2] - posA[i + 2]) * kk;
        }
        sparkles.geometry.attributes.position.needsUpdate = true;
      }
      if (mode === "form" || mode === "heart") {
        sparkles.rotation.y *= Math.exp(-2.5 * dt);
        const k = 1 - Math.exp(-2.8 * dt);
        const pf = mode === "heart" ? pulse : 1;
        for (let i = 0; i < posA.length; i += 3) {
          posA[i] += (heartCenter.x + sparkleTarget[i] * pf - posA[i]) * k;
          posA[i + 1] += (heartCenter.y + sparkleTarget[i + 1] * pf - posA[i + 1]) * k;
          posA[i + 2] += (heartCenter.z + sparkleTarget[i + 2] - posA[i + 2]) * k;
        }
        sparkles.geometry.attributes.position.needsUpdate = true;
        sparkleMat.opacity = 0.95;
        sparkleMat.size += (1.05 - sparkleMat.size) * Math.min(1, dt * 2);
        sparkleMat.color.setHex(0xFF6FA5);
      } else if (mode === "burst" && sparkleVel) {
        for (let i = 0; i < posA.length; i += 3) {
          sparkleVel[i + 1] -= 2.0 * dt;
          posA[i] += sparkleVel[i] * dt; posA[i + 1] += sparkleVel[i + 1] * dt; posA[i + 2] += sparkleVel[i + 2] * dt;
        }
        sparkles.geometry.attributes.position.needsUpdate = true;
        sparkleMat.opacity = Math.max(0, 0.95 * (1 - burstT / 2.7));
      } else {
        sparkles.rotation.y = t * 0.012;
        sparkleMat.opacity = rainFade * (0.62 + 0.3 * Math.sin(t * 2.3));
        sparkleMat.size += (0.55 - sparkleMat.size) * Math.min(1, dt * 2);
        sparkleMat.color.setHex(0xFFF0BE);
      }
    }
    if (glow) {
      const target = (mode === "form" || mode === "heart") ? 0.3 : 0;
      glow.material.opacity += (target - glow.material.opacity) * Math.min(1, dt * 2);
      glow.position.copy(heartCenter); glow.position.z = -3;
      const gs = 29 + Math.sin(t * 2.2) * 1.2;
      glow.scale.set(gs, gs, 1);
    }
  }

  api.build = build; api.start = start; api.update = update;
  api.setHold = setHold; api.burstHeart = burstHeart;
  api.setPulse = v => { pulse = v; };
  api.getMode = () => mode;
  api.getHeartCenter = () => heartCenter;
  api.getProgress = () => holdProgress;
  return api;
})();
