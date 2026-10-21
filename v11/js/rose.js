"use strict";
/* MÀN MỞ ĐẦU — nụ hoa 3D dựng bằng Three.js.
   5 vòng cánh xoắn ốc; mỗi cánh là mặt cong (khum ngang + cuộn mép) có thông số
   riêng từng vòng, dán texture cánh hoa vẽ trên canvas theo dải màu hồng pastel.
   Tham số vòng cánh và nhịp nở lấy theo công thức đã mổ từ mẫu tham chiếu. */
window.Rose = (function () {
  const RINGS = [
    { n: 3, w: 0.95, h: 1.05, r: 0.04, bud: 0.02, open: 0.20, cup: 0.42, curl: 0.10 },
    { n: 4, w: 1.15, h: 1.22, r: 0.10, bud: 0.05, open: 0.38, cup: 0.40, curl: 0.18 },
    { n: 5, w: 1.38, h: 1.40, r: 0.17, bud: 0.09, open: 0.58, cup: 0.36, curl: 0.28 },
    { n: 6, w: 1.62, h: 1.55, r: 0.25, bud: 0.15, open: 0.78, cup: 0.32, curl: 0.38 },
    { n: 7, w: 1.85, h: 1.66, r: 0.33, bud: 0.24, open: 0.98, cup: 0.28, curl: 0.46 }
  ];
  const BLOOM_TOTAL = 1.9; // giây: nở hết

  let group = null, rings = [], petalTex = null;
  let state = "idle"; // idle | blooming | burst | gone
  let bloomT = 0, burstT = 0;
  let burstPetals = [];
  let sceneRef = null;
  const api = { onBloomDone: null };

  function makePetalTexture() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 256, 0, 0);
    grad.addColorStop(0, "#EFA9C0");   // gốc cánh: hồng vừa (bớt mảng kem lạc lõng)
    grad.addColorStop(0.45, "#F0A0B8"); // blush đậm
    grad.addColorStop(0.8, "#EC74A4");  // hồng rõ
    grad.addColorStop(1, "#D94F7A");    // mép: hồng đậm
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    // vân cánh: các đường cong từ gốc tỏa ra
    g.strokeStyle = "rgba(170,60,110,0.28)"; g.lineWidth = 2;
    for (let i = -4; i <= 4; i++) {
      g.beginPath(); g.moveTo(128, 262);
      g.quadraticCurveTo(128 + i * 16, 140, 128 + i * 30, -8); g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  function petalGeometry(w, h, cup, curl) {
    const geo = new THREE.PlaneGeometry(w, h, 6, 10);
    geo.translate(0, h / 2, 0); // gốc cánh tại origin
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i);
      const u = x / w, v = y / h;
      let z = cup * (u * u) * w * 1.15;          // khum ngang vào tâm
      z += curl * Math.pow(v, 3) * h * 0.78;     // mép trên cuộn ra
      pos.setX(i, x * (1 - 0.22 * v));           // thu hẹp dần về ngọn
      pos.setZ(i, z);
    }
    geo.computeVertexNormals();
    return geo;
  }

  function build(scene) {
    sceneRef = scene;
    petalTex = makePetalTexture();
    group = new THREE.Group();
    // thân + lá
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x7FA36B, roughness: 0.9 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 2.4, 8), stemMat);
    stem.position.y = -1.2; group.add(stem);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x8FB573, roughness: 0.85, side: THREE.DoubleSide });
    [[-0.5, -0.9, 0.7], [0.5, -1.4, -0.7]].forEach(L => {
      const leaf = new THREE.Mesh(petalGeometry(0.55, 0.8, 0.5, 0.3), leafMat);
      leaf.position.set(L[0] * 0.4, L[1] + 0.8, 0);
      leaf.rotation.z = L[2]; leaf.rotation.x = -0.7;
      leaf.scale.setScalar(0.8);
      group.add(leaf);
    });
    // các vòng cánh
    RINGS.forEach((cfg, ri) => {
      const geo = petalGeometry(cfg.w * 0.85, cfg.h, cfg.cup, cfg.curl);
      const holders = [];
      for (let i = 0; i < cfg.n; i++) {
        const mat = new THREE.MeshStandardMaterial({
          map: petalTex, side: THREE.DoubleSide, roughness: 0.7, metalness: 0, color: 0xF2D7DE,
          transparent: true
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
    group.scale.setScalar(4.2);
    group.position.set(0, -2.6, 10);
    group.rotation.x = 0.72; // nghiêng mạnh về phía người xem để thấy tâm xoắn ốc từ trên-xéo
    scene.add(group);
  }

  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  function startBloom() { if (state === "idle") { state = "blooming"; bloomT = 0; } }

  function burst() {
    if (state === "gone") return;
    state = "burst"; burstT = 0;
    // 30 cánh rời tung lên
    const geo = new THREE.PlaneGeometry(0.62, 0.85, 1, 1);
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
        group.position.y -= dt * 0.7;
        if (burstT > 1.15) { group.visible = false; state = "gone"; }
      }
    }
    // cánh tung (chạy độc lập sau khi burst)
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
