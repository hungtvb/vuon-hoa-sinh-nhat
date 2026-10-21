"use strict";
/* MÀN MỞ ĐẦU — hoa hồng ẢNH (AI tạo riêng: nụ + nở cùng một bông, tách nền).
   Bài học từ mẫu lovegift: họ dán ảnh cánh hoa THẬT lên hình học; hoa dựng hình
   thuần túy luôn lộ chất "3D". Bản này dùng ảnh thật làm sprite trong cùng sân
   khấu WebGL: nụ thở nhẹ -> nở bằng chồng chéo ảnh (nụ phình + ảnh nở hiện dần)
   -> tung 26 cánh ảnh -> mưa đổ. Giữ nguyên API cho main.js. */
window.Rose = (function () {
  const BLOOM_TOTAL = 1.9;
  const BASE_H = 17;                 // chiều cao hoa (đơn vị thế giới)
  let group = null, budSpr = null, openSpr = null, glow = null, petalTex = null;
  let budBase = null, openBase = null;
  let loaded = 0;                      // số texture đã tải (cần 3)
  let state = "idle";
  let bloomT = 0, burstT = 0;
  let burstPetals = [];
  let sceneRef = null;
  const api = { onBloomDone: null };

  function makeGlowTexture() {
    const c = document.createElement("canvas"); c.width = c.height = 256;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,120,170,0.55)");
    grad.addColorStop(0.55, "rgba(255,130,175,0.20)");
    grad.addColorStop(1, "rgba(255,130,175,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }
  function loadTex(url, onOk) {
    return new THREE.TextureLoader().load(url, t => {
      t.encoding = THREE.sRGBEncoding;
      loaded++;
      if (onOk) onOk(t);
    });
  }
  function makeSprite(tex, h) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false });
    const s = new THREE.Sprite(mat);
    const aspect = tex.image ? tex.image.width / tex.image.height : 0.386;
    s.scale.set(h * aspect, h, 1);
    return s;
  }

  function build(scene) {
    sceneRef = scene;
    group = new THREE.Group();
    group.position.set(0, -1.3, 10);
    glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeGlowTexture(), transparent: true, opacity: 0, depthWrite: false }));
    glow.scale.set(19, 19, 1); glow.position.set(0, 3.4, -0.6);
    group.add(glow);
    loadTex("assets/rose-bud.webp", t => {
      budSpr = makeSprite(t, BASE_H);
      budSpr.material.opacity = 1;
      budBase = budSpr.scale.clone();
      group.add(budSpr);
    });
    loadTex("assets/rose-open.webp", t => {
      openSpr = makeSprite(t, BASE_H);
      openSpr.material.opacity = 0;
      openBase = openSpr.scale.clone();
      group.add(openSpr);
    });
    loadTex("assets/rose-petal.webp", t => { petalTex = t; });
    scene.add(group);
  }

  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
  function easeOutBack(p) { const c = 1.70158; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); }
  function startBloom() { if (state === "idle") { state = "blooming"; bloomT = 0; } }

  function burst() {
    if (state === "gone" || !petalTex) return;
    state = "burst"; burstT = 0;
    for (let i = 0; i < 26; i++) {
      const mat = new THREE.SpriteMaterial({ map: petalTex, transparent: true, opacity: 1, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const sc = 1.1 + Math.random() * 0.9;
      s.scale.set(sc, sc * 0.9, 1);
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.8;
      s.position.set(Math.cos(a) * r, 3.6 + Math.random() * 1.6, 10 + Math.sin(a) * 1.2);
      sceneRef.add(s);
      burstPetals.push({
        s, vx: Math.cos(a) * (1 + Math.random() * 2.6), vy: 3.4 + Math.random() * 3.6,
        vz: Math.sin(a) * 1.4, spin: (Math.random() - 0.5) * 4.5, life: 0
      });
    }
  }

  function update(dt, t) {
    if (!group) return;
    const ready = budSpr && openSpr;
    if (glow) {
      const target = state === "idle" ? 0.34 : state === "blooming" ? 0.6 : 0.25;
      glow.material.opacity += (target - glow.material.opacity) * Math.min(1, dt * 2);
      const gs = 19 + Math.sin(t * 1.3) * 0.7;
      glow.scale.set(gs, gs, 1);
    }
    if (state === "idle") {
      const b = 1 + 0.016 * Math.sin(t * 1.3);
      group.scale.set(b, b, 1);
      group.position.y = -1.3 + Math.sin(t * 0.9) * 0.09;
      if (budSpr) budSpr.material.rotation = 0.016 * Math.sin(t * 0.55);
    } else if (state === "blooming") {
      if (!ready) return; // chờ ảnh tải xong mới bắt đầu nở
      bloomT += dt;
      const p = Math.min(1, bloomT / BLOOM_TOTAL);
      const bs = 1 + 0.10 * easeOut(Math.min(1, p / 0.6));
      budSpr.scale.set(budBase.x * bs, budBase.y * bs, 1);
      budSpr.material.opacity = p < 0.45 ? 1 : Math.max(0, 1 - (p - 0.45) / 0.3);
      const op = easeOut(Math.min(1, Math.max(0, (p - 0.12) / 0.75)));
      const os = 0.86 + 0.14 * easeOutBack(Math.min(1, Math.max(0, (p - 0.12) / 0.8)));
      openSpr.scale.set(openBase.x * os, openBase.y * os, 1);
      openSpr.material.opacity = op;
      group.scale.setScalar(1 + 0.03 * Math.sin(p * Math.PI));
      if (p >= 1) {
        state = "bloomed";
        if (api.onBloomDone) api.onBloomDone();
      }
    } else if (state === "burst" || state === "bloomed") {
      if (state === "burst") {
        burstT += dt;
        const fade = Math.max(0, 1 - burstT / 1.1);
        if (openSpr) openSpr.material.opacity = fade;
        if (budSpr) budSpr.material.opacity = 0;
        group.position.y -= dt * 0.7;
        if (burstT > 1.15) { group.visible = false; state = "gone"; }
      }
    }
    for (let i = burstPetals.length - 1; i >= 0; i--) {
      const p = burstPetals[i]; p.life += dt;
      p.vy -= 3.4 * dt;
      p.s.position.x += p.vx * dt; p.s.position.y += p.vy * dt; p.s.position.z += p.vz * dt;
      p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = Math.max(0, 1 - p.life / 2.6);
      if (p.life > 2.6) { sceneRef.remove(p.s); p.s.material.dispose(); burstPetals.splice(i, 1); }
    }
  }

  api.build = build; api.startBloom = startBloom; api.burst = burst; api.update = update;
  api.getState = () => state;
  return api;
})();
