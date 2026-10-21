/* Vòng Xoáy Ngân Hà — bản 25. Three.js: 6.000 sao xoáy hút vào lõi sáng →
   thả 3 tia lửa điều ước vào dòng xoáy → giữ nạp xoáy → lặng → siêu tân tinh:
   sao bung thành vòng, thư ở tâm vòng. Morph theo tiến độ thời gian. */
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
  gr.addColorStop(0, '#0B0716'); gr.addColorStop(.45, '#1B0F2E'); gr.addColorStop(.75, '#2C1638'); gr.addColorStop(1, '#1E0E26');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(56, W / H, .1, 420);
const camState = { az: 0, pol: .9, rad: 104, tAz: 0, tPol: .8, tRad: 78 };
function applyCam() {
  const sp = Math.sin(camState.pol);
  camera.position.set(camState.rad * sp * Math.sin(camState.az), camState.rad * Math.cos(camState.pol), camState.rad * sp * Math.cos(camState.az));
  camera.lookAt(0, 0, 0);
}
applyCam();
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .5, .55, .27));
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
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 160 + Math.random() * 80;
    pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .9, map: starTex, color: 0xD8C8EA, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })));
}

/* ---------------- dòng xoáy sao ---------------- */
const VN = 6000;
const vPos = new Float32Array(VN * 3), vCol = new Float32Array(VN * 3), vSize = new Float32Array(VN);
const sR = new Float32Array(VN), sA = new Float32Array(VN), sY = new Float32Array(VN);
const fromPos = new Float32Array(VN * 3), ringPos = new Float32Array(VN * 3);
const cCore = new THREE.Color('#FFE9BC'), cMid = new THREE.Color('#FFB7C9'), cArm = new THREE.Color('#C9A7E8'), tmpC = new THREE.Color();
for (let i = 0; i < VN; i++) {
  sR[i] = 2.4 + Math.pow(Math.random(), .8) * 30;
  sA[i] = Math.random() * 6.283;
  sY[i] = (Math.random() - .5) * (1.1 + sR[i] * .05);
  const t = sR[i] / 32;
  tmpC.copy(cCore).lerp(t < .45 ? cMid : cArm, t < .45 ? t / .45 : (t - .45) / .55);
  const b = .85 - t * .35 + Math.random() * .25;
  vCol.set([tmpC.r * b, tmpC.g * b, tmpC.b * b], i * 3);
  vSize[i] = (Math.random() < .05 ? 2.7 : 1.25) + Math.random();
  /* đích vòng sau siêu tân tinh: vành elip trong mặt đĩa + sao xa rải nền */
  const a = Math.random() * 6.283;
  if (Math.random() < .78) ringPos.set([Math.cos(a) * (19 + Math.random() * 6), (Math.random() - .5) * 1.6, Math.sin(a) * (19 + Math.random() * 6)], i * 3);
  else ringPos.set([(Math.random() - .5) * 70, (Math.random() - .5) * 26, -14 - Math.random() * 26], i * 3);
}
const vGeo = new THREE.BufferGeometry();
vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
vGeo.setAttribute('color', new THREE.BufferAttribute(vCol, 3));
vGeo.setAttribute('size', new THREE.BufferAttribute(vSize, 1));
const vMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: starTex }, uScale: { value: H * .5 }, uOpacity: { value: 1 } },
  vertexShader: 'attribute float size; varying vec3 vC; uniform float uScale;' +
    'void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
    ' gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC;' +
    'void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t * uOpacity; }',
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
});
const vortex = new THREE.Group(); scene.add(vortex);
vortex.rotation.x = -.28;
vortex.add(new THREE.Points(vGeo, vMat));
const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFD9A8, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false }));
coreGlow.scale.set(15, 15, 1); vortex.add(coreGlow);
const coreDot = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xFFF3D0, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
coreDot.scale.set(4.6, 4.6, 1); vortex.add(coreDot);

/* vòng hoa ở finale */
const flowerRing = new THREE.Group(); flowerRing.visible = false; scene.add(flowerRing);
{
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      const a = (fi * 6 + i) / 12 * Math.PI * 2;
      s.position.set(Math.cos(a) * 20, Math.sin(a) * 9.5, Math.sin(a) * 4 - 8);
      const sc = 2.8 + Math.random() * 1.1; s.scale.set(sc, sc, 1);
      flowerRing.add(s);
    }
  }));
}

