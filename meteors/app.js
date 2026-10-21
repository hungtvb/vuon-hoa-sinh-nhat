/* Mưa Sao Băng — bản 27. Three.js: sao băng rơi liên tục → chạm bắt 10 ngôi sao,
   mỗi ngôi sao thắp một phần dòng chữ trên trời → giữ nạp → lặng → mưa sao lớn → thư. */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), hintEl = $('#hint'), music = $('#music'), sChime = $('#sfx-chime'), sShimmer = $('#sfx-shimmer');
let W = innerWidth, H = innerHeight;

function buzz(p) {
  let ok = false;
  if (navigator.vibrate) { try { ok = navigator.vibrate(p); } catch (e) { ok = false; } }
  if (!ok) { document.body.classList.remove('vib'); void document.body.offsetWidth; document.body.classList.add('vib'); setTimeout(() => document.body.classList.remove('vib'), 200); }
}
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }
function setHint(t) { if (t) { hintEl.textContent = t; hintEl.classList.remove('hidden'); } else hintEl.classList.add('hidden'); }

/* ---------------- renderer / scene ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: $('#gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
renderer.setSize(W, H);
const scene = new THREE.Scene();
{
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#06040F'); gr.addColorStop(.5, '#0F0A24'); gr.addColorStop(1, '#1C0F2E');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(55, W / H, .1, 400);
camera.position.set(0, 0, 55);
camera.lookAt(0, 0, 0);
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .48, .5, .26));
} catch (e) { composer = null; }

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const starTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,220,190,.45)');
const dustTex = glowTexture('rgba(255,190,200,.5)', 'rgba(200,130,190,.15)');

/* sao nền tĩnh */
{
  const n = 850, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) pos.set([(Math.random() - .5) * 130, (Math.random() - .5) * 95, -25 - Math.random() * 50], i * 3);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1, map: starTex, color: 0xCFC4EA, transparent: true, opacity: .6, blending: THREE.AdditiveBlending, depthWrite: false })));
}

/* ---------------- dòng chữ bằng sao (lấy mẫu canvas) ---------------- */
const NEED = 10;
let textPts = null, chunkOf = [], chunkAnchor = [];
{
  const c = document.createElement('canvas'); c.width = 1200; c.height = 520;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1200, 520);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 168px Georgia, serif';
  g.fillText('CHÚC MỪNG', 600, 130);
  g.fillText('SINH NHẬT', 600, 380);
  const img = g.getImageData(0, 0, 1200, 520).data, cand = [];
  for (let y = 0; y < 520; y += 5) for (let x = 0; x < 1200; x += 5) {
    if (img[(y * 1200 + x) * 4] > 120 && Math.random() < .8) cand.push([x, y]);
  }
  const N = cand.length;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const cA = new THREE.Color('#FFE9BC'), cB = new THREE.Color('#FFB7C9'), tmp = new THREE.Color();
  cand.forEach(([x, y], i) => {
    const wx = (x / 1200 - .5) * 30, wy = (0.5 - y / 520) * 13 + 3;
    pos.set([wx, wy, -999], i * 3);
    tmp.copy(Math.random() < .3 ? cA : cB);
    const b = .7 + Math.random() * .45;
    col.set([tmp.r * b, tmp.g * b, tmp.b * b], i * 3);
    chunkOf.push(Math.min(NEED - 1, Math.floor(i / N * NEED)));
  });
  for (let k = 0; k < NEED; k++) {
    const idx = chunkOf.map((v, i) => v === k ? i : -1).filter(i => i >= 0);
    let ax = 0, ay = 0;
    idx.forEach(i => { ax += (cand[i][0] / 1200 - .5) * 30; ay += (0.5 - cand[i][1] / 520) * 13 + 3; });
    chunkAnchor.push(new THREE.Vector3(ax / Math.max(1, idx.length), ay / Math.max(1, idx.length), 0));
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  textPts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .55, map: starTex, vertexColors: true, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
  textPts.frustumCulled = false; /* điểm chưa hiện nằm ở z=-999 — không để three culling theo bounding sphere cũ */
  scene.add(textPts);
  textPts.userData = { all: cand.map(([x, y]) => [(x / 1200 - .5) * 30, (0.5 - y / 520) * 13 + 3]) };
}
function revealChunk(k) {
  const arr = textPts.geometry.getAttribute('position').array, all = textPts.userData.all;
  chunkOf.forEach((c, i) => { if (c === k) { arr[i * 3] = all[i][0]; arr[i * 3 + 1] = all[i][1]; arr[i * 3 + 2] = 0; } });
  textPts.geometry.getAttribute('position').needsUpdate = true;
}

