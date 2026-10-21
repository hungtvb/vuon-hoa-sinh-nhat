/* Thiên Hà Điều Ước — bản 21. Sao tự hợp thành dòng chữ chúc giữa trời hoàng hôn. */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), hint = $('#hint'), toast = $('#toast');
const music = $('#music'), sChime = $('#sfx-chime'), sShimmer = $('#sfx-shimmer');

function setHint(t) { hint.textContent = t; }
let toastTimer = null;
function showToast(t) {
  toast.textContent = t; toast.classList.remove('hidden', 'pop'); void toast.offsetWidth;
  toast.classList.add('pop'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2250);
}
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }
function buzz(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

/* ================= THREE setup ================= */
const canvas = $('#gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 1, 400);
camera.position.set(0, 0, 100);

let VW = 48, VH = 104; /* visible world size at z=0 */
function layout() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.setSize(w, h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  VH = 2 * 100 * t; VW = VH * camera.aspect;
}
layout(); addEventListener('resize', layout);

const group = new THREE.Group(); scene.add(group);

/* ================= star field with morphing conformations ================= */
const N = 3500;
const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), siz = new Float32Array(N);
const tPos = new Float32Array(N * 3), tCol = new Float32Array(N * 3), tSiz = new Float32Array(N);
const phase = new Float32Array(N);
const PALETTE = [
  [1.0, 0.93, 0.72], /* warm white-gold */
  [1.0, 0.72, 0.30], /* deep gold */
  [0.98, 0.45, 0.62], /* rose */
  [0.66, 0.55, 0.98]  /* violet */
];
function pickColor(i, bright) {
  const c = PALETTE[(Math.random() * PALETTE.length) | 0];
  const b = bright ? 1 : 0.72 + Math.random() * 0.2;
  col[i * 3] = tCol[i * 3] = c[0] * b; col[i * 3 + 1] = tCol[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = tCol[i * 3 + 2] = c[2] * b;
}
for (let i = 0; i < N; i++) { phase[i] = Math.random() * Math.PI * 2; pickColor(i, false); siz[i] = tSiz[i] = 0.5 + Math.random() * 0.5; }

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
geo.setAttribute('aSize', new THREE.BufferAttribute(siz, 1));
geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));

const starUniforms = { uTime: { value: 0 }, uScale: { value: 600 } };
const starMat = new THREE.ShaderMaterial({
  uniforms: starUniforms, transparent: true, depthWrite: false,
  vertexShader: `
    attribute vec3 aColor; attribute float aSize; attribute float aPhase;
    uniform float uTime; uniform float uScale;
    varying vec3 vColor; varying float vTw;
    void main(){
      vColor = aColor;
      float tw = 0.74 + 0.26 * sin(uTime * 1.7 + aPhase);
      vTw = tw;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * tw * uScale / -mv.z;
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vColor; varying float vTw;
    void main(){
      vec2 pc = gl_PointCoord - 0.5;
      float d = length(pc) * 2.0;
      float core = smoothstep(0.52, 0.02, d);
      float halo = smoothstep(1.0, 0.12, d) * 0.38;
      vec3 c = mix(vColor * 0.94, vec3(1.0), core * 0.5);
      float a = clamp(core + halo, 0.0, 1.0) * (0.82 + 0.18 * vTw);
      if (a < 0.01) discard;
      gl_FragColor = vec4(c, a);
    }`
});
const stars = new THREE.Points(geo, starMat); group.add(stars);

function updateScale() {
  const hPx = renderer.domElement.height;
  starUniforms.uScale.value = hPx * 0.5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  burstUniforms.uScale.value = starUniforms.uScale.value;
}

