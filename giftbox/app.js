/* Hộp Quà Bí Mật — bản 20. Một hộp quà 3D, một cú mở, một bó hoa, một lá thư.
   Code gốc; render trực tiếp (không bloom — nền sáng sẽ cháy trắng). */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), hint = $('#hint');
const music = $('#music'), sChime = $('#sfx-chime'), sShimmer = $('#sfx-shimmer');
function setHint(t) { hint.textContent = t; }
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }

/* ================= renderer / scene ================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 3.75, 13.8);
camera.lookAt(0, 1.45, 0);
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
resize(); addEventListener('resize', resize);

scene.add(new THREE.HemisphereLight(0xfff6e8, 0xf3b8c6, 0.95));
const key = new THREE.DirectionalLight(0xfff1d6, 0.85); key.position.set(4, 8, 6); scene.add(key);
const fill = new THREE.DirectionalLight(0xffd9e4, 0.35); fill.position.set(-5, 3, -2); scene.add(fill);

function radialTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 40),
  new THREE.MeshBasicMaterial({ color: 0xfbd9e2, transparent: true, opacity: 0.55 })
);
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.02; scene.add(floor);
const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(3.1, 40),
  new THREE.MeshBasicMaterial({ map: radialTex('rgba(120,50,70,0.42)', 'rgba(120,50,70,0)'), transparent: true, depthWrite: false })
);
shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.0; scene.add(shadow);

/* ================= the gift box ================= */
const PINK = new THREE.MeshStandardMaterial({ color: 0xf29ec0, roughness: 0.5, metalness: 0.05 });
const PINK_D = new THREE.MeshStandardMaterial({ color: 0xe883ac, roughness: 0.55, metalness: 0.05 });
const CREAM = new THREE.MeshStandardMaterial({ color: 0xfff1d4, roughness: 0.38, metalness: 0.12 });
const GOLD = new THREE.MeshStandardMaterial({ color: 0xf2c063, roughness: 0.3, metalness: 0.55 });

function roundedBoxGeo(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: h - r * 1.2, bevelEnabled: true, bevelThickness: r * 0.6, bevelSize: r * 0.55, bevelSegments: 3, curveSegments: 7, steps: 1 });
  g.rotateX(-Math.PI / 2);
  g.computeBoundingBox();
  g.translate(0, -g.boundingBox.min.y, 0); /* đặt đáy hộp chạm đất y=0, bất kể bevel */
  return g;
}
const gift = new THREE.Group(); scene.add(gift);
const BODY_H = 2.15;
const body = new THREE.Mesh(roundedBoxGeo(3.2, BODY_H, 3.2, 0.26), PINK);
gift.add(body);
const cavity = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 2.8),
  new THREE.MeshStandardMaterial({ color: 0x8e3a58, roughness: 1 }));
cavity.position.y = BODY_H + 0.004; gift.add(cavity);
const glowDisc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 28),
  new THREE.MeshBasicMaterial({ map: radialTex('rgba(255,230,160,0.95)', 'rgba(255,230,160,0)'), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
glowDisc.rotation.x = -Math.PI / 2; glowDisc.position.y = BODY_H + 0.035; glowDisc.material.opacity = 0; gift.add(glowDisc);
function ribbonBand(w, h, d) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), CREAM); }
const rb1 = ribbonBand(3.3, BODY_H + 0.02, 0.68); rb1.position.y = BODY_H / 2; gift.add(rb1);
const rb2 = ribbonBand(0.68, BODY_H + 0.02, 3.3); rb2.position.y = BODY_H / 2; gift.add(rb2);

