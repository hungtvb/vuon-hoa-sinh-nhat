"use strict";
/* HỘP BÍ MẬT 3D — Three.js r128 + UnrealBloom.
   4 thao tác leo thang trên 1 vật: KÉO XOAY -> CHẠM nơ x3 -> GIỮ lấy áp lực
   -> VUỐT tung nắp. Nổ 3D (cánh hoa/sao/tia lửa phun về phía camera), bóng bay
   chạm nổ được, phong thư vàng mở thư. Nhạc + hiệu ứng = file <audio>. */
(function () {
  const holder = document.getElementById("stage3d");
  const hintEl = document.getElementById("hint");
  const letterWrap = document.getElementById("letter-wrap");
  const bgm = document.getElementById("bgm");
  const popSnd = document.getElementById("pop");
  const whooshSnd = document.getElementById("whoosh");
  const chimes = [];
  for (let i = 0; i < 6; i++) { const a = new Audio(); a.src = "assets/chime" + i + ".mp3"; a.preload = "auto"; chimes.push(a); }
  let muted = false, musicStarted = false;

  const scene = new THREE.Scene();
  {
    const c = document.createElement("canvas"); c.width = 16; c.height = 512;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, "#FFC9DE"); gr.addColorStop(0.45, "#FFA3C6"); gr.addColorStop(1, "#F276A9");
    g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    const bgTex = new THREE.CanvasTexture(c);
    bgTex.encoding = THREE.sRGBEncoding;
    scene.background = bgTex;
  }
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0.7, 9.9);
  camera.lookAt(0, 0.1, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(1.75, devicePixelRatio || 1));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  holder.appendChild(renderer.domElement);

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.38, 0.5, 0.88);
  composer.addPass(bloom);

  scene.add(new THREE.HemisphereLight(0xFFF0F6, 0xC96A92, 0.45));
  const key = new THREE.DirectionalLight(0xFFFFFF, 0.45); key.position.set(3.5, 6, 5); scene.add(key);
  const rim = new THREE.PointLight(0xFF7FB0, 0.85, 30); rim.position.set(-5, 2.5, -3.5); scene.add(rim);
  const fill = new THREE.PointLight(0xFFD9A8, 0.35, 30); fill.position.set(0, 1.6, 6.5); scene.add(fill);

  /* ---------- texture vẽ tay bằng canvas ---------- */
  function radialTex(inner, outer) {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(64, 64, 2, 64, 64, 64);
    gr.addColorStop(0, inner); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  function starTex() {
    const c = document.createElement("canvas"); c.width = c.height = 96;
    const g = c.getContext("2d");
    g.translate(48, 48); g.fillStyle = "#FFE9A8";
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? 13 : 42, a = i * Math.PI / 4 - Math.PI / 2;
      g[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath(); g.fill();
    return new THREE.CanvasTexture(c);
  }
  function balloonTex(color) {
    const c = document.createElement("canvas"); c.width = 128; c.height = 168;
    const g = c.getContext("2d");
    const gr = g.createRadialGradient(46, 52, 6, 64, 66, 62);
    gr.addColorStop(0, "#FFFFFF"); gr.addColorStop(0.25, color); gr.addColorStop(1, shade(color, -38));
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(64, 64, 44, 54, 0, 0, 6.29); g.fill();
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.beginPath(); g.ellipse(46, 42, 12, 20, -0.5, 0, 6.29); g.fill();
    g.fillStyle = shade(color, -24);
    g.beginPath(); g.moveTo(58, 118); g.lineTo(70, 118); g.lineTo(64, 128); g.closePath(); g.fill();
    g.strokeStyle = "rgba(122,42,76,0.6)"; g.lineWidth = 2;
    g.beginPath(); g.moveTo(64, 128); g.quadraticCurveTo(56, 146, 64, 166); g.stroke();
    return new THREE.CanvasTexture(c);
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }
  function envelopeTex() {
    const c = document.createElement("canvas"); c.width = 256; c.height = 176;
    const g = c.getContext("2d");
    const gr = g.createLinearGradient(0, 0, 0, 176);
    gr.addColorStop(0, "#F2B84B"); gr.addColorStop(1, "#D98A26");
    g.fillStyle = gr; roundRect(g, 4, 4, 248, 168, 10); g.fill();
    g.fillStyle = "rgba(255,255,255,0.25)"; roundRect(g, 4, 4, 248, 168, 10); g.fill();
    g.fillStyle = "#C97A1E";
    g.beginPath(); g.moveTo(6, 8); g.lineTo(250, 8); g.lineTo(128, 104); g.closePath(); g.fill();
    g.fillStyle = "#FFE9C4";
    g.beginPath(); g.moveTo(6, 168); g.lineTo(112, 84); g.lineTo(6, 20); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(250, 168); g.lineTo(144, 84); g.lineTo(250, 20); g.closePath(); g.fill();
    g.fillStyle = "#E7548C";
    g.beginPath(); g.arc(128, 100, 17, 0, 6.29); g.fill();
    g.fillStyle = "#FFD9E8";
    g.font = "bold 17px serif"; g.textAlign = "center"; g.fillText("♥", 128, 107);
    return new THREE.CanvasTexture(c);
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  const glowTex = radialTex("rgba(255,190,215,0.9)", "rgba(255,190,215,0)");
  const sparkTex = radialTex("rgba(255,240,200,1)", "rgba(255,240,200,0)");

  /* ---------- sân khấu ---------- */
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.1, 40),
    new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, opacity: 0.75, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = -1.78; scene.add(disc);

  function makePoints(count, tex, size, color, opacity) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({ size, map: tex, transparent: true, opacity,
      depthWrite: false, blending: THREE.AdditiveBlending, color });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, geo, mat, vel: new Float32Array(count * 3), life: new Float32Array(count), max: new Float32Array(count), count };
  }
  // bụi sao ambient
  const ambient = makePoints(240, sparkTex, 0.14, 0xFFD9E8, 0.75);
  {
    const p = ambient.geo.attributes.position.array;
    for (let i = 0; i < ambient.count; i++) {
      const r = 3.4 + Math.random() * 3.6, th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1);
      p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * 0.8 - 1.4; p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 1;
      ambient.life[i] = Math.random() * 6;
    }
  }
  const burstP = makePoints(240, null, 0.42, 0xFFFFFF, 1);   // cánh hoa (gán map sau khi tải)
  new THREE.TextureLoader().load("assets/petal.webp", t => { t.encoding = THREE.sRGBEncoding; burstP.mat.map = t; burstP.mat.needsUpdate = true; });
  const burstS = makePoints(150, starTex(), 0.3, 0xFFE9A8, 1);
  const burstK = makePoints(200, sparkTex, 0.13, 0xFFF0C8, 1);
  const leaks = makePoints(120, sparkTex, 0.11, 0xFFC46B, 0.9);
  const tapSparks = makePoints(60, sparkTex, 0.12, 0xFFE9A8, 1);
  for (const sys of [burstP, burstS, burstK, leaks, tapSparks]) {
    const p = sys.geo.attributes.position.array;
    for (let i = 0; i < sys.count; i++) { p[i * 3 + 1] = -999; sys.life[i] = -1; }
  }
  function fire(sys, idx, x, y, z, vx, vy, vz, life) {
    const p = sys.geo.attributes.position.array;
    p[idx * 3] = x; p[idx * 3 + 1] = y; p[idx * 3 + 2] = z;
    sys.vel[idx * 3] = vx; sys.vel[idx * 3 + 1] = vy; sys.vel[idx * 3 + 2] = vz;
    sys.life[idx] = 0; sys.max[idx] = life;
  }
  function stepSys(sys, dt, gravity, drag) {
    const p = sys.geo.attributes.position.array;
    for (let i = 0; i < sys.count; i++) {
      if (sys.life[i] < 0) continue;
      sys.life[i] += dt;
      if (sys.life[i] > sys.max[i]) { sys.life[i] = -1; p[i * 3 + 1] = -999; continue; }
      sys.vel[i * 3 + 1] += gravity * dt;
      sys.vel[i * 3] *= drag; sys.vel[i * 3 + 1] *= drag; sys.vel[i * 3 + 2] *= drag;
      p[i * 3] += sys.vel[i * 3] * dt; p[i * 3 + 1] += sys.vel[i * 3 + 1] * dt; p[i * 3 + 2] += sys.vel[i * 3 + 2] * dt;
    }
    sys.geo.attributes.position.needsUpdate = true;
  }

  /* ---------- chiếc hộp ---------- */
  const GOLD = new THREE.MeshStandardMaterial({ color: 0xF2C14E, metalness: 0.6, roughness: 0.3, emissive: 0x2A1D05 });
  const PINK = new THREE.MeshStandardMaterial({ color: 0xD12A6E, metalness: 0.08, roughness: 0.36 });
  const PINK2 = new THREE.MeshStandardMaterial({ color: 0xDE4A88, metalness: 0.08, roughness: 0.32 });
  const boxG = new THREE.Group(); scene.add(boxG);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), PINK); boxG.add(body);
  for (const rib of [new THREE.Mesh(new THREE.BoxGeometry(2.26, 1.56, 0.36), GOLD),
                     new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.56, 2.26), GOLD)]) boxG.add(rib);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(2.32, 0.1, 2.32),
    new THREE.MeshBasicMaterial({ color: 0xFFD98A, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  seam.position.y = 0.78; boxG.add(seam);
  const lidG = new THREE.Group(); lidG.position.y = 0.75; boxG.add(lidG);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.44, 2.38), PINK2); lid.position.y = 0.22; lidG.add(lid);
  for (const rib of [new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.48, 0.36), GOLD),
                     new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.48, 2.44), GOLD)]) { rib.position.y = 0.22; lidG.add(rib); }
  const bowG = new THREE.Group(); bowG.position.y = 0.52; lidG.add(bowG);
  const bowL = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.115, 12, 24), GOLD);
  bowL.scale.set(1, 0.55, 0.65); bowL.position.x = -0.3; bowL.rotation.z = 0.65; bowG.add(bowL);
  const bowR = bowL.clone(); bowR.position.x = 0.3; bowR.rotation.z = -0.65; bowG.add(bowR);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), GOLD); bowG.add(knot);
  const innerLight = new THREE.PointLight(0xFFB84D, 0, 7); innerLight.position.y = 1.1; boxG.add(innerLight);
  boxG.position.y = -0.35;

  /* ---------- trạng thái & thao tác ---------- */
  let stage = "spin";           // spin -> tap -> hold -> swipe -> done -> letter
  let totalSpin = 0, rotVX = 0, rotVY = 0;
  let taps = 0, lidPop = 0, squash = 0;
  let pressure = 0, holding = false;
  let dragging = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0, swipeDy = 0;
  let exploded = false, lidFly = null, envelope = null, balloons = [];
  let leakAcc = 0, leakIdx = 0, tapIdx = 0;
  const ray = new THREE.Raycaster();
  ray.camera = camera;
  const ptr = new THREE.Vector2();
  const HINTS = {
    spin: "<b>Kéo để xoay</b> chiếc hộp, ngắm nó thật kỹ…",
    tap: "Có gì đó bên trong! <b>Chạm vào nút nơ 3 lần</b> để nới lỏng",
    hold: "<b>Nhấn &amp; giữ</b> vào hộp — đừng buông tay…",
    swipe: "Nắp sắp bung rồi! <b>Vuốt mạnh lên trên</b>",
    done: "Nhìn kìa… có một <b>phong thư</b> dành cho chị",
    letter: ""
  };
  function setStage(s) {
    stage = s;
    hintEl.innerHTML = HINTS[s] || "";
    document.querySelectorAll("#dots .d").forEach(el => {
      const k = el.getAttribute("data-s");
      const order = ["spin", "tap", "hold", "swipe"];
      el.classList.toggle("on", k === s);
      el.classList.toggle("done", order.indexOf(k) < order.indexOf(s) || s === "done" || s === "letter");
    });
    if (s === "done") document.getElementById("dots").style.opacity = "0.35";
    window.__stage = s;
  }
  function startMusic() {
    if (musicStarted) return; musicStarted = true;
    bgm.muted = muted; bgm.volume = 0.55;
    const p = bgm.play(); if (p) p.catch(() => {});
  }
  function playSnd(a, vol) {
    try { const c = a.cloneNode(); c.muted = muted; c.volume = vol || 1; const p = c.play(); if (p) p.catch(() => {}); } catch (e) {}
  }
  function chime(n) { playSnd(chimes[n % chimes.length], 0.9); }
  document.getElementById("mute").addEventListener("click", e => {
    e.stopPropagation();
    muted = !muted; bgm.muted = muted;
    e.currentTarget.classList.toggle("muted", muted);
  });
  document.getElementById("replay").addEventListener("click", () => location.reload());
  window.__music = { playing: () => !bgm.paused, at: () => bgm.currentTime };
  window.__rayTest = () => {
    if (!balloons.length) return "no-balloons";
    const v = balloons[0].position.clone().project(camera);
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    return { x: Math.round(x), y: Math.round(y), hit: !!castAt(x, y, balloons), camSet: !!ray.camera, n: balloons.length };
  };
  window.__debug = () => ({ stage, holding, pressure: +pressure.toFixed(3), taps,
    hitC: !!castAt(innerWidth/2, innerHeight*0.51, [boxG]),
    hit430: !!castAt(innerWidth/2, 430 * (innerHeight/844), [boxG]) });

  function castAt(cx, cy, targets) {
    ptr.x = (cx / innerWidth) * 2 - 1;
    ptr.y = -(cy / innerHeight) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(targets, true);
    return hits.length ? hits[0] : null;
  }
  const el = renderer.domElement;
  el.addEventListener("pointerdown", e => {
    startMusic();
    dragging = true; lastX = downX = e.clientX; lastY = downY = e.clientY; downT = performance.now(); swipeDy = 0;
    if (stage === "hold" && castAt(e.clientX, e.clientY, [boxG])) holding = true;
    if (stage === "done") {
      const bHit = castAt(e.clientX, e.clientY, balloons);
      if (bHit) { popBalloon(bHit.object); return; }
      if (envelope && castAt(e.clientX, e.clientY, [envelope])) { openLetter(); return; }
    }
  });
  el.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    if (stage === "spin") {
      boxG.rotation.y += dx * 0.009;
      boxG.rotation.x = Math.max(-0.45, Math.min(0.45, boxG.rotation.x + dy * 0.005));
      totalSpin += Math.abs(dx) * 0.009;
      if (totalSpin > 5.2) { setStage("tap"); chime(0); }
    } else if (stage === "swipe") {
      swipeDy += dy;
      lidG.position.y = 1.05 + Math.max(0, -swipeDy) * 0.002;
    }
  });
  window.addEventListener("pointerup", e => {
    const wasHold = holding; holding = false;
    if (!dragging) return;
    dragging = false;
    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
    const quick = performance.now() - downT < 400;
    if (stage === "tap" && quick && moved < 14 && castAt(e.clientX, e.clientY, [lidG, body])) registerTap();
    else if (stage === "swipe" && swipeDy < -85) explode();
    else if (stage === "swipe") lidG.position.y = 1.05;
  });
  el.addEventListener("contextmenu", e => e.preventDefault());

  function registerTap() {
    taps++;
    squash = 1;
    lidPop = Math.min(0.16, taps * 0.055);
    bowL.rotation.z = 0.65 + taps * 0.22;
    bowR.rotation.z = -0.65 - taps * 0.22;
    chime(taps);
    const wp = new THREE.Vector3(); knot.getWorldPosition(wp);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * 6.28, sp = 0.7 + Math.random() * 1.3;
      fire(tapSparks, tapIdx++ % tapSparks.count, wp.x, wp.y, wp.z, Math.cos(a) * sp, Math.random() * 1.6, Math.sin(a) * sp, 0.7);
    }
    hintEl.innerHTML = taps < 3 ? "Nơ lỏng thêm rồi… còn <b>" + (3 - taps) + " lần</b> nữa" : HINTS.hold;
    if (taps >= 3) setStage("hold");
  }

  function explode() {
    if (exploded) return; exploded = true;
    playSnd(whooshSnd, 0.9);
    chime(4); setTimeout(() => chime(5), 160);
    lidFly = { vy: 5.2, vz: -2.2, rx: 2.6, rz: 1.4, t: 0 };
    innerLight.intensity = 3;
    const C = new THREE.Vector3(0, boxG.position.y + 0.9, 0);
    for (let i = 0; i < burstP.count; i++) {
      const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1), sp = 2 + Math.random() * 3.6;
      fire(burstP, i, C.x, C.y, C.z, Math.sin(ph) * Math.cos(th) * sp, Math.abs(Math.cos(ph)) * sp + 1.6, Math.sin(ph) * Math.sin(th) * sp + 2.2, 3.6 + Math.random() * 2);
    }
    for (let i = 0; i < burstS.count; i++) {
      const th = Math.random() * 6.28, sp = 2.4 + Math.random() * 3.6;
      fire(burstS, i, C.x, C.y, C.z, Math.cos(th) * sp, 1.4 + Math.random() * 3.2, Math.sin(th) * sp + 1.8, 2.6 + Math.random());
    }
    for (let i = 0; i < burstK.count; i++) {
      const th = Math.random() * 6.28, ph = Math.acos(2 * Math.random() - 1), sp = 3 + Math.random() * 4.6;
      fire(burstK, i, C.x, C.y, C.z, Math.sin(ph) * Math.cos(th) * sp, Math.cos(ph) * sp + 2, Math.sin(ph) * Math.sin(th) * sp + 2.6, 1.4 + Math.random());
    }
    // bóng bay
    const colors = ["#EF5BA1", "#F2B33D", "#7FB8E8", "#8FD694", "#C39BE8"];
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: balloonTex(colors[i % 5]), transparent: true, depthWrite: false }));
      const bx = -1.3 + (i / 13) * 2.6 + (Math.random() - 0.5) * 0.3;
      sp.position.set(bx, -0.9 + Math.random() * 0.7, -0.5 + Math.random() * 1.1);
      sp.scale.set(0.85, 1.12, 1);
      sp.userData = { vy: 0.16 + Math.random() * 0.22, sway: Math.random() * 6.28, baseX: bx };
      scene.add(sp); balloons.push(sp);
    }
    // phong thư vàng
    envelope = new THREE.Sprite(new THREE.SpriteMaterial({ map: envelopeTex(), transparent: true, depthWrite: false }));
    envelope.position.set(0, 1.4, 1.2);
    envelope.scale.set(1.5, 1.03, 1);
    envelope.userData = { t: 0 };
    scene.add(envelope);
    setStage("done");
    window.__balloons = balloons.length;
  }
  function popBalloon(sp) {
    const p = sp.position;
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * 6.28, v = 1 + Math.random() * 1.8;
      fire(tapSparks, tapIdx++ % tapSparks.count, p.x, p.y, p.z, Math.cos(a) * v, Math.sin(a) * v, 0.6, 0.55);
    }
    playSnd(popSnd, 0.95);
    scene.remove(sp);
    balloons = balloons.filter(b => b !== sp);
    window.__balloons = balloons.length;
  }
  function openLetter() {
    if (stage === "letter") return;
    setStage("letter");
    letterWrap.classList.remove("hidden");
  }

  /* ---------- vòng lặp ---------- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(0.05, clock.getDelta());
    const t = clock.elapsedTime;
    // hộp lơ lửng + tự xoay nhẹ khi chưa chạm
    boxG.position.y = -0.35 + Math.sin(t * 0.85) * 0.11;
    if (stage === "spin" && !dragging) boxG.rotation.y += dt * 0.25;
    boxG.rotation.x *= stage === "spin" ? 0.995 : 0.94;
    if (stage !== "spin" && stage !== "done") boxG.rotation.y *= 0.98;
    // squash khi chạm nơ + nắp hé theo số lần chạm
    if (squash > 0) squash = Math.max(0, squash - dt * 3.2);
    const sq = 1 - Math.sin(Math.min(1, squash) * Math.PI) * 0.07;
    boxG.scale.set(2 - sq > 1 ? 1 : 1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    if (!lidFly) lidG.position.y = 0.75 + lidPop + (stage === "swipe" ? 0.3 : 0);
    // áp lực khi giữ
    if (stage === "hold") {
      pressure = Math.max(0, Math.min(1, pressure + (holding ? dt / 1.6 : -dt * 2.4)));
      const pulse = 1 + Math.sin(t * (14 + pressure * 26)) * 0.012 * pressure + pressure * 0.05;
      boxG.scale.set(pulse, 2 - pulse > 1 ? pulse : pulse, pulse);
      seam.material.opacity = pressure * 0.9;
      innerLight.intensity = pressure * 2.4;
      camera.position.x = (Math.random() - 0.5) * 0.045 * pressure * pressure;
      camera.position.y = 0.6 + (Math.random() - 0.5) * 0.045 * pressure * pressure;
      if (holding && pressure > 0.25) {
        leakAcc += dt * pressure * 42;
        while (leakAcc > 1) {
          leakAcc -= 1;
          const side = Math.floor(Math.random() * 4), u = (Math.random() - 0.5) * 2.2;
          const x = side < 2 ? u : (side === 2 ? -1.16 : 1.16);
          const z = side < 2 ? (side === 0 ? -1.16 : 1.16) : u;
          fire(leaks, leakIdx++ % leaks.count, x, boxG.position.y + 0.85, z, x * 0.5, 0.9 + Math.random(), z * 0.5, 0.8);
        }
      }
      if (pressure >= 1) {
        setStage("swipe");
        chime(3);
        seam.material.opacity = 0.95;
      }
      window.__pressure = +pressure.toFixed(2);
    } else {
      camera.position.x *= 0.8; camera.position.y += (0.6 - camera.position.y) * 0.1;
    }
    if (stage === "done" && seam.material.opacity > 0.4)
      seam.material.opacity = Math.max(0.4, seam.material.opacity - dt * 0.5);
    // nắp bay khi nổ
    if (lidFly) {
      lidFly.t += dt;
      lidG.position.y += lidFly.vy * dt;
      lidG.position.z += lidFly.vz * dt;
      lidG.rotation.x += lidFly.rx * dt;
      lidG.rotation.z += lidFly.rz * dt;
      lidFly.vy -= 3.2 * dt;
      innerLight.intensity = Math.max(0.5, innerLight.intensity - dt * 3);
      if (lidFly.t > 1.4) { boxG.remove(lidG); lidFly = null; }
    }
    // bóng bay & phong thư
    for (const b of balloons) {
      b.userData.sway += dt;
      b.position.y += b.userData.vy * dt * (b.position.y < 2.45 ? 1 : 0.1);
      b.position.x = Math.max(-1.5, Math.min(1.5, b.userData.baseX + Math.sin(b.userData.sway * 0.9) * 0.14));
      if (b.position.y > 2.75) b.position.y = 2.75;
    }
    if (envelope) {
      envelope.userData.t += dt;
      envelope.position.y = Math.max(-0.1, envelope.position.y - dt * 0.35);
      envelope.material.rotation = Math.sin(envelope.userData.t * 1.4) * 0.14;
      const v = envelope.position.clone().project(camera);
      window.__envelopePos = { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
    }
    window.__balloonPos = balloons.map(b => {
      const v = b.position.clone().project(camera);
      return { x: (v.x * 0.5 + 0.5) * innerWidth, y: (-v.y * 0.5 + 0.5) * innerHeight };
    });
    // ambient sao bụi xoay chậm
    ambient.pts.rotation.y += dt * 0.014;
    stepSys(burstP, dt, -1.1, 0.985);
    stepSys(burstS, dt, -0.7, 0.985);
    stepSys(burstK, dt, -0.4, 0.97);
    stepSys(leaks, dt, 0.5, 0.99);
    stepSys(tapSparks, dt, -1.6, 0.98);
    composer.render();
  }
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    composer.setSize(innerWidth, innerHeight);
  });
  document.addEventListener("contextmenu", e => e.preventDefault());
  setStage("spin");
  animate();
})();