/* ================= bursts (finale sparkles) ================= */
const BN = 300;
const bPos = new Float32Array(BN * 3), bCol = new Float32Array(BN * 3), bSiz = new Float32Array(BN), bPhase = new Float32Array(BN);
const bVel = new Float32Array(BN * 3), bLife = new Float32Array(BN);
const burstUniforms = { uTime: { value: 0 }, uScale: { value: 600 } };
const bGeo = new THREE.BufferGeometry();
bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
bGeo.setAttribute('aColor', new THREE.BufferAttribute(bCol, 3));
bGeo.setAttribute('aSize', new THREE.BufferAttribute(bSiz, 1));
bGeo.setAttribute('aPhase', new THREE.BufferAttribute(bPhase, 1));
const burstMat = starMat.clone(); burstMat.uniforms = burstUniforms;
const bursts = new THREE.Points(bGeo, burstMat); group.add(bursts);
let bCursor = 0;
function spawnBurst(wx, wy, n) {
  for (let k = 0; k < (n || 42); k++) {
    const i = bCursor; bCursor = (bCursor + 1) % BN;
    bPos[i * 3] = wx; bPos[i * 3 + 1] = wy; bPos[i * 3 + 2] = 2;
    const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 15;
    bVel[i * 3] = Math.cos(a) * sp; bVel[i * 3 + 1] = Math.sin(a) * sp; bVel[i * 3 + 2] = 0;
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    bCol[i * 3] = c[0]; bCol[i * 3 + 1] = c[1]; bCol[i * 3 + 2] = c[2];
    bSiz[i] = 0.7 + Math.random() * 0.6; bPhase[i] = Math.random() * 6.28; bLife[i] = 1;
  }
}

/* ================= conformations ================= */
const WISH_CENTERS = [[-0.30, 0.24], [0.30, 0.33], [0.0, -0.20]]; /* fractions of VW/VH */
const CLUSTER_N = 260;
const clusterOf = i => i < CLUSTER_N * 3 ? (i / CLUSTER_N) | 0 : -1;

function scatterTargets() {
  for (let i = 0; i < N; i++) {
    const ci = clusterOf(i);
    if (ci >= 0) {
      /* cluster stars live in loose balls at the wish centers */
      const cx = WISH_CENTERS[ci][0] * VW, cy = WISH_CENTERS[ci][1] * VH;
      const r = Math.pow(Math.random(), 0.6) * 5.2, a = Math.random() * Math.PI * 2;
      tPos[i * 3] = cx + Math.cos(a) * r; tPos[i * 3 + 1] = cy + Math.sin(a) * r * 0.82; tPos[i * 3 + 2] = (Math.random() - .5) * 5;
      tSiz[i] = 0.38 + Math.random() * 0.3; /* dim until lit */
      tCol[i * 3] *= 0.9; tCol[i * 3 + 1] *= 0.9; tCol[i * 3 + 2] *= 0.95;
    } else {
      tPos[i * 3] = (Math.random() - .5) * VW * 0.98;
      tPos[i * 3 + 1] = (Math.random() - .5) * VH * 0.94;
      tPos[i * 3 + 2] = (Math.random() - .5) * 22;
      tSiz[i] = 0.5 + Math.random() * 0.5;
    }
  }
}
/* start exactly at scatter */
scatterTargets();
pos.set(tPos); col.set(tCol); siz.set(tSiz);

function lightClusterTargets(ci) {
  for (let i = ci * CLUSTER_N; i < (ci + 1) * CLUSTER_N; i++) {
    const cx = WISH_CENTERS[ci][0] * VW, cy = WISH_CENTERS[ci][1] * VH;
    const r = Math.pow(Math.random(), 0.7) * 4.4, a = Math.random() * Math.PI * 2;
    tPos[i * 3] = cx + Math.cos(a) * r; tPos[i * 3 + 1] = cy + Math.sin(a) * r * 0.82; tPos[i * 3 + 2] = (Math.random() - .5) * 4;
    tSiz[i] = 0.85 + Math.random() * 0.55;
    const c = PALETTE[(Math.random() * 2) | 0]; /* white/gold */
    tCol[i * 3] = c[0]; tCol[i * 3 + 1] = c[1]; tCol[i * 3 + 2] = c[2];
  }
}