const lid = new THREE.Group(); gift.add(lid); /* nắp thuộc group hộp để kéo xoay thì nắp đi theo thân */
const lidMesh = new THREE.Mesh(roundedBoxGeo(3.55, 0.62, 3.55, 0.22), PINK_D);
lid.add(lidMesh);
const lr1 = ribbonBand(3.65, 0.64, 0.68); lr1.position.y = 0.31; lid.add(lr1);
const lr2 = ribbonBand(0.68, 0.64, 3.65); lr2.position.y = 0.31; lid.add(lr2);
const bow = new THREE.Group();
const loopGeo = new THREE.TorusGeometry(0.42, 0.15, 12, 26);
const loopL = new THREE.Mesh(loopGeo, CREAM);
loopL.position.set(-0.42, 0.1, 0); loopL.rotation.set(0.35, 0.5, -0.5); bow.add(loopL);
const loopR = new THREE.Mesh(loopGeo, CREAM);
loopR.position.set(0.42, 0.1, 0); loopR.rotation.set(0.35, -0.5, 0.5); bow.add(loopR);
const knot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 14), GOLD);
knot.scale.y = 0.78; bow.add(knot);
const tailGeo = new THREE.BoxGeometry(0.3, 0.66, 0.06);
const tailL = new THREE.Mesh(tailGeo, CREAM); tailL.position.set(-0.36, -0.05, 0.3); tailL.rotation.set(-1.15, 0, 0.45); bow.add(tailL);
const tailR = new THREE.Mesh(tailGeo, CREAM); tailR.position.set(0.36, -0.05, 0.3); tailR.rotation.set(-1.15, 0, -0.45); bow.add(tailR);
bow.position.y = 0.78; lid.add(bow);
const LID_HOME = new THREE.Vector3(0, BODY_H - 0.06, 0);
lid.position.copy(LID_HOME);
const innerLight = new THREE.PointLight(0xffd9a0, 0, 9);
innerLight.position.set(0, BODY_H + 0.7, 0); scene.add(innerLight);

/* ================= textures / bouquet ================= */
const texLoader = new THREE.TextureLoader();
function loadTex(name) {
  const t = texLoader.load('assets/img/' + name + '.webp');
  t.encoding = THREE.sRGBEncoding;
  return t;
}
const petalTex = loadTex('petal');
const bouquet = new THREE.Group();
const HEADS = [
  ['peony', 0, 0.52, 1.5], ['rose', -0.62, 0.22, 1.15], ['rose', 0.66, 0.28, 1.1],
  ['lisianthus', -0.34, 0.78, 1.05], ['tulip', 0.4, 0.82, 1.0], ['hydrangea', -0.78, 0.55, 1.05],
  ['allium', 0.86, 0.62, 0.95], ['baby', 0.05, 1.05, 0.95], ['baby', -0.95, 0.05, 0.8], ['baby', 0.98, 0.05, 0.8]
];
HEADS.forEach(h => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: loadTex(h[0]), transparent: true, depthWrite: false }));
  sp.position.set(h[1], h[2], 0.1 + Math.random() * 0.15);
  sp.scale.set(h[3], h[3], 1);
  bouquet.add(sp);
});
const wrap = new THREE.Mesh(
  new THREE.ConeGeometry(0.6, 1.12, 20, 1, true),
  new THREE.MeshStandardMaterial({ color: 0xf3ddba, roughness: 0.7, side: THREE.DoubleSide })
);
wrap.rotation.x = Math.PI; wrap.position.y = -0.3; bouquet.add(wrap);
const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.5, 8),
  new THREE.MeshStandardMaterial({ color: 0x7fae6e, roughness: 0.8 }));
stem.position.y = -1.05; bouquet.add(stem);
bouquet.position.set(0, BODY_H - 0.4, 0);
bouquet.scale.setScalar(0.001);
bouquet.visible = false;
scene.add(bouquet);
const bouquetHit = new THREE.Mesh(new THREE.SphereGeometry(1.75, 10, 8),
  new THREE.MeshBasicMaterial({ visible: false }));
bouquetHit.position.y = 0.35; bouquet.add(bouquetHit);

