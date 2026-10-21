/* Hành Tinh Hoa — bản 28. Three.js: hành tinh hoa xoay 360° → chạm 3 lần cho hoa
   nở khắp bề mặt theo từng đợt → giữ → lặng → vành đai cánh hoa hiện ra → thư. */
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
  gr.addColorStop(0, '#080614'); gr.addColorStop(.5, '#160D2C'); gr.addColorStop(1, '#221233');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(55, W / H, .1, 400);
const camState = { z: 60, tZ: 56 };
camera.position.set(0, 2, 60);
camera.lookAt(0, 0, 0);
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .5, .55, .26));
} catch (e) { composer = null; }

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const starTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,215,200,.45)');
const dustTex = glowTexture('rgba(255,190,200,.5)', 'rgba(190,120,200,.15)');

/* sao nền */
{
  const n = 800, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 120 + Math.random() * 60;
    pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .95, map: starTex, color: 0xCFC4EA, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })));
}

/* ---------------- hành tinh ---------------- */
const PR = 11;
const planet = new THREE.Group(); scene.add(planet);
planet.rotation.z = .18;
/* lõi đặc che mặt sau */
planet.add(new THREE.Mesh(new THREE.SphereGeometry(PR - .25, 40, 28), new THREE.MeshBasicMaterial({ color: 0x241128 })));
/* bụi bề mặt phát sáng */
{
  const n = 2400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), siz = new Float32Array(n);
  const cA = new THREE.Color('#7A4A8C'), cB = new THREE.Color('#C97AA8'), cC = new THREE.Color('#FFD9A0'), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u);
    pos.set([s * Math.cos(th) * PR, u * PR, s * Math.sin(th) * PR], i * 3);
    tmp.copy(cA).lerp(cB, Math.random());
    if (Math.random() < .1) tmp.copy(cC);
    const b = .5 + Math.random() * .5;
    col.set([tmp.r * b, tmp.g * b, tmp.b * b], i * 3);
    siz[i] = 1 + Math.random() * 1.3;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(siz, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTex: { value: starTex }, uScale: { value: H * .42 }, uOpacity: { value: 1 } },
    vertexShader: 'attribute float size; varying vec3 vC; uniform float uScale;' +
      'void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
      ' gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC;' +
      'void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t * uOpacity; }',
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
  });
  planet.add(new THREE.Points(geo, mat));
}
/* quầng khí quyển */
const atmo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xB98AC9, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false }));
atmo.scale.set(31, 31, 1); scene.add(atmo);