/* text sampling from an offscreen canvas */
function sampleText() {
  const cw = 1200, ch = 620, cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let fs = 205;
  ctx.font = '900 ' + fs + 'px Arial, sans-serif';
  const w1 = ctx.measureText('CHÚC MỪNG').width, w2 = ctx.measureText('SINH NHẬT').width;
  fs = Math.floor(fs * Math.min(1, (cw * 0.94) / Math.max(w1, w2)));
  ctx.font = '900 ' + fs + 'px Arial, sans-serif';
  ctx.fillText('CHÚC MỪNG', cw / 2, ch * 0.27);
  ctx.fillText('SINH NHẬT', cw / 2, ch * 0.74);
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const pts = [];
  let step = 4;
  while (step <= 12) {
    pts.length = 0;
    for (let y = 0; y < ch; y += step) for (let x = 0; x < cw; x += step) {
      if (data[(y * cw + x) * 4] > 120) pts.push([x + (Math.random() - .5) * 2, y + (Math.random() - .5) * 2]);
    }
    if (pts.length <= N - 560 || step === 12) break;
    step += 1;
  }
  /* shuffle samples so assignment covers the glyphs evenly */
  for (let i = pts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
  return pts;
}

function textTargets() {
  const pts = sampleText();
  /* shuffle assignment so stars fly from everywhere */
  const order = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = order[i]; order[i] = order[j]; order[j] = t; }
  const textW = VW * 0.94, textH = textW * (620 / 1200);
  const used = Math.min(pts.length, N - 560);
  for (let k = 0; k < used; k++) {
    const i = order[k], p = pts[k % pts.length];
    tPos[i * 3] = (p[0] / 1200 - 0.5) * textW;
    tPos[i * 3 + 1] = (0.5 - p[1] / 620) * textH + VH * 0.03;
    tPos[i * 3 + 2] = (Math.random() - .5) * 1.6;
    tSiz[i] = 0.62 + Math.random() * 0.3;
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    tCol[i * 3] = c[0]; tCol[i * 3 + 1] = c[1]; tCol[i * 3 + 2] = c[2];
  }
  /* the rest: a star-flower wreath around the words + soft dust */
  for (let k = used; k < N; k++) {
    const i = order[k];
    if (k - used < 400) {
      const th = Math.random() * Math.PI * 2;
      const rr = 1 + 0.07 * Math.sin(6 * th); /* petal modulation */
      tPos[i * 3] = Math.cos(th) * textW * 0.60 * rr;
      tPos[i * 3 + 1] = Math.sin(th) * textH * 1.28 * rr + VH * 0.03;
      tPos[i * 3 + 2] = (Math.random() - .5) * 3;
      tSiz[i] = 0.55 + Math.random() * 0.4;
    } else {
      tPos[i * 3] = (Math.random() - .5) * VW * 0.98;
      tPos[i * 3 + 1] = (Math.random() - .5) * VH * 0.94;
      tPos[i * 3 + 2] = -6 - Math.random() * 10;
      tSiz[i] = 0.35 + Math.random() * 0.3;
    }
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    tCol[i * 3] = c[0]; tCol[i * 3 + 1] = c[1]; tCol[i * 3 + 2] = c[2];
  }
  return used;
}

function orbitTargets() {
  for (let i = 0; i < N; i++) {
    const th = Math.random() * Math.PI * 2, rad = 0.30 + Math.random() * 0.70;
    tPos[i * 3] = Math.cos(th) * rad * VW * 0.56;
    tPos[i * 3 + 1] = Math.sin(th) * rad * VH * 0.44;
    tPos[i * 3 + 2] = (Math.random() - .5) * 9;
    tSiz[i] = 0.5 + Math.random() * 0.5;
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    tCol[i * 3] = c[0] * .95; tCol[i * 3 + 1] = c[1] * .95; tCol[i * 3 + 2] = c[2];
  }
}

/* ================= state & interaction ================= */
const WISHES = ['Sức khỏe', 'Bình an', 'Hạnh phúc'];
const state = { phase: 'wishes', wishesLit: 0, lit: [false, false, false], formed: false, letterShown: false };
const marks = [...document.querySelectorAll('.wishmark')];