/* ================= particles ================= */
const CONF_COLORS = [0xf28bb4, 0xffd166, 0xfff1d4, 0xa8d8b9, 0xf6a6c1, 0xffffff];
function makePlane(tex, color, size) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map: tex || null, color: color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
  m.material.opacity = 1;
  return m;
}
const burstPool = [];
for (let i = 0; i < 150; i++) {
  const isPetal = i % 3 !== 2;
  const p = makePlane(isPetal ? petalTex : null, isPetal ? 0xffffff : CONF_COLORS[i % CONF_COLORS.length],
    isPetal ? 0.15 + Math.random() * 0.2 : 0.08 + Math.random() * 0.11);
  p.visible = false; scene.add(p);
  burstPool.push({ m: p, v: new THREE.Vector3(), rv: new THREE.Vector3(), life: 0, max: 1, g: 3, drag: 1 });
}
function fireBurst() {
  let idx = 0;
  const launch = (n, speed, up, spread, life, g, drag) => {
    for (let k = 0; k < n && idx < burstPool.length; k++, idx++) {
      const p = burstPool[idx];
      const a = Math.random() * Math.PI * 2, r = Math.random() * spread;
      p.m.position.set(Math.cos(a) * r * 0.4, BODY_H + 0.25, Math.sin(a) * r * 0.4);
      p.v.set(Math.cos(a) * r * speed, up * (0.65 + Math.random() * 0.7), Math.sin(a) * r * speed);
      p.rv.set(Math.random() * 7 - 3.5, Math.random() * 7 - 3.5, Math.random() * 7 - 3.5);
      p.max = life * (0.75 + Math.random() * 0.5); p.life = p.max; p.g = g; p.drag = drag;
      p.m.visible = true; p.m.material.opacity = 1;
      p.m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    }
  };
  launch(55, 2.6, 4.6, 1.6, 1.5, 5.2, 0.6);  /* layer 1: wide explosion */
  launch(45, 0.8, 7.2, 0.7, 2.1, 4.4, 0.35); /* layer 2: fountain up */
  launch(50, 1.1, 2.4, 1.1, 3.4, 1.1, 0.8);  /* layer 3: slow floaters */
}
const ambient = [];
for (let i = 0; i < 34; i++) {
  const p = makePlane(petalTex, 0xffffff, 0.3 + Math.random() * 0.35);
  p.position.set((Math.random() - 0.5) * 11, Math.random() * 8, (Math.random() - 0.5) * 5 - 0.5);
  p.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
  scene.add(p);
  ambient.push({ m: p, sp: 0.25 + Math.random() * 0.4, ph: Math.random() * 6.3, rv: (Math.random() - 0.5) * 1.4 });
}

/* ================= state / interaction ================= */
const state = { opened: false, openT: 0, bouquetUp: false, letter: false };
let targetRotY = 0.35, rotY = 0.35, dragging = false, downX = 0, downY = 0, downT = 0, moved = 0, lastX = 0, userDragged = false;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function castAt(e, obj) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return ray.intersectObject(obj, true).length > 0;
}
canvas.addEventListener('pointerdown', e => {
  dragging = true; moved = 0; downX = lastX = e.clientX; downY = e.clientY; downT = performance.now();
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging) return;
  const dx = e.clientX - lastX; lastX = e.clientX;
  moved += Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) * 0.001;
  if (Math.abs(e.clientX - downX) > 6) {
    targetRotY += dx * 0.008; userDragged = true;
  }
});
let lastDragDist = 99, lastUpAt = 0;
function handleTap(e) {
  if (!state.opened) { openBox(); return; }
  if (state.bouquetUp && !state.letter && castAt(e, bouquetHit)) openLetter();
}
canvas.addEventListener('pointerup', e => {
  dragging = false;
  const dist = Math.max(Math.abs(e.clientX - downX), Math.abs(e.clientY - downY));
  lastDragDist = dist; lastUpAt = performance.now();
  const isTap = (performance.now() - downT) < 600 && dist < 10;
  if (isTap) handleTap(e);
});
/* fallback: vài trình duyệt/webview bắn pointerup chạm không ổn định — click là đường dự phòng,
   nhưng bỏ qua click ngay sau một cú kéo xoay thật (dist lớn). */
canvas.addEventListener('click', e => {
  if (performance.now() - lastUpAt < 800 && lastDragDist >= 10) return;
  handleTap(e);
});
function openBox() {
  if (state.opened) return;
  state.opened = true; state.openT = clock.elapsedTime;
  playSfx(sChime);
  music.play().catch(() => {});
  fireBurst();
  setHint('Một bó hoa dành cho chị…');
  setTimeout(() => playSfx(sShimmer), 350);
}

