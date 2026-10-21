/* Chòm Sao Trái Tim — bản 26. Three.js: 14 ngôi sao chờ nối thành chòm trái tim →
   kéo tay nối từng đoạn → lặng → sao nhỏ lấp đầy tim → thư dưới chòm sao. */
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
  gr.addColorStop(0, '#070512'); gr.addColorStop(.5, '#120B26'); gr.addColorStop(1, '#1D1030');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(55, W / H, .1, 400);
camera.position.set(0, 0, 72);
camera.lookAt(0, 0, 0);
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .55, .5, .24));
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

const sky = new THREE.Group(); scene.add(sky);
sky.rotation.x = -.1;

/* sao nền + dải bụi ngân hà mờ */
{
  const n = 800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos.set([(Math.random() - .5) * 150, (Math.random() - .5) * 110, -30 - Math.random() * 60], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  sky.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.05, map: starTex, color: 0xCFC4EA, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })));
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: i % 2 ? 0x8A6BC0 : 0xC07AA8, transparent: true, opacity: .03 + Math.random() * .025, blending: THREE.AdditiveBlending, depthWrite: false }));
    const a = -0.6 + i * .09;
    s.position.set(Math.cos(a) * 52 - 8, Math.sin(a) * 34 - 2, -38 - Math.random() * 12);
    const sc = 16 + Math.random() * 14; s.scale.set(sc, sc, 1);
    sky.add(s);
  }
}