function clusterScreen(ci) {
  const v = new THREE.Vector3(WISH_CENTERS[ci][0] * VW, WISH_CENTERS[ci][1] * VH, 0);
  v.applyMatrix4(group.matrixWorld); v.project(camera);
  return { x: (v.x * 0.5 + 0.5) * stage.clientWidth, y: (-v.y * 0.5 + 0.5) * stage.clientHeight };
}
function placeMarks() {
  for (let ci = 0; ci < 3; ci++) {
    const p = clusterScreen(ci), m = marks[ci];
    m.style.left = p.x + 'px'; m.style.top = p.y + 'px';
  }
}
function screenToWorld(cx, cy) {
  const nx = (cx / stage.clientWidth) * 2 - 1, ny = -(cy / stage.clientHeight) * 2 + 1;
  const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
  const dir = v.sub(camera.position).normalize();
  const dist = -camera.position.z / dir.z;
  const p = camera.position.clone().add(dir.multiplyScalar(dist));
  return group.worldToLocal(p);
}

function lightWish(ci) {
  if (state.lit[ci]) return;
  state.lit[ci] = true; state.wishesLit++;
  lightClusterTargets(ci);
  marks[ci].classList.add('lit');
  playSfx(sChime); buzz(20);
  const c = clusterScreen(ci);
  const w = screenToWorld(c.x, c.y);
  spawnBurst(w.x, w.y, 30);
  showToast(WISHES[ci]);
  if (state.wishesLit >= 3) {
    setTimeout(startForming, 650);
    setHint('Ba điều ước đã sáng… nhìn đàn sao bay về này');
  } else {
    setHint('Còn ' + (3 - state.wishesLit) + ' điều ước nữa — chạm vào cụm sao còn lại');
  }
}
function startForming() {
  if (state.phase !== 'wishes') return;
  state.phase = 'forming';
  marks.forEach(m => m.classList.add('gone'));
  textTargets();
  playSfx(sShimmer);
}
function checkFormed() {
  let sum = 0, cnt = 0;
  for (let i = 0; i < N; i += 37) {
    const dx = tPos[i * 3] - pos[i * 3], dy = tPos[i * 3 + 1] - pos[i * 3 + 1];
    sum += Math.sqrt(dx * dx + dy * dy); cnt++;
  }
  if (sum / cnt < 0.85) {
    state.formed = true; state.phase = 'formed';
    setHint('Chạm vào dòng chữ nhé');
    buzz([25, 40, 25]);
  }
}

/* letter */
const LETTER = [
  'Giữa một trời sao, em gửi lên ba điều ước trước nhất:',
  'chúc chị luôn khỏe như ánh sao mai,',
  'bình an như bầu trời sau cơn mưa,',
  'và hạnh phúc lấp lánh hoài không tắt.',
  'Tuổi mới, mong mọi điều chị thầm ước',
  'đều bay về thành thật — như đàn sao này vậy.'
];
function openLetter() {
  if (state.phase !== 'formed' && state.phase !== 'orbit') return;
  playSfx(sChime); buzz(20);
  $('#letter').classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 220 + i * 280);
  });
  setTimeout(() => { $('.sign').classList.add('show'); state.letterShown = true; }, 220 + LETTER.length * 280);
  hint.style.opacity = 0;
}
$('#closeLetter').addEventListener('click', () => {
  $('#letter').classList.add('hidden'); buzz(15);
  if (state.phase === 'formed' || state.phase === 'letter') {
    state.phase = 'orbit';
    orbitTargets();
    setHint('Chạm đâu, sao bung ở đó');
  }
  hint.style.opacity = 1;
});