/* ---------------- sao băng ---------------- */
const meteors = [], flyers = [];
function spawnMeteor(grand) {
  const dir = Math.random() < .5 ? 1 : -1;
  const sx = -dir * (14 + Math.random() * 8), sy = 20 + Math.random() * 9;
  const vx = dir * (16 + Math.random() * 10), vy = -(13 + Math.random() * 7);
  const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xFFE9BC, transparent: true, opacity: .98, blending: THREE.AdditiveBlending, depthWrite: false }));
  head.scale.set(2.3, 2.3, 1); head.position.set(sx, sy, 0);
  scene.add(head);
  const trailGeo = new THREE.BufferGeometry();
  const tPos = new Float32Array(14 * 3);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
  const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({ size: 1.5, map: starTex, color: 0xFFC98F, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
  trail.frustumCulled = false;
  scene.add(trail);
  meteors.push({ head, trail, vx, vy, hist: [], born: performance.now(), grand: !!grand, caught: false });
}
function removeMeteor(m) {
  scene.remove(m.head); scene.remove(m.trail);
  m.head.material.dispose(); m.trail.geometry.dispose(); m.trail.material.dispose();
}
function sparkleAt(p, n, color) {
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([p.x, p.y, p.z], i * 3);
    const a = Math.random() * 6.283, r = 2 + Math.random() * 5;
    vel.push([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - .5) * 3]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.25, map: starTex, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(pts);
  bursts.push({ pts, vel, t0: performance.now() });
}
const bursts = [];

/* vòng hoa finale */
const flowerRing = new THREE.Group(); flowerRing.visible = false; scene.add(flowerRing);
{
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      const a = (fi * 6 + i) / 12 * Math.PI * 2;
      s.position.set(Math.cos(a) * 21, Math.sin(a) * 10 + 2, -7);
      const sc = 2.8 + Math.random() * 1.1; s.scale.set(sc, sc, 1);
      flowerRing.add(s);
    }
  }));
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', caught: 0, armAt: 0, lastSpawn: 0, grandT0: 0 };
let holdStart = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'catch';
  state.lastSpawn = performance.now();
  setHint('Chạm vào ngôi sao băng đang rơi để bắt lấy nó');
  buzz(20);
}
function catchMeteor(m) {
  if (m.caught || state.phase !== 'catch') return;
  m.caught = true;
  sparkleAt(m.head.position, 18, 0xFFD98F);
  const k = state.caught;
  flyers.push({ sprite: m.head, trail: m.trail, from: m.head.position.clone(), to: chunkAnchor[k], t0: performance.now(), chunk: k });
  const idx = meteors.indexOf(m); if (idx >= 0) meteors.splice(idx, 1);
  state.caught++;
  playSfx(sChime); buzz([25, 35, 25]);
  if (state.caught >= NEED) setHint('Đủ 10 ngôi sao rồi — giữ yên để điều ước thành hình…');
  else setHint('Đã bắt ' + state.caught + '/10 ngôi sao băng');
}
function beginQuiet() {
  if (state.phase !== 'catch' || state.caught < NEED) return;
  state.phase = 'quiet';
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginGrand, 1050);
}
function beginGrand() {
  if (state.phase !== 'quiet') return;
  state.phase = 'grand'; state.grandT0 = performance.now();
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([40, 50, 40, 50, 130]);
  for (let i = 0; i < 14; i++) setTimeout(() => spawnMeteor(true), i * 160);
  setTimeout(showFinale, 2800);
}
function showFinale() {
  if (state.phase !== 'grand') return;
  state.phase = 'finale';
  flowerRing.visible = true;
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  setHint('Một lá thư đang chờ dưới bầu trời sao');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Người ta bảo ước vào sao băng thì điều ước sẽ thành thật.',
  'Đêm nay em bắt trọn mười ngôi sao băng rơi xuống vì chị.',
  'Trong mỗi ngôi sao là một điều em ước cho chị:',
  'khỏe như nắng sớm, yên như mặt hồ, và vui như trẻ nhỏ.',
  'Mười điều ước, một người nhận — là chị.',
  'Chúc mừng sinh nhật chị, điều ước lớn nhất của em.'
];
function openLetter() {
  if (state.phase !== 'finale' && state.phase !== 'letter') return;
  if (performance.now() < state.armAt) {
    const c = $('#lettercard'); c.classList.remove('locked'); void c.offsetWidth; c.classList.add('locked');
    return;
  }
  if (state.phase === 'letter') return;
  state.phase = 'letter'; buzz(20);
  $('#lettercard').classList.add('hidden');
  $('#letter').classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 220 + i * 300);
  });
  setTimeout(() => $('.sign').classList.add('show'), 220 + LETTER.length * 300);
  setHint('');
}
$('#lettercard').addEventListener('click', e => { e.stopPropagation(); openLetter(); });
$('#closeLetter').addEventListener('click', () => {
  $('#letter').classList.add('hidden');
  if (state.phase === 'letter') { state.phase = 'finale'; $('#lettercard').classList.remove('hidden'); }
  buzz(15);
});