/* hoa trên bề mặt: rải Fibonacci, nở theo 3 đợt chạm */
const flowers = [];
{
  const loader = new THREE.TextureLoader();
  const files = ['assets/img/rose.webp', 'assets/img/peony.webp'];
  const NF = 140, golden = Math.PI * (3 - Math.sqrt(5));
  const spots = [];
  for (let i = 0; i < NF; i++) {
    const y = 1 - (i / (NF - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
    spots.push(new THREE.Vector3(Math.cos(th) * rad, y, Math.sin(th) * rad));
  }
  files.forEach((f, fi) => loader.load(f, tex => {
    spots.forEach((dir, i) => {
      if (i % 2 !== fi) return;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .97, depthWrite: false }));
      s.position.copy(dir).multiplyScalar(PR + .55);
      const target = 1.3 + Math.random() * .7;
      s.scale.set(.001, .001, 1);
      s.userData = { target, band: i % 3, bloomT0: 0, delay: Math.random() * 350, dir };
      planet.add(s); flowers.push(s);
    });
  }));
}
/* vành đai cánh hoa finale */
const petalRing = new THREE.Group(); petalRing.visible = false; scene.add(petalRing);
const ringSprites = [];
{
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 12; i++) {
      const k = fi * 12 + i;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .92, depthWrite: false }));
      const a = k / 24 * Math.PI * 2, r = 20.5 + (k % 3) * 1.2;
      s.position.set(Math.cos(a) * r, Math.sin(a) * r * .42, Math.sin(a) * 3 - 1);
      const sc = 1.5 + Math.random() * .6; s.scale.set(sc, sc, 1);
      s.userData = { a, r };
      petalRing.add(s); ringSprites.push(s);
    }
  }));
  petalRing.rotation.x = -.5;
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', waves: 0, armAt: 0, ringT0: 0 };
let holdStart = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;
let rotY = 0, rotX = 0, tRotY = 0, tRotX = 0, spinVel = .25;

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'bloom';
  setHint('Kéo để xoay hành tinh — chạm vào hành tinh cho hoa nở');
  buzz(20);
}
function tapBloom() {
  if (state.phase !== 'bloom' || state.waves >= 3) return;
  const w = state.waves, now = performance.now();
  flowers.forEach(f => { if (f.userData.band === w) f.userData.bloomT0 = now; });
  state.waves++;
  playSfx(sChime); buzz([30, 40, 30]);
  if (state.waves >= 3) setHint('Hoa nở khắp hành tinh — giữ yên một nhịp');
  else setHint('Hoa đang nở… chạm thêm ' + (3 - state.waves) + ' lần nữa');
}
function beginQuiet() {
  if (state.phase !== 'bloom' || state.waves < 3) return;
  state.phase = 'quiet';
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginFinale, 1050);
}
function beginFinale() {
  if (state.phase !== 'quiet') return;
  state.phase = 'finale'; state.ringT0 = performance.now();
  petalRing.visible = true;
  camState.tZ = 96;
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([40, 50, 40, 50, 120]);
  const fl = $('#flash'); fl.style.opacity = .4; setTimeout(() => fl.style.opacity = 0, 180);
  setTimeout(() => {
    $('#lettercard').classList.remove('hidden');
    state.armAt = performance.now() + 600;
    setHint('Một lá thư đang chờ trên hành tinh hoa');
  }, 650);
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Ở một góc rất xa của vũ trụ, có một hành tinh chỉ toàn hoa.',
  'Nó không có mùa đông, không có ngày buồn — chỉ có nở và thơm.',
  'Em nhờ nó gửi về đây một điều ước cho chị:',
  'ở hành tinh này, chị cũng luôn có hoa nở quanh mình,',
  'người thương ở bên, và mỗi tuổi mới là một mùa rực rỡ hơn.',
  'Chúc mừng sinh nhật chị — bông hoa đẹp nhất của hành tinh này.'
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
let dragMoved = 0, pinchD = 0, downX = 0, downY = 0;
stage.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  dragMoved = 0; downX = e.clientX; downY = e.clientY;
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchD = Math.hypot(a.x - b.x, a.y - b.y);
  }
  if (state.phase === 'intro') { start(); return; }
  if (state.phase === 'bloom' && state.waves >= 3) {
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
    tRotY += dx * .008;
    tRotX = Math.max(-.6, Math.min(.6, tRotX + dy * .005));
    spinVel = .25 + Math.min(1.2, Math.abs(dx) * .02);
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0) camState.tZ = Math.max(40, Math.min(104, camState.tZ - (d - pinchD) * .25));
    pinchD = d;
  }
});
function endPointer(e) {
  const wasTap = dragMoved <= 7 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (!wasTap) return;
  if (state.phase !== 'bloom' || state.waves >= 3) return;
  /* chạm có trúng đĩa hành tinh trên màn hình không */
  const cx = W / 2, cy = H / 2;
  const rPx = (PR + 1.5) / (2 * camState.z * Math.tan(27.5 * Math.PI / 180)) * H * 1.12;
  if (Math.hypot(e.clientX - cx, e.clientY - cy) < rPx) tapBloom();
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

  const spin = state.phase === 'quiet' ? .01 : spinVel;
  tRotY += dt * spin;
  spinVel += (.25 - spinVel) * Math.min(1, dt * 1.5);
  rotY += (tRotY - rotY) * Math.min(1, dt * 6);
  rotX += (tRotX - rotX) * Math.min(1, dt * 6);
  planet.rotation.y = rotY;
  planet.rotation.x = rotX;
  atmo.material.opacity = state.phase === 'finale' || state.phase === 'letter' ? .5 : .34 + Math.sin(t * 1.4) * .05;

  /* hoa nở theo đợt: scale nảy nhẹ khi tới lượt */
  for (const f of flowers) {
    const u = f.userData;
    if (!u.bloomT0) continue;
    const e = Math.min(1, Math.max(0, (now - u.bloomT0 - u.delay) / 800));
    if (e <= 0) continue;
    const back = 1 + 2.2 * Math.pow(e - 1, 3) + 1.2 * Math.pow(e - 1, 2); /* easeOutBack */
    const s = Math.max(.001, u.target * (e < 1 ? back : 1));
    f.scale.set(s, s, 1);
  }
  /* vành đai cánh hoa: hoa chạy dọc elip cố định, vành không tiền lệ */
  if (petalRing.visible) {
    const e = Math.min(1, (now - state.ringT0) / 1200);
    for (const s of ringSprites) {
      const u = s.userData;
      u.a += dt * .06;
      s.position.set(Math.cos(u.a) * u.r, Math.sin(u.a) * u.r * .42, Math.sin(u.a) * 3 - 1);
      s.material.opacity = .92 * e;
    }
  }

  if (holdStart && state.phase === 'bloom') {
    const pr = Math.min(1, (now - holdStart) / HOLD_MS);
    rfg.style.strokeDashoffset = CIRC * (1 - pr);
    if (pr >= 1) beginQuiet();
  }

  camState.z += (camState.tZ - camState.z) * Math.min(1, dt * 2.4);
  camera.position.set(0, 2, camState.z);
  camera.lookAt(0, 0, 0);

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__planet = {
  get phase() { return state.phase; },
  get waves() { return state.waves; },
  start, tapBloom, beginQuiet, openLetter,
  get completed() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