/* pointer: tap vs drag */
let pDown = null, rotTX = 0, rotTY = 0;
stage.addEventListener('pointerdown', e => {
  music.play().catch(() => {});
  pDown = { x: e.clientX, y: e.clientY, t: performance.now() };
});
stage.addEventListener('pointermove', e => {
  if (!pDown || state.phase === 'letter') return;
  const dx = e.clientX - pDown.x, dy = e.clientY - pDown.y;
  if (Math.abs(dx) + Math.abs(dy) > 12) {
    rotTY = THREE.MathUtils.clamp(dx * 0.0028, -0.45, 0.45);
    rotTX = THREE.MathUtils.clamp(dy * 0.0016, -0.14, 0.14);
  }
});
stage.addEventListener('pointerup', e => {
  if (!pDown) return;
  const moved = Math.abs(e.clientX - pDown.x) + Math.abs(e.clientY - pDown.y);
  const dt = performance.now() - pDown.t;
  const wasDown = pDown; pDown = null;
  if (moved > 12 || dt > 450) return;
  const r = stage.getBoundingClientRect();
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  if (state.phase === 'wishes') {
    for (let ci = 0; ci < 3; ci++) {
      if (state.lit[ci]) continue;
      const c = clusterScreen(ci);
      if (Math.hypot(cx - c.x, cy - c.y) < 100) { lightWish(ci); return; }
    }
    const w = screenToWorld(cx, cy); spawnBurst(w.x, w.y, 18);
  } else if (state.phase === 'formed') {
    /* tap near the words opens the letter */
    if (cy > stage.clientHeight * 0.22 && cy < stage.clientHeight * 0.78) openLetter();
    else { const w = screenToWorld(cx, cy); spawnBurst(w.x, w.y, 18); }
  } else if (state.phase === 'orbit') {
    const w = screenToWorld(cx, cy); spawnBurst(w.x, w.y, 46); buzz(12);
  }
});

/* mute */
$('#mute').addEventListener('click', function (ev) {
  ev.stopPropagation();
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* hooks for testing */
window.__galaxy = {
  state,
  get wishes() { return state.wishesLit; },
  get formed() { return state.formed; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  openLetter,
  musicPlaying: () => !music.paused,
  clusterScreen: () => [0, 1, 2].map(clusterScreen)
};

/* ================= animate ================= */
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  starUniforms.uTime.value = t; burstUniforms.uTime.value = t;
  updateScale();

  const k = state.phase === 'forming' ? 0.030 : 0.055;
  for (let i = 0; i < N; i++) {
    pos[i * 3] += (tPos[i * 3] - pos[i * 3]) * k;
    pos[i * 3 + 1] += (tPos[i * 3 + 1] - pos[i * 3 + 1]) * k;
    pos[i * 3 + 2] += (tPos[i * 3 + 2] - pos[i * 3 + 2]) * k;
    col[i * 3] += (tCol[i * 3] - col[i * 3]) * 0.06;
    col[i * 3 + 1] += (tCol[i * 3 + 1] - col[i * 3 + 1]) * 0.06;
    col[i * 3 + 2] += (tCol[i * 3 + 2] - col[i * 3 + 2]) * 0.06;
    siz[i] += (tSiz[i] - siz[i]) * 0.06;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.aColor.needsUpdate = true;
  geo.attributes.aSize.needsUpdate = true;

  /* gentle idle drift */
  if (state.phase === 'wishes') { group.position.y = Math.sin(t * 0.35) * 0.7; }
  if (state.phase === 'orbit') { group.rotation.y += dt * 0.05; }
  group.rotation.y += ((state.phase === 'orbit' ? group.rotation.y : rotTY) - group.rotation.y) * 0.06;
  group.rotation.x += (rotTX - group.rotation.x) * 0.06;
  if (state.phase !== 'orbit' && !pDown) { rotTY *= 0.995; rotTX *= 0.995; }

  /* bursts physics */
  let anyBurst = false;
  for (let i = 0; i < BN; i++) {
    if (bLife[i] <= 0) continue;
    anyBurst = true;
    bLife[i] -= dt * 1.15;
    bPos[i * 3] += bVel[i * 3] * dt; bPos[i * 3 + 1] += bVel[i * 3 + 1] * dt;
    bVel[i * 3 + 1] -= 3.2 * dt;
    bVel[i * 3] *= 0.985; bVel[i * 3 + 1] *= 0.985;
    if (bLife[i] <= 0) bSiz[i] = 0;
  }
  if (anyBurst) { bGeo.attributes.position.needsUpdate = true; bGeo.attributes.aColor.needsUpdate = true; bGeo.attributes.aSize.needsUpdate = true; }

  if (state.phase === 'wishes') placeMarks();
  if (state.phase === 'forming') checkFormed();
  renderer.render(scene, camera);
}
updateScale();
animate();
