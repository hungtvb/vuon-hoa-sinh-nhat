/* Sông Ngân — bản 29. Three.js: dòng sông 5.200 sao chảy uốn khúc → thả 3 đèn
   điều ước trôi theo dòng → giữ → lặng → đèn bay lên bung sáng → thư ở cuối sông. */
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
  gr.addColorStop(0, '#070512'); gr.addColorStop(.5, '#100A26'); gr.addColorStop(1, '#1E1030');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(56, W / H, .1, 420);
const camState = { x: 0, y: 24, z: 78, tx: 0, tz: 78, lookX: 0 };
camera.position.set(0, 24, 78);
camera.lookAt(0, -3, -2);
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .45, .55, .26));
} catch (e) { composer = null; }

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const starTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,215,200,.45)');
const dustTex = glowTexture('rgba(255,190,170,.55)', 'rgba(210,120,180,.16)');

/* sao nền xa */
{
  const n = 700, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 140 + Math.random() * 70;
    pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .95, map: starTex, color: 0xCFC4EA, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })));
}

/* ---------------- dòng sông sao ---------------- */
function pathAt(s) {
  return {
    x: (s - .5) * 40,
    z: Math.sin(s * 4.6) * 8 - 2,
    y: Math.sin(s * 8.5) * 1.1 - 3 + Math.sin(s * 3.1) * 1.6
  };
}
const RN = 2800;
const rPos = new Float32Array(RN * 3), rCol = new Float32Array(RN * 3), rSize = new Float32Array(RN);
const sS = new Float32Array(RN), sLat = new Float32Array(RN), sY = new Float32Array(RN);
const cA = new THREE.Color('#FFE9BC'), cB = new THREE.Color('#FFB7C9'), cC = new THREE.Color('#A8C8F0'), tmpC = new THREE.Color();
for (let i = 0; i < RN; i++) {
  sS[i] = Math.random();
  const lat = (Math.random() + Math.random() + Math.random()) / 3 - .5; /* tập trung giữa dòng */
  sLat[i] = lat * 20;
  sY[i] = (Math.random() - .5) * 1.5;
  tmpC.copy(Math.random() < .55 ? cB : (Math.random() < .6 ? cA : cC));
  const b = .34 + Math.random() * .34;
  rCol.set([tmpC.r * b, tmpC.g * b, tmpC.b * b], i * 3);
  rSize[i] = ((Math.random() < .05 ? 2.2 : .95) + Math.random() * .8) * 1.35;
}
const rGeo = new THREE.BufferGeometry();
rGeo.setAttribute('position', new THREE.BufferAttribute(rPos, 3));
rGeo.setAttribute('color', new THREE.BufferAttribute(rCol, 3));
rGeo.setAttribute('size', new THREE.BufferAttribute(rSize, 1));
const rMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: starTex }, uScale: { value: H * .36 }, uOpacity: { value: 1 } },
  vertexShader: 'attribute float size; varying vec3 vC; uniform float uScale;' +
    'void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
    ' gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC;' +
    'void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t * uOpacity; }',
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
});
const riverPts = new THREE.Points(rGeo, rMat);
riverPts.frustumCulled = false;
scene.add(riverPts);

/* bờ sông: bụi mờ hai bên */
for (let i = 0; i < 22; i++) {
  const s = Math.random();
  const p = pathAt(s);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: i % 2 ? 0x6A4A9C : 0x9C5A7A, transparent: true, opacity: .05 + Math.random() * .04, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.position.set(p.x + (Math.random() - .5) * 10, p.y - 1, p.z + (i % 2 ? 8 : -8) + (Math.random() - .5) * 3);
  const sc = 13 + Math.random() * 12; sp.scale.set(sc, sc * .5, 1);
  scene.add(sp);
}