/* ---------------- 3 tia lửa điều ước ---------------- */
const WISHES = ['Sức khỏe', 'Bình an', 'Hạnh phúc'];
const orbs = [];
WISHES.forEach((name, i) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xFFCE7A, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(3.4, 3.4, 1);
  s.userData = { name, idx: i, ang: i * 2.094 + .6, fed: false, feedT: 0, r: 34, y: 6 - i * 5 };
  scene.add(s); orbs.push(s);
});

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', wishes: 0, armAt: 0, burstT0: 0, spinBoost: 0 };
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
  setHint('Kéo để bay quanh, chạm 3 tia lửa vàng');
  buzz(20);
}
function feedOrb(i) {
  const o = orbs[i];
  if (!o || o.userData.fed || state.phase !== 'flow') return;
  o.userData.fed = true; o.userData.feedT = performance.now();
  state.wishes++;
  const lbl = $('#wishLabel'); lbl.textContent = o.userData.name; lbl.classList.add('show');
  setTimeout(() => lbl.classList.remove('show'), 1500);
  playSfx(sChime); buzz([30, 40, 30]);
  state.spinBoost = Math.min(1.6, state.spinBoost + .55);
  if (state.wishes >= 3) setHint('Giữ yên để nạp xoáy — rồi buông tay ra nhé');
  else setHint('Dòng xoáy sáng hơn rồi — còn ' + (3 - state.wishes) + ' tia lửa nữa');
}
function beginQuiet() {
  if (state.phase !== 'flow' || state.wishes < 3) return;
  state.phase = 'quiet';
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginBurst, 1050);
}
function beginBurst() {
  if (state.phase !== 'quiet') return;
  fromPos.set(vGeo.getAttribute('position').array);
  state.phase = 'burst'; state.burstT0 = performance.now();
  const fl = $('#flash'); fl.style.opacity = .9; setTimeout(() => fl.style.opacity = 0, 200);
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([50, 40, 160]);
  camState.tRad = 84;
  setTimeout(showFinale, 2600);
}
function showFinale() {
  if (state.phase !== 'burst') return;
  state.phase = 'finale';
  flowerRing.visible = true;
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  setHint('Một lá thư đang chờ ở tâm vòng xoáy');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Người ta nói giữa vũ trụ có những dòng xoáy nuốt cả ánh sáng.',
  'Nhưng dòng xoáy này khác — nó chỉ giữ lại những điều đẹp nhất.',
  'Một năm nữa chị cười thật nhiều, lòng thật yên, tay luôn ấm.',
  'Mọi ngôi sao ở đây đều xoáy về phía chị,',
  'như cách mọi điều tốt lành rồi sẽ tìm đến đúng người.',
  'Chúc mừng sinh nhật chị — người ở tâm mọi điều tốt đẹp quanh em.'
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
  if (state.phase === 'flow' && state.wishes >= 3) {
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
  if (pointers.size === 1 && state.phase !== 'intro') {
    camState.tAz -= dx * .005;
    camState.tPol = Math.max(.3, Math.min(2.7, camState.tPol - dy * .004));
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0) camState.tRad = Math.max(34, Math.min(110, camState.tRad - (d - pinchD) * .25));
    pinchD = d;
  }
});
function endPointer(e) {
  const wasTap = dragMoved <= 7 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (!wasTap || state.phase !== 'flow') return;
  let best = -1, bestD = 95;
  orbs.forEach((o, i) => {
    if (o.userData.fed) return;
    const v = o.position.clone().project(camera);
    const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
    const d = Math.hypot(sx - e.clientX, sy - e.clientY);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best >= 0) feedOrb(best);
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

  const flowing = state.phase === 'intro' || state.phase === 'flow' || state.phase === 'quiet';
  if (flowing) {
    let spin = state.phase === 'intro' ? .5 : 1;
    if (state.phase === 'quiet') spin = .05;
    if (holdStart && state.phase === 'flow') spin = 1 + Math.min(1, (now - holdStart) / HOLD_MS) * 2.2;
    spin += state.spinBoost;
    state.spinBoost = Math.max(0, state.spinBoost - dt * .25);
    const arr = vGeo.getAttribute('position').array;
    for (let i = 0; i < VN; i++) {
      const w = 2.6 / Math.sqrt(sR[i]) * spin;
      sA[i] += w * dt;
      sR[i] -= dt * spin * .55 * (1.6 - sR[i] / 34);
      if (sR[i] < 2.1) { sR[i] = 29 + Math.random() * 4; sY[i] = (Math.random() - .5) * 2.6; }
      const j = i * 3;
      arr[j] = Math.cos(sA[i]) * sR[i];
      arr[j + 1] = sY[i] + Math.sin(t * .7 + i) * .12;
      arr[j + 2] = Math.sin(sA[i]) * sR[i];
    }
    vGeo.getAttribute('position').needsUpdate = true;
    const dim = state.phase === 'quiet' ? .55 : 1;
    vMat.uniforms.uOpacity.value += (dim - vMat.uniforms.uOpacity.value) * Math.min(1, dt * 3);
    coreGlow.material.opacity = (.42 + Math.sin(t * 2.1) * .07 + state.spinBoost * .2) * dim;
    coreGlow.scale.setScalar(15 + state.spinBoost * 3);
  } else if (state.phase === 'burst') {
    const p01 = Math.min(1, (now - state.burstT0) / 2400), e = 1 - Math.pow(1 - p01, 3);
    const arr = vGeo.getAttribute('position').array;
    for (let i = 0; i < VN; i++) {
      const j = i * 3;
      arr[j] = fromPos[j] + (ringPos[j] - fromPos[j]) * e;
      arr[j + 1] = fromPos[j + 1] + (ringPos[j + 1] - fromPos[j + 1]) * e;
      arr[j + 2] = fromPos[j + 2] + (ringPos[j + 2] - fromPos[j + 2]) * e;
    }
    vGeo.getAttribute('position').needsUpdate = true;
    coreGlow.material.opacity = .5 * (1 - e) + .12;
    coreGlow.scale.setScalar(15 + e * 26);
    vMat.uniforms.uOpacity.value = .55 + .45 * e;
  } else { /* finale / letter */
    vortex.rotation.y += dt * .07;
    flowerRing.rotation.y = Math.sin(t * .11) * .25;
    flowerRing.rotation.z = t * .02;
  }

  /* tia lửa điều ước: lượn ngoài đĩa; đã thả thì xoáy vào tâm */
  for (const o of orbs) {
    const u = o.userData;
    if (u.fed) {
      const e = Math.min(1, (now - u.feedT) / 1200);
      u.r = 34 * (1 - e) + .5;
      u.ang += dt * (2 + e * 6);
      o.position.set(Math.cos(u.ang) * u.r, u.y * (1 - e), Math.sin(u.ang) * u.r);
      o.material.opacity = .95 * (1 - e * e);
      const k = 3.4 * (1 - e * .7); o.scale.set(k, k, 1);
      if (e >= 1) o.visible = false;
    } else {
      u.ang += dt * .22;
      o.position.set(Math.cos(u.ang) * 34, u.y + Math.sin(t * .8 + u.idx * 2) * 1.6, Math.sin(u.ang) * 34);
      const p = 3.1 + Math.sin(t * 2.4 + u.idx * 2.1) * .5;
      o.scale.set(p, p, 1);
    }
  }

  if (holdStart && state.phase === 'flow') {
    const pr = Math.min(1, (now - holdStart) / HOLD_MS);
    rfg.style.strokeDashoffset = CIRC * (1 - pr);
    if (pr >= 1) beginQuiet();
  }

  camState.az += (camState.tAz - camState.az) * Math.min(1, dt * 5);
  camState.pol += (camState.tPol - camState.pol) * Math.min(1, dt * 5);
  camState.rad += (camState.tRad - camState.rad) * Math.min(1, dt * 2.2);
  applyCam();

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__vortex = {
  get phase() { return state.phase; },
  get wishes() { return state.wishes; },
  start, feedOrb, beginQuiet, openLetter,
  get bursted() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