/* ================= letter ================= */
const LETTER = [
  'Có một hộp quà nhỏ, buộc nơ kem, giấu ở cuối vườn.',
  'Bên trong không phải món đồ đắt tiền,',
  'chỉ là một bó hoa em tự tay chọn: mẫu đơn cho một năm rực rỡ,',
  'cát tường cho bình an, tulip cho hạnh phúc,',
  'và baby trắng cho trăm điều nhỏ bé dễ thương.',
  'Chúc chị tuổi mới thật khỏe, thật vui,',
  'và lúc nào cũng được thương như cách chị thương mọi người.'
];
function openLetter() {
  if (state.letter) return;
  state.letter = true;
  const L = $('#letter'); L.classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 200 + i * 240);
  });
  setTimeout(() => $('.sign').classList.add('show'), 200 + LETTER.length * 240);
  setHint('Một bó hoa nhỏ, thay lời chúc lớn');
}
$('#closeLetter').addEventListener('click', () => {
  $('#letter').classList.add('hidden');
  state.letter = false;
  setHint('Chạm vào bó hoa để đọc lại thư');
});
$('#mute').addEventListener('click', function () {
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* ================= animation ================= */
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
const easeOutBack = t => { const c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const clamp01 = t => Math.max(0, Math.min(1, t));
const clock = new THREE.Clock();
const LID_END = { p: new THREE.Vector3(2.45, 0.03, 1.2), rx: -Math.PI * 2 + 0.15, rz: 0.22 }; /* nắp lộn một vòng rồi đáp đứng cạnh hộp, nơ ngửa lên */
function animateLid(now) {
  if (!state.opened) return;
  const t = clamp01((now - state.openT) / 1.25);
  const e = easeOutCubic(t);
  lid.position.set(
    LID_HOME.x + (LID_END.p.x - LID_HOME.x) * e,
    LID_HOME.y + (LID_END.p.y - LID_HOME.y) * e + Math.sin(Math.PI * Math.min(1, t * 1.05)) * 1.55,
    LID_HOME.z + (LID_END.p.z - LID_HOME.z) * e
  );
  lid.rotation.x = LID_END.rx * e;
  lid.rotation.z = LID_END.rz * e;
  glowDisc.material.opacity = Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.5) * 0.85;
  innerLight.intensity = Math.min(1, t * 1.6) * 1.15;
}
function animateBouquet(now, dt) {
  if (!state.opened) return;
  const t = clamp01((now - state.openT - 0.3) / 1.7);
  if (t <= 0) return;
  bouquet.visible = true;
  const e = easeOutBack(t);
  bouquet.scale.setScalar(Math.max(0.001, e));
  bouquet.position.y = (BODY_H - 0.4) + (3.85 - (BODY_H - 0.4)) * easeOutCubic(t);
  if (t >= 1) {
    if (!state.bouquetUp) { state.bouquetUp = true; setHint('Chạm vào bó hoa nhé'); }
    const tt = now - state.openT;
    bouquet.position.y = 3.85 + Math.sin(tt * 1.6) * 0.09;
    const pulse = 1 + Math.max(0, Math.sin(tt * 2.4)) * 0.028 + Math.max(0, Math.sin(tt * 2.4 + 0.55)) * 0.018;
    bouquet.scale.setScalar(pulse);
    bouquet.rotation.y = Math.sin(tt * 0.5) * 0.08;
  }
}
function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = clock.elapsedTime;
  if (!userDragged && !state.opened) targetRotY = 0.35 + Math.sin(now * 0.35) * 0.16;
  rotY += (targetRotY - rotY) * Math.min(1, dt * 7);
  gift.rotation.y = rotY;
  cavity.rotation.y = glowDisc.rotation.y = 0; /* cavity & glow stay in gift group space */
  animateLid(now);
  animateBouquet(now, dt);
  burstPool.forEach(p => {
    if (p.life <= 0) return;
    p.life -= dt;
    if (p.life <= 0) { p.m.visible = false; return; }
    p.v.y -= p.g * dt;
    p.v.multiplyScalar(Math.max(0, 1 - p.drag * dt));
    p.m.position.addScaledVector(p.v, dt);
    if (p.m.position.y < 0.06) { p.m.position.y = 0.06; p.v.set(0, 0, 0); p.rv.multiplyScalar(0.9); }
    p.m.rotation.x += p.rv.x * dt; p.m.rotation.y += p.rv.y * dt; p.m.rotation.z += p.rv.z * dt;
    p.m.material.opacity = Math.min(1, p.life / (p.max * 0.35));
  });
  ambient.forEach(a => {
    a.m.position.y -= a.sp * dt;
    a.m.position.x += Math.sin(now * 0.9 + a.ph) * dt * 0.35;
    a.m.rotation.x += a.rv * dt; a.m.rotation.z += a.rv * 0.7 * dt;
    if (a.m.position.y < -0.4) { a.m.position.y = 7.6 + Math.random(); a.m.position.x = (Math.random() - 0.5) * 11; }
  });
  renderer.render(scene, camera);
}
tick();

window.__gift = {
  get opened() { return state.opened; },
  get bouquetUp() { return state.bouquetUp; },
  openLetter,
  get letterVisible() { return state.letter && !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