/* ---------------- 14 sao nút theo đường cong tim tham số ---------------- */
function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return [x * .95, y * .95 - 1.4];
}
const NODES = 14;
const nodePos = [], nodeSprites = [];
for (let i = 0; i < NODES; i++) {
  const t = (i / NODES) * Math.PI * 2;
  const [hx, hy] = heartCurve(t);
  const p = new THREE.Vector3(hx, hy, (Math.sin(i * 3.7) * 2.4));
  nodePos.push(p);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xFFE9BC, transparent: true, opacity: .92, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.position.copy(p); s.scale.set(2.6, 2.6, 1);
  sky.add(s); nodeSprites.push(s);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFC98F, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(8.5, 8.5, 1); s.add(halo); s.userData.halo = halo;
}
/* đường dẫn mờ toàn tim */
{
  const pts = [];
  for (let i = 0; i <= 90; i++) { const [x, y] = heartCurve(i / 90 * Math.PI * 2); pts.push(new THREE.Vector3(x, y, 0)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0x9A86C8, dashSize: 1.1, gapSize: .9, transparent: true, opacity: .34 }));
  line.computeLineDistances();
  sky.add(line);
}
/* các đoạn đã nối: line phát sáng + chuỗi sao nhỏ dọc đoạn */
const segGroup = new THREE.Group(); sky.add(segGroup);
function drawSegment(a, b) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  segGroup.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xFFD98F, transparent: true, opacity: .95, blending: THREE.AdditiveBlending })));
  const n = Math.max(4, Math.floor(a.distanceTo(b) / 1.15)), pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = a.clone().lerp(b, (i + .5) / n);
    pos.set([p.x, p.y, p.z], i * 3);
  }
  const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  segGroup.add(new THREE.Points(g2, new THREE.PointsMaterial({ size: 1.15, map: starTex, color: 0xFFE2B0, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false })));
}
/* tia lửa khi nối trúng */
const bursts = [];
function sparkleAt(p, n, color) {
  const pos = new Float32Array(n * 3), vel = [];
  for (let i = 0; i < n; i++) {
    pos.set([p.x, p.y, p.z], i * 3);
    const a = Math.random() * 6.283, r = 2 + Math.random() * 5;
    vel.push([Math.cos(a) * r, Math.sin(a) * r, (Math.random() - .5) * 3]);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.3, map: starTex, color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
  sky.add(pts);
  bursts.push({ pts, vel, t0: performance.now() });
}
/* sao nhỏ lấp đầy tim ở đỉnh */
let fillPts = null;
{
  const n = 520, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [hx, hy] = heartCurve(Math.random() * Math.PI * 2);
    const f = .12 + Math.sqrt(Math.random()) * .8;
    pos.set([hx * f + (Math.random() - .5) * 2.4, .5 + (hy - .5) * f + (Math.random() - .5) * 2.4, (Math.random() - .5) * 3], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  fillPts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.05, map: starTex, color: 0xFFB7C9, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  sky.add(fillPts);
}
/* vòng hoa finale */
const flowerRing = new THREE.Group(); flowerRing.visible = false; scene.add(flowerRing);
{
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      const a = (fi * 6 + i) / 12 * Math.PI * 2;
      s.position.set(Math.cos(a) * 21, Math.sin(a) * 10.5, -6);
      const sc = 2.8 + Math.random() * 1.1; s.scale.set(sc, sc, 1);
      flowerRing.add(s);
    }
  }));
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', connected: 0, armAt: 0, quietT0: 0, fillT0: 0 };
function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'draw';
  setHint('Chạm vào ngôi sao đang nhấp nháy, rồi kéo tới ngôi sao kế tiếp');
  buzz(20);
}
function connectNext() {
  if (state.phase !== 'draw') return;
  const i = state.connected;
  const a = nodePos[i], b = nodePos[(i + 1) % NODES];
  drawSegment(a, b);
  sparkleAt(b, 16, 0xFFD98F);
  state.connected++;
  playSfx(sChime); buzz(25);
  if (state.connected >= NODES) { beginQuiet(); return; }
  if (state.connected === 1) setHint('Đúng rồi — cứ nối tiếp theo các ngôi sao');
  else if (state.connected === NODES - 3) setHint('Sắp khép vòng rồi…');
  else setHint('Đã nối ' + state.connected + '/' + NODES + ' đoạn');
}
function beginQuiet() {
  state.phase = 'quiet'; state.quietT0 = performance.now();
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginFill, 1050);
}
function beginFill() {
  if (state.phase !== 'quiet') return;
  state.phase = 'fill'; state.fillT0 = performance.now();
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([35, 50, 35, 50, 110]);
  setTimeout(showFinale, 2500);
}
function showFinale() {
  if (state.phase !== 'fill') return;
  state.phase = 'finale';
  flowerRing.visible = true;
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  const fl = $('#flash'); fl.style.opacity = .45; setTimeout(() => fl.style.opacity = 0, 170);
  setHint('Chòm sao hoàn thành — thư đang chờ chị');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Ngày xưa người ta tin mỗi chòm sao là một câu chuyện viết lên trời.',
  'Đêm nay em viết tặng chị một chòm sao riêng — hình trái tim,',
  'bằng mười bốn ngôi sao sáng nhất em tìm được.',
  'Mong tuổi mới của chị: đường nào cũng dẫn về điều mình yêu,',
  'và luôn có người sẵn lòng nối những vì sao cùng chị.',
  'Chúc mừng sinh nhật chị.'
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

/* ---------------- input: kéo nối sao / kéo lệch cảnh ---------------- */
const raycaster = new THREE.Raycaster();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
let dragging = false, orbitDrag = false, lastX = 0, lastY = 0, downX = 0, downY = 0, downT = 0;
let swayX = 0, swayY = 0, tSwayX = 0, tSwayY = 0, camZ = 72;
const bandGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const band = new THREE.Line(bandGeo, new THREE.LineBasicMaterial({ color: 0xFFE2B0, transparent: true, opacity: .85, blending: THREE.AdditiveBlending }));
band.visible = false; sky.add(band);

function toNDC(e) { return new THREE.Vector2((e.clientX / W) * 2 - 1, -(e.clientY / H) * 2 + 1); }
function screenOf(v3) {
  const v = v3.clone(); sky.localToWorld(v); v.project(camera);
  return [(v.x * .5 + .5) * W, (-v.y * .5 + .5) * H];
}
function planePoint(e) {
  raycaster.setFromCamera(toNDC(e), camera);
  const out = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(dragPlane, out);
  if (!hit) return null;
  return sky.worldToLocal(out.clone());
}
stage.addEventListener('pointerdown', e => {
  if (state.phase === 'intro') { start(); return; }
  downX = lastX = e.clientX; downY = lastY = e.clientY; downT = performance.now();
  if (state.phase === 'draw') {
    const [sx, sy] = screenOf(nodePos[state.connected]);
    if (Math.hypot(sx - e.clientX, sy - e.clientY) < 95) {
      dragging = true;
      band.visible = true;
      bandGeo.setFromPoints([nodePos[state.connected], nodePos[state.connected]]);
    } else orbitDrag = true;
  } else orbitDrag = true;
});
stage.addEventListener('pointermove', e => {
  const dx = e.clientX - lastX, dy = e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY;
  if (dragging) {
    const p = planePoint(e);
    if (p) bandGeo.setFromPoints([nodePos[state.connected], p]);
    const [sx, sy] = screenOf(nodePos[(state.connected + 1) % NODES]);
    if (Math.hypot(sx - e.clientX, sy - e.clientY) < 80) {
      dragging = false; band.visible = false;
      connectNext();
    }
  } else if (orbitDrag) {
    tSwayY = Math.max(-.22, Math.min(.22, tSwayY + dx * .0016));
    tSwayX = Math.max(-.14, Math.min(.14, tSwayX + dy * .0012));
  }
});
function endPointer(e) {
  if (dragging) {
    dragging = false; band.visible = false;
    /* thả tay gần sao đích cũng tính là nối được */
    const [sx, sy] = screenOf(nodePos[(state.connected + 1) % NODES]);
    if (Math.hypot(sx - e.clientX, sy - e.clientY) < 110) connectNext();
  } else if (orbitDrag && state.phase === 'draw' && performance.now() - downT < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 8) {
    /* chạm thẳng vào sao đích */
    const [sx, sy] = screenOf(nodePos[(state.connected + 1) % NODES]);
    const [cx, cy] = screenOf(nodePos[state.connected]);
    if (Math.hypot(sx - e.clientX, sy - e.clientY) < 90 || Math.hypot(cx - e.clientX, cy - e.clientY) < 90) connectNext();
  }
  orbitDrag = false;
}
stage.addEventListener('pointerup', endPointer);
stage.addEventListener('pointercancel', endPointer);
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

  swayX += (tSwayX - swayX) * Math.min(1, dt * 4);
  swayY += (tSwayY - swayY) * Math.min(1, dt * 4);
  const still = state.phase === 'quiet';
  sky.rotation.y = swayY + (still ? 0 : Math.sin(t * .1) * .05);
  sky.rotation.x = -.1 + swayX + (still ? 0 : Math.sin(t * .07) * .02);
  camera.position.z += (camZ - camera.position.z) * Math.min(1, dt * 2);

  /* sao nút: sao đích nhấp nháy mạnh + hào quang */
  nodeSprites.forEach((s, i) => {
    const isNext = state.phase === 'draw' && i === (state.connected + 1) % NODES;
    const isCurrent = state.phase === 'draw' && i === state.connected;
    const base = (state.phase === 'finale' || state.phase === 'letter' || state.phase === 'fill') ? 3 : 2.6;
    const pulse = isNext ? (3.6 + Math.sin(t * 5) * 1.1) : base + Math.sin(t * 2 + i * 1.3) * .35;
    s.scale.set(pulse, pulse, 1);
    s.userData.halo.material.opacity = isNext ? .5 + Math.sin(t * 5) * .2 : (isCurrent ? .3 : 0);
  });

  /* lấp đầy tim ở pha đỉnh */
  if (state.phase === 'fill') {
    const e = Math.min(1, (now - state.fillT0) / 2000);
    fillPts.material.opacity = e * .95;
    fillPts.rotation.z = Math.sin(t * .3) * .02;
  } else if (state.phase === 'finale' || state.phase === 'letter') {
    fillPts.material.opacity = .95;
  }

  /* tia lửa */
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i], age = (now - b.t0) / 1000;
    if (age > .85) { sky.remove(b.pts); bursts.splice(i, 1); continue; }
    const arr = b.pts.geometry.getAttribute('position').array;
    for (let j = 0; j < b.vel.length; j++) {
      arr[j * 3] += b.vel[j][0] * dt; arr[j * 3 + 1] += b.vel[j][1] * dt; arr[j * 3 + 2] += b.vel[j][2] * dt;
    }
    b.pts.geometry.getAttribute('position').needsUpdate = true;
    b.pts.material.opacity = 1 - age / .85;
  }

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__constellation = {
  get phase() { return state.phase; },
  get connected() { return state.connected; },
  start, connectNext, openLetter,
  get completed() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
