"use strict";
/* MÀN MỞ ĐẦU — hoa hồng 3D dựng bằng Three.js (bản trau chuốt).
   - Cánh: biên dạng bo tròn (phình ở 60% rồi thu về ngọn), mép gợn sóng, gân gập
     dọc giữa, khum ngang + cuộn mép; mỗi cánh một hình học riêng (pha gợn khác
     nhau) và lệch tông nhẹ — hết cảm giác "cắt giấy" và "nhựa đồng đều".
   - Đủ bộ phận của hoa hồng: bầu đài xanh + 5 lá đài nhọn, chóp nụ khép tâm,
     cuống có gai. 5 vòng cánh xoắn ốc (3/5/6/8/9 = 31 cánh).
   Nhịp nở và tham số vòng cánh theo công thức đã mổ từ mẫu tham chiếu. */
window.Rose = (function () {
  const RINGS = [
    { n: 3, w: 0.95, h: 1.05, r: 0.04, bud: -0.10, open: 0.20, cup: 0.42, curl: 0.38 },
    { n: 5, w: 1.15, h: 1.22, r: 0.10, bud: -0.04, open: 0.38, cup: 0.40, curl: 0.44 },
    { n: 6, w: 1.38, h: 1.40, r: 0.17, bud: 0.0, open: 0.58, cup: 0.36, curl: 0.46 },
    { n: 8, w: 1.62, h: 1.55, r: 0.25, bud: 0.15, open: 0.78, cup: 0.32, curl: 0.38 },
    { n: 9, w: 1.85, h: 1.66, r: 0.33, bud: 0.24, open: 0.98, cup: 0.28, curl: 0.46 }
  ];
  const BLOOM_TOTAL = 1.9;

  let group = null, rings = [], petalTex = null, dome = null;
  let state = "idle";
  let bloomT = 0, burstT = 0;
  let burstPetals = [];
  let sceneRef = null;
  const api = { onBloomDone: null };

  function makePetalTexture() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, "#EFA9C0");
    grad.addColorStop(0.45, "#F0A0B8");
    grad.addColorStop(0.8, "#EC74A4");
    grad.addColorStop(1, "#D94F7A");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    // đốm màu mềm cho chất hữu cơ
    for (let i = 0; i < 42; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = 14 + Math.random() * 42;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      const light = Math.random() > 0.5;
      rg.addColorStop(0, light ? "rgba(255,235,242,0.10)" : "rgba(196,50,110,0.08)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    // vân cánh từ gốc tỏa ra
    g.strokeStyle = "rgba(170,60,110,0.26)"; g.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      g.beginPath(); g.moveTo(128, 262);
      g.quadraticCurveTo(128 + i * 16, 140, 128 + i * 30, -8); g.stroke();
    }
    // viền ngọn và hai mép đậm hơn -> thấy độ dày của cánh
    const top = g.createLinearGradient(0, 0, 0, 40);
    top.addColorStop(0, "rgba(158,28,76,0.35)"); top.addColorStop(1, "rgba(158,28,76,0)");
    g.fillStyle = top; g.fillRect(0, 0, 256, 40);
    [0, 244].forEach(x0 => {
      const side = g.createLinearGradient(x0, 0, x0 + (x0 === 0 ? 12 : -12), 0);
      side.addColorStop(0, "rgba(158,28,76,0.22)"); side.addColorStop(1, "rgba(158,28,76,0)");
      g.fillStyle = side; g.fillRect(Math.min(x0, x0 + 12), 0, 12, 256);
    });
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* Hình học cánh: plane được tạo hình lại —
     profile(v): chân hẹp, phình ở ~60%, bo tròn về ngọn (góc ngọn rủ xuống);
     gân giữa nhô nhẹ; mép ngọn gợn sóng (pha riêng từng cánh). */
  function petalGeometry(w, h, cup, curl, phase, roundTip) {
    const geo = new THREE.PlaneGeometry(w, h, 8, 12);
    geo.translate(0, h / 2, 0);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i); const y = pos.getY(i);
      const u = x / w, v = y / h;
      const pBase = roundTip ? 0.46 : 0.30;
      const prof = pBase + (1.08 - pBase) * Math.pow(Math.sin(Math.PI * Math.min(1, 0.10 + 0.90 * v)), 0.75);
      x = x * prof / 1.08; // chuẩn hóa: điểm phình nhất = bề rộng thiết kế, chân ~58%, ngọn ~28%
      let z = cup * (u * u) * w * 1.15;                       // khum ngang
      z += curl * Math.pow(v, 3) * h * 0.78;                  // cuộn mép
      z += (1 - Math.abs(u * 2)) * 0.055 * h * v;              // gân giữa
      z += Math.sin(u * Math.PI * 4 + phase) * (roundTip ? 0.02 : 0.05) * w * v * v; // gợn mép
      const droop = Math.pow(Math.abs(u * 2), 2) * (roundTip ? 0.16 : 0.30) * h * Math.pow(v, 3); // góc ngọn rủ -> đầu tròn
      pos.setX(i, x);
      pos.setY(i, y - droop * 0.4);
      pos.setZ(i, z - droop);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function build(scene) {
    sceneRef = scene;
    petalTex = makePetalTexture();
    group = new THREE.Group();
    const sageDark = new THREE.MeshStandardMaterial({ color: 0x6B9455, roughness: 0.9 });
    const sage = new THREE.MeshStandardMaterial({ color: 0x7FA36B, roughness: 0.9 });
    const sageLeaf = new THREE.MeshStandardMaterial({ color: 0x8FB573, roughness: 0.85, side: THREE.DoubleSide });

    // cuống + gai
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.6, 8), sage);
    stem.position.y = -1.45; group.add(stem);
    const thornMat = new THREE.MeshStandardMaterial({ color: 0x9A5A48, roughness: 0.8 });
    [[-0.85, 1], [-1.45, -1], [-2.0, 1]].forEach(T => {
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.13, 6), thornMat);
      thorn.position.set(0.055 * T[1], T[0], 0);
      thorn.rotation.z = -1.15 * T[1];
      group.add(thorn);
    });
    // lá
    [[-0.5, -0.9, 0.7], [0.5, -1.4, -0.7]].forEach(L => {
      const leaf = new THREE.Mesh(petalGeometry(0.55, 0.85, 0.5, 0.35, Math.random() * 6), sageLeaf);
      leaf.position.set(L[0] * 0.4, L[1] + 0.55, 0);
      leaf.rotation.z = L[2]; leaf.rotation.x = -0.7;
      leaf.scale.setScalar(0.85);
      group.add(leaf);
    });
    // bầu đài + lá đài
    const calyx = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 10), sageDark);
    calyx.scale.set(1, 1.3, 1); calyx.position.y = -0.16; group.add(calyx);
    for (let i = 0; i < 5; i++) {
      const holder = new THREE.Object3D();
      holder.rotation.y = (i / 5) * Math.PI * 2 + 0.3;
      const sepal = new THREE.Mesh(petalGeometry(0.26, 0.8, 0.35, 0.4, i * 1.7), sageLeaf);
      sepal.position.set(0, -0.05, 0.16);
      sepal.rotation.x = -2.25; // xòe ra và chúc xuống như lá đài thật
      holder.add(sepal); group.add(holder);
    }
    // các vòng cánh — hình học riêng từng cánh, tông lệch nhẹ
    RINGS.forEach((cfg, ri) => {
      const holders = [];
      for (let i = 0; i < cfg.n; i++) {
        const geo = petalGeometry(cfg.w * 0.85, cfg.h, cfg.cup, cfg.curl, Math.random() * 6.28, ri < 3);
        const tint = new THREE.Color().setHSL(0.965 + Math.random() * 0.012, 0.32, 0.90 - ri * 0.028 + Math.random() * 0.03);
        const mat = new THREE.MeshStandardMaterial({
          map: petalTex, side: THREE.DoubleSide, roughness: 0.7, metalness: 0,
          color: tint, transparent: true
        });
        const petal = new THREE.Mesh(geo, mat);
        const holder = new THREE.Object3D();
        holder.rotation.y = (i / cfg.n) * Math.PI * 2 + ri * 0.55;
        holder.position.y = -ri * 0.05;
        petal.position.z = cfg.r;
        petal.rotation.x = -cfg.bud;
        holder.add(petal); group.add(holder);
        holders.push(petal);
      }
      rings.push({ cfg, holders });
    });
    // chóp nụ khép tâm
    const domeMat = new THREE.MeshStandardMaterial({ map: petalTex, roughness: 0.7, color: new THREE.Color().setHSL(0.97, 0.35, 0.82), transparent: true });
    dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), domeMat);
    dome.scale.set(1.3, 1.7, 1.3);
    dome.position.y = 0.58;
    group.add(dome);

    group.scale.setScalar(4.2);
    group.position.set(0, -2.6, 10);
    group.rotation.x = 0.72;
    scene.add(group);
  }

  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function startBloom() { if (state === "idle") { state = "blooming"; bloomT = 0; } }

  function burst() {
    if (state === "gone") return;
    state = "burst"; burstT = 0;
    const geo = petalGeometry(0.62, 0.85, 0.4, 0.5, 1.3);
    for (let i = 0; i < 30; i++) {
      const mat = new THREE.MeshBasicMaterial({ map: petalTex, side: THREE.DoubleSide, transparent: true, depthWrite: false });
      const m = new THREE.Mesh(geo, mat);
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.6;
      m.position.set(Math.cos(a) * r, 0.6 + Math.random() * 1.4, 10 + Math.sin(a) * r);
      m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      sceneRef.add(m);
      burstPetals.push({
        m,
        vx: Math.cos(a) * (1 + Math.random() * 2.4),
        vy: 3.2 + Math.random() * 3.4,
        vz: Math.sin(a) * (1 + Math.random() * 2),
        rx: (Math.random() - 0.5) * 5, rz: (Math.random() - 0.5) * 5,
        life: 0
      });
    }
  }

  function update(dt, t) {
    if (!group) return;
    if (state === "idle") {
      const s = 4.2 * (1 + 0.018 * Math.sin(t * 1.3));
      group.scale.setScalar(s);
      group.rotation.y = 0.12 * Math.sin(t * 0.4);
    } else if (state === "blooming") {
      bloomT += dt;
      rings.forEach((ring, ri) => {
        const p = Math.min(1, Math.max(0, (bloomT - ri * 0.16) / 1.15));
        const tilt = ring.cfg.bud + (ring.cfg.open - ring.cfg.bud) * easeOut(p);
        ring.holders.forEach(pt => { pt.rotation.x = -tilt; });
      });
      if (dome) { const dp = Math.min(1, bloomT / BLOOM_TOTAL); dome.scale.set(1.3 * (1 - dp * 0.65), 1.7 * (1 - dp * 0.55), 1.3 * (1 - dp * 0.65)); }
      group.rotation.y += dt * 0.25;
      if (bloomT >= BLOOM_TOTAL) {
        state = "bloomed";
        if (api.onBloomDone) api.onBloomDone();
      }
    } else if (state === "burst" || state === "bloomed") {
      if (state === "burst") {
        burstT += dt;
        const fade = Math.max(0, 1 - burstT / 1.1);
        rings.forEach(ring => ring.holders.forEach(pt => { pt.material.opacity = fade; }));
        if (dome) dome.material.opacity = fade;
        group.position.y -= dt * 0.7;
        if (burstT > 1.15) { group.visible = false; state = "gone"; }
      }
    }
    for (let i = burstPetals.length - 1; i >= 0; i--) {
      const p = burstPetals[i]; p.life += dt;
      p.vy -= 3.4 * dt;
      p.m.position.x += p.vx * dt; p.m.position.y += p.vy * dt; p.m.position.z += p.vz * dt;
      p.m.rotation.x += p.rx * dt; p.m.rotation.z += p.rz * dt;
      p.m.material.opacity = Math.max(0, 1 - p.life / 2.6);
      if (p.life > 2.6) { sceneRef.remove(p.m); p.m.material.dispose(); burstPetals.splice(i, 1); }
    }
  }

  api.build = build; api.startBloom = startBloom; api.burst = burst; api.update = update;
  api.getState = () => state;
  return api;
})();