/* ---------------- đèn điều ước ---------------- */
const WISHES = ['Sức khỏe', 'Bình an', 'Hạnh phúc'];
const lanterns = [];
function makeLantern(idx) {
  const grp = new THREE.Group();
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xFFCE7A, transparent: true, opacity: .98, blending: THREE.AdditiveBlending, depthWrite: false }));
  core.scale.set(3.6, 3.6, 1);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFB27A, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(8, 8, 1);
  grp.add(halo); grp.add(core);
  grp.position.set(-19, -1, pathAt(.02).z);
  grp.visible = false;
  scene.add(grp);
  return { grp, core, halo, idx, s: .02, released: false, risen: false, bob: Math.random() * 6 };
}

/* vòng hoa finale */
const flowerRing = new THREE.Group(); flowerRing.visible = false; scene.add(flowerRing);
{
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      const a = (fi * 6 + i) / 12 * Math.PI * 2;
      s.position.set(Math.cos(a) * 20, Math.sin(a) * 9.5 + 6, -10);
      const sc = 2.7 + Math.random() * 1.1; s.scale.set(sc, sc, 1);
      flowerRing.add(s);
    }
  }));
}
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
  scene.add(pts);
  bursts.push({ pts, vel, t0: performance.now() });
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', lanterns: 0, armAt: 0, riseT0: 0 };
let holdStart = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'flow';
  for (let i = 0; i < 3; i++) lanterns.push(makeLantern(i));
  setHint('Chạm vào dòng sông để thả chiếc đèn đầu tiên');
  buzz(20);
}
function releaseLantern() {
  if (state.phase !== 'flow' || state.lanterns >= 3) return;
  const L = lanterns[state.lanterns];
  L.released = true; L.grp.visible = true;
  L.s = .18 + L.idx * .09; /* thả ngay khúc sông trước mặt, thấy liền */
  sparkleAt(L.grp.position, 12, 0xFFD98F);
  state.lanterns++;
  const lbl = $('#wishLabel'); lbl.textContent = WISHES[L.idx]; lbl.classList.add('show');
  setTimeout(() => lbl.classList.remove('show'), 1500);
  playSfx(sChime); buzz([30, 40, 30]);
  if (state.lanterns >= 3) setHint('Ba đèn đang trôi — giữ yên ngắm sông lặng');
  else setHint('Đèn đang trôi — thả thêm chiếc nữa');
}
function beginQuiet() {
  if (state.phase !== 'flow' || state.lanterns < 3) return;
  state.phase = 'quiet';
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginRise, 1100);
}
function beginRise() {
  if (state.phase !== 'quiet') return;
  state.phase = 'rise'; state.riseT0 = performance.now();
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([40, 50, 40, 50, 130]);
  camState.tz = 92;
  setTimeout(showFinale, 2400);
}
function showFinale() {
  if (state.phase !== 'rise') return;
  state.phase = 'finale';
  flowerRing.visible = true;
  lanterns.forEach(L => sparkleAt(L.grp.position, 22, 0xFFD98F));
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  setHint('Một lá thư đang chờ ở cuối dòng sông');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Ngân hà có một dòng sông không chảy bằng nước, mà bằng ánh sáng.',
  'Đêm nay em thả ba chiếc đèn lên dòng sông ấy, mỗi chiếc một điều ước cho chị:',
  'một cho sức khỏe dồi dào như nước nguồn,',
  'một cho bình an êm như mặt sông đêm,',
  'và một cho hạnh phúc — cứ chảy mãi, không bao giờ cạn.',
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

/* ---------------- input ---------------- */
const pointers = new Map();
let dragMoved = 0, pinchD = 0;
stage.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved = 0;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchD = Math.hypot(a.x - b.x, a.y - b.y);
  }
  if (state.phase === 'intro') { start(); return; }
  if (state.phase === 'flow' && state.lanterns >= 3) {
    holdStart = performance.now();
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.remove('hidden');
  }
});
stage.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  if (dragMoved > 7 && holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (pointers.size === 1) {
    camState.lookX = Math.max(-8, Math.min(8, camState.lookX + dx * .02));
    camState.y = Math.max(16, Math.min(32, camState.y + dy * .02));
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0) camState.tz = Math.max(56, Math.min(104, camState.tz - (d - pinchD) * .3));
    pinchD = d;
  }
});
function endPointer(e) {
  const wasTap = dragMoved <= 7 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; return; }
  if (wasTap && state.phase === 'flow' && state.lanterns < 3) releaseLantern();
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

  /* tốc độ dòng chảy theo pha */
  let flow = .011;
  if (state.phase === 'quiet') flow = .0006;
  if (state.phase === 'rise' || state.phase === 'finale' || state.phase === 'letter') flow = .004;
  if (holdStart) flow = .02;
  const arr = rGeo.getAttribute('position').array;
  for (let i = 0; i < RN; i++) {
    sS[i] += flow * dt;
    if (sS[i] > 1) sS[i] -= 1;
    const p = pathAt(sS[i]);
    /* pháp tuyến gần đúng của đường cong để tỏa hai bờ */
    const p2 = pathAt(Math.min(1, sS[i] + .01));
    let nx = -(p2.z - p.z), nz = (p2.x - p.x);
    const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
    const j = i * 3;
    arr[j] = p.x + nx * sLat[i];
    arr[j + 1] = p.y + sY[i];
    arr[j + 2] = p.z + nz * sLat[i];
  }
  rGeo.getAttribute('position').needsUpdate = true;
  rMat.uniforms.uOpacity.value = state.phase === 'quiet' ? .75 : 1;

  /* đèn trôi theo dòng, tới cuối sông thì neo lại chờ nhau */
  for (const L of lanterns) {
    if (!L.released) continue;
    const target = .86 - L.idx * .06;
    if (state.phase === 'rise' || state.phase === 'finale' || state.phase === 'letter') {
      const e = Math.min(1, (now - state.riseT0) / 2200), ease = 1 - Math.pow(1 - e, 2);
      const p = pathAt(L.s);
      L.grp.position.set(p.x, p.y + 3.4 + ease * 13 + Math.sin(t * 1.3 + L.bob) * .5, p.z);
      L.halo.material.opacity = .55 * (1 - ease * .4);
    } else {
      if (L.s < target) L.s = Math.min(target, L.s + dt * .09);
      const p = pathAt(L.s);
      L.grp.position.set(p.x, p.y + 3.4 + L.idx * .9 + Math.sin(t * 1.3 + L.bob) * .55, p.z + (L.idx - 1) * 3.2);
      const pulse = 3.6 + Math.sin(t * 2.2 + L.bob) * .5;
      L.core.scale.set(pulse, pulse, 1);
    }
  }
  /* tia lửa */
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i], age = (now - b.t0) / 1000;
    if (age > .9) { scene.remove(b.pts); bursts.splice(i, 1); continue; }
    const a2 = b.pts.geometry.getAttribute('position').array;
    for (let j = 0; j < b.vel.length; j++) {
      a2[j * 3] += b.vel[j][0] * dt; a2[j * 3 + 1] += b.vel[j][1] * dt; a2[j * 3 + 2] += b.vel[j][2] * dt;
    }
    b.pts.geometry.getAttribute('position').needsUpdate = true;
    b.pts.material.opacity = 1 - age / .9;
  }

  if (holdStart && state.phase === 'flow') {
    const pr = Math.min(1, (now - holdStart) / HOLD_MS);
    rfg.style.strokeDashoffset = CIRC * (1 - pr);
    if (pr >= 1) beginQuiet();
  }

  camState.z += (camState.tz - camState.z) * Math.min(1, dt * 2.2);
  camera.position.set(camState.lookX * .3, camState.y, camState.z);
  camera.lookAt(camState.lookX, -3, -2);

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__river = {
  get phase() { return state.phase; },
  get lanterns() { return state.lanterns; },
  start, releaseLantern, beginQuiet, openLetter,
  get completed() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