/* ---------------- input ---------------- */
stage.addEventListener('pointerdown', e => {
  if (state.phase === 'intro') { start(); return; }
  if (state.phase === 'catch') {
    if (state.caught >= NEED) {
      holdStart = performance.now();
      ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.remove('hidden');
      return;
    }
    /* tìm sao băng gần điểm chạm nhất */
    let best = null, bestD = 85;
    for (const m of meteors) {
      const v = m.head.position.clone().project(camera);
      const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
      const d = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (d < bestD) { bestD = d; best = m; }
    }
    if (best) catchMeteor(best);
  }
});
stage.addEventListener('pointermove', e => {
  if (holdStart && state.phase === 'catch') { /* giữ nguyên vị trí: không hủy khi rung nhẹ */ }
});
stage.addEventListener('pointerup', () => {
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
});
stage.addEventListener('pointercancel', () => {
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
});
$('#mute').addEventListener('click', function (e) {
  e.stopPropagation();
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('resize', () => {
  W = innerWidth; H = innerHeight;
  camera.aspect = W / H; camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  if (composer) composer.setSize(W, H);
});

/* ---------------- vòng lặp ---------------- */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  const t = now / 1000;

  /* sinh sao băng */
  if ((state.phase === 'catch' || state.phase === 'intro') && now - state.lastSpawn > 1500) {
    spawnMeteor(false);
    state.lastSpawn = now;
  }
  /* cập nhật sao băng */
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.head.position.x += m.vx * dt;
    m.head.position.y += m.vy * dt;
    m.hist.unshift(m.head.position.clone());
    if (m.hist.length > 14) m.hist.pop();
    const arr = m.trail.geometry.getAttribute('position').array;
    for (let j = 0; j < 14; j++) {
      const p = m.hist[Math.min(j, m.hist.length - 1)] || m.head.position;
      arr[j * 3] = p.x; arr[j * 3 + 1] = p.y; arr[j * 3 + 2] = 0;
    }
    m.trail.geometry.getAttribute('position').needsUpdate = true;
    if (m.head.position.y < -26 || Math.abs(m.head.position.x) > 34 || now - m.born > 6000) {
      removeMeteor(m); meteors.splice(i, 1);
    }
  }
  /* sao đã bắt bay về vị trí chữ */
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i], e = Math.min(1, (now - f.t0) / 850), ease = 1 - Math.pow(1 - e, 3);
    f.sprite.position.lerpVectors(f.from, f.to, ease);
    f.sprite.position.y += Math.sin(e * Math.PI) * 3;
    f.sprite.scale.setScalar(2.3 * (1 - e * .5));
    f.trail.material.opacity = .55 * (1 - e);
    if (e >= 1) {
      revealChunk(f.chunk);
      sparkleAt(f.to, 10, 0xFFB7C9);
      scene.remove(f.sprite); scene.remove(f.trail);
      flyers.splice(i, 1);
    }
  }
  /* tia lửa */
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i], age = (now - b.t0) / 1000;
    if (age > .85) { scene.remove(b.pts); bursts.splice(i, 1); continue; }
    const arr = b.pts.geometry.getAttribute('position').array;
    for (let j = 0; j < b.vel.length; j++) {
      arr[j * 3] += b.vel[j][0] * dt; arr[j * 3 + 1] += b.vel[j][1] * dt; arr[j * 3 + 2] += b.vel[j][2] * dt;
    }
    b.pts.geometry.getAttribute('position').needsUpdate = true;
    b.pts.material.opacity = 1 - age / .85;
  }
  /* giữ để qua lặng */
  if (holdStart && state.phase === 'catch') {
    const pr = Math.min(1, (now - holdStart) / HOLD_MS);
    rfg.style.strokeDashoffset = CIRC * (1 - pr);
    if (pr >= 1) beginQuiet();
  }
  /* chữ nhấp nháy nhẹ ở finale */
  if (textPts) textPts.material.opacity = .9 + Math.sin(t * 1.8) * .08;

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__meteors = {
  get phase() { return state.phase; },
  get caught() { return state.caught; },
  start, beginQuiet, openLetter,
  catchFirst: () => { if (meteors.length) catchMeteor(meteors[0]); },
  get meteorCount() { return meteors.length; },
  get completed() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
