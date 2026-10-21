/* Thiên Hà Điều Ước 3D — bản 23. Three.js: thiên hà xoắn ốc nhiều lớp sao →
   thắp 3 cụm điều ước → giữ gom sao → lặng → sao hợp thành chữ → nổ → thư + vòng hoa sao. */
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
{ /* nền trời hoàng hôn vũ trụ: gradient canvas tự vẽ */
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#0C0818'); gr.addColorStop(.45, '#180F2C'); gr.addColorStop(.72, '#251434'); gr.addColorStop(1, '#2E1A33');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(c); scene.background = tex;
}
const camera = new THREE.PerspectiveCamera(58, W / H, .1, 400);
const camState = { az: .0, pol: 1.08, rad: 96, tAz: 0, tPol: 1.08, tRad: 58, cx: 0, cy: 0 };
function applyCam() {
  const sp = Math.sin(camState.pol), x = camState.rad * sp * Math.sin(camState.az);
  camera.position.set(x, camState.rad * Math.cos(camState.pol), camState.rad * sp * Math.cos(camState.az));
  camera.lookAt(camState.cx, camState.cy, 0);
}
applyCam();

/* bloom (nền tối nên bloom an toàn, không thổi trắng như cảnh pastel sáng) */
let composer = null;
try {
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));
  const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .45, .5, .3);
  composer.addPass(bloom);
} catch (e) { composer = null; }

/* ---------------- textures tự tạo ---------------- */
function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const starTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,220,200,.45)');
const dustTex = glowTexture('rgba(255,190,200,.55)', 'rgba(200,130,190,.18)');

/* ---------------- thiên hà ---------------- */
const galaxy = new THREE.Group(); scene.add(galaxy);
galaxy.rotation.x = -.18;
const STAR_N = 7600;
const gPos = new Float32Array(STAR_N * 3), gCol = new Float32Array(STAR_N * 3), gSize = new Float32Array(STAR_N);
const homePos = new Float32Array(STAR_N * 3);       /* vị trí gốc trong thiên hà */
const targetPos = new Float32Array(STAR_N * 3);     /* đích khi morph */
const hasTarget = new Uint8Array(STAR_N);
const cCore = new THREE.Color('#FFE9BC'), cMid = new THREE.Color('#FFB7C9'), cArm = new THREE.Color('#F79EC1'), cFar = new THREE.Color('#C9A7E8'), tmpC = new THREE.Color();
for (let i = 0; i < STAR_N; i++) {
  const arm = i % 3, r = Math.pow(Math.random(), .62) * 30 + 1.2;
  const ang = arm * (Math.PI * 2 / 3) + r * .235 + (Math.random() - .5) * .5 * (1 - r / 34);
  const thick = (1 - r / 33) * 2.6 + .35;
  const x = Math.cos(ang) * r + (Math.random() - .5) * 1.6;
  const z = Math.sin(ang) * r + (Math.random() - .5) * 1.6;
  const y = (Math.random() - .5) * thick * 2;
  homePos.set([x, y, z], i * 3);
  gPos.set([x, y, z], i * 3);
  const t = r / 31;
  tmpC.copy(cCore).lerp(t < .5 ? cMid : cArm, t < .5 ? t * 2 : (t - .5) * 2);
  if (Math.random() < .14) tmpC.lerp(cFar, .6);
  const b = .5 + Math.random() * .35;
  gCol.set([tmpC.r * b, tmpC.g * b, tmpC.b * b], i * 3);
  gSize[i] = (Math.random() < .06 ? 2.8 : 1.25) + Math.random() * 1.0;
}
const gGeo = new THREE.BufferGeometry();
gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3));
gGeo.setAttribute('color', new THREE.BufferAttribute(gCol, 3));
gGeo.setAttribute('size', new THREE.BufferAttribute(gSize, 1));
const gMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: starTex }, uScale: { value: H * .5 }, uOpacity: { value: 1 } },
  vertexShader: 'attribute float size; varying vec3 vC; uniform float uScale;' +
    'void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
    ' gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC;' +
    'void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t * uOpacity; }',
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
});
const stars = new THREE.Points(gGeo, gMat); galaxy.add(stars);

/* lõi sáng trung tâm */
const coreSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFD9A8, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
coreSprite.scale.set(14, 14, 1); galaxy.add(coreSprite);

/* bụi tinh vân: sprite lớn mờ, tạo khối cho thiên hà */
const dustGroup = new THREE.Group(); galaxy.add(dustGroup);
{
  const cols = [0xD98AA8, 0xE8A87C, 0xD98AA8, 0xC98BA6];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.SpriteMaterial({ map: dustTex, color: cols[i % 4], transparent: true, opacity: .03 + Math.random() * .03, blending: THREE.AdditiveBlending, depthWrite: false });
    const s = new THREE.Sprite(m);
    const r = 3 + Math.random() * 26, a = Math.random() * 6.283;
    s.position.set(Math.cos(a) * r, (Math.random() - .5) * 3.4, Math.sin(a) * r);
    const sc = 5 + Math.random() * 7; s.scale.set(sc, sc, 1);
    dustGroup.add(s);
  }
}
function randDir(scale) {
  const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u);
  return new THREE.Vector3(s * Math.cos(th) * scale, u * scale, s * Math.sin(th) * scale);
}
/* sao xa nền (vỏ cầu) */
{
  const n = 1300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = randDir(150 + Math.random() * 60);
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ size: .85, map: starTex, color: 0xD9C8F2, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  scene.add(new THREE.Points(geo, mat));
}

/* ---------------- 3 cụm điều ước ---------------- */
const WISHES = [
  { name: 'Sức khỏe', ang: .5, r: 17 },
  { name: 'Bình an', ang: 2.6, r: 20 },
  { name: 'Hạnh phúc', ang: 4.7, r: 15 }
];
const wishGroups = [];
for (const wsh of WISHES) {
  const grp = new THREE.Group();
  const n = 130, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  const cc = new THREE.Color('#8A7396');
  for (let i = 0; i < n; i++) {
    const v = randDir(Math.pow(Math.random(), .5) * 2.6);
    pos.set([v.x, v.y * .6, v.z], i * 3);
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const mat = new THREE.PointsMaterial({ size: .85, map: starTex, vertexColors: true, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false });
  grp.add(new THREE.Points(geo, mat));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFC98F, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  glow.scale.set(13, 13, 1); grp.add(glow);
  grp.position.set(Math.cos(wsh.ang) * wsh.r, 0, Math.sin(wsh.ang) * wsh.r);
  galaxy.add(grp);
  wishGroups.push({ ...wsh, grp, geo, mat, glow, lit: false, litT: 0, center: grp.position.clone() });
}

/* vòng hoa sao ở finale: sprite hoa thật bay quanh */
const flowerRing = new THREE.Group(); flowerRing.visible = false; scene.add(flowerRing);
{
  const loader = new THREE.TextureLoader();
  const files = ['assets/img/rose.webp', 'assets/img/peony.webp'];
  files.forEach((f, fi) => loader.load(f, tex => {
    for (let i = 0; i < 7; i++) {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false });
      const s = new THREE.Sprite(m);
      const a = (fi * 7 + i) / 14 * Math.PI * 2;
      s.position.set(Math.cos(a) * 24, Math.sin(a) * 10, Math.sin(a) * 5 - 12);
      const sc = 3 + Math.random() * 1.3; s.scale.set(sc, sc, 1);
      s.userData.a = a;
      flowerRing.add(s);
    }
  }));
}

/* ---------------- chữ bằng sao (sampling từ canvas chữ của mình) ---------------- */
function sampleTextPoints() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 460;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 460);
  g.fillStyle = '#FFF'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 148px "Playfair Display", Georgia, serif';
  g.fillText('CHÚC MỪNG', 512, 118);
  g.fillText('SINH NHẬT', 512, 322);
  const img = g.getImageData(0, 0, 1024, 460).data, pts = [];
  for (let y = 0; y < 460; y += 4) for (let x = 0; x < 1024; x += 4) {
    if (img[(y * 1024 + x) * 4] > 110 && Math.random() < .65) {
      pts.push([(x - 512) / 1024 * 34, (230 - y) / 460 * 15.3, (Math.random() - .5) * 1.1]);
    }
  }
  return pts;
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', wishes: 0, morphT0: 0, burstT0: 0, armAt: 0, quietT0: 0, finaleT0: 0 };
let holdStart = 0, holdX = 0, holdY = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'explore';
  camState.tRad = 76; camState.tPol = .82;
  setHint('Kéo để bay quanh, chạm cụm sao mờ để thắp ước');
  buzz(20);
}
function lightWish(i, viaTap) {
  const wsh = wishGroups[i];
  if (!wsh || wsh.lit || state.phase !== 'explore') return;
  wsh.lit = true; wsh.litT = performance.now(); state.wishes++;
  const colAttr = wsh.geo.getAttribute('color');
  const cc = new THREE.Color('#FFD98F');
  for (let j = 0; j < colAttr.count; j++) colAttr.setXYZ(j, cc.r * (0.8 + Math.random() * .5), cc.g * (0.8 + Math.random() * .4), cc.b * .8);
  colAttr.needsUpdate = true;
  wsh.mat.opacity = 1;
  const lbl = $('#wishLabel'); lbl.textContent = wsh.name; lbl.classList.add('show');
  setTimeout(() => lbl.classList.remove('show'), 1500);
  playSfx(sChime); buzz([30, 40, 30]);
  if (state.wishes >= 3) setHint('Giữ yên một lúc để gom sao thành điều chúc…');
  else setHint('Đã thắp ' + state.wishes + '/3 điều ước — tìm tiếp nhé');
}
function beginQuiet() {
  if (state.phase !== 'explore' || state.wishes < 3) return;
  state.phase = 'quiet'; state.quietT0 = performance.now();
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginMorph, 1000);            /* khoảng lặng gần đứng yên trước đỉnh */
}
const morphFrom = new Float32Array(STAR_N * 3);
let morphStartYaw = 0, morphTargetYaw = 0, morphStartTilt = 0;
function beginMorph() {
  if (state.phase !== 'quiet') return;
  const pts = sampleTextPoints();
  for (let i = 0; i < STAR_N; i++) {
    if (i < pts.length) { targetPos.set(pts[i], i * 3); hasTarget[i] = 1; }
    else {
      /* sao thừa: xếp thành vòng hào quang trong MẶT PHẲNG CHỮ — không nằm ở đĩa XZ nữa */
      const a = Math.random() * 6.283, rx = 25 + Math.random() * 7, ry = 14 + Math.random() * 4.5;
      targetPos.set([Math.cos(a) * rx, Math.sin(a) * ry, (Math.random() - .5) * 3], i * 3);
      hasTarget[i] = 2;
    }
  }
  /* morph theo TIẾN ĐỘ THỜI GIAN (không theo số frame) → máy chậm hay nhanh đều khớp đích */
  morphFrom.set(gGeo.getAttribute('position').array);
  morphStartYaw = galaxy.rotation.y;
  morphTargetYaw = Math.round(galaxy.rotation.y / 6.2832) * 6.2832;
  morphStartTilt = galaxy.rotation.x;
  state.phase = 'morph'; state.morphT0 = performance.now();
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([25, 40, 25]);
}
function formText() {
  state.phase = 'text';
  camState.tRad = 58; camState.tPol = 1.45; camState.tAz = 0; camState.cx = 0; camState.cy = 1;
  setHint('Chạm vào dòng chữ sao nhé');
  buzz([35, 50, 35]);
}
function burstText() {
  if (state.phase !== 'text') return;
  state.phase = 'burst'; state.burstT0 = performance.now();
  const fl = $('#flash'); fl.style.opacity = .85; setTimeout(() => fl.style.opacity = 0, 160);
  playSfx(sShimmer); buzz([60, 40, 140]);
  setTimeout(showFinale, 1900);
}
function showFinale() {
  if (state.phase !== 'burst') return;
  state.phase = 'finale'; state.finaleT0 = performance.now();
  flowerRing.visible = true;
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  camState.tRad = 54; camState.tPol = 1.15; camState.cy = 0;
  setHint('Một lá thư đang chờ chị mở');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Đêm nay em nhờ cả dải ngân hà giữ hộ một điều chúc, gửi tới chị.',
  'Sức khỏe, để chị rạng rỡ như sao mai, bền bỉ qua mọi mùa.',
  'Bình an, để giữa bao bận rộn, lòng chị vẫn có một khoảng trời yên.',
  'Hạnh phúc, lấp lánh trong cả những điều nhỏ nhất mỗi ngày.',
  'Và mong tuổi mới của chị sáng như đêm sao đẹp nhất —',
  'vừa đủ gần để ấm, vừa đủ xa để mơ.'
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

/* ---------------- input: kéo orbit / chạm / giữ ---------------- */
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
  if (state.phase === 'explore' && state.wishes >= 3) {
    holdStart = performance.now(); holdX = e.clientX; holdY = e.clientY;
    ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px'; ring.classList.remove('hidden');
  }
});
stage.addEventListener('pointermove', e => {
  const p = pointers.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  dragMoved += Math.abs(dx) + Math.abs(dy);
  if (dragMoved > 7 && holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (pointers.size === 1 && (state.phase === 'explore' || state.phase === 'finale' || state.phase === 'letter')) {
    camState.tAz -= dx * .005;
    camState.tPol = Math.max(.25, Math.min(2.6, camState.tPol - dy * .004));
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinchD > 0) camState.tRad = Math.max(30, Math.min(95, camState.tRad - (d - pinchD) * .25));
    pinchD = d;
  }
});
function endPointer(e) {
  const wasTap = dragMoved <= 7 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (!wasTap) return;
  if (state.phase === 'explore') {
    /* chạm: thử thắp cụm điều ước gần điểm chạm nhất trên màn hình */
    let best = -1, bestD = 90;
    wishGroups.forEach((wsh, i) => {
      if (wsh.lit) return;
      const v = wsh.center.clone(); galaxy.localToWorld(v); v.project(camera);
      const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
      const d = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best >= 0) lightWish(best, true);
  } else if (state.phase === 'text') {
    burstText();
  }
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

/* ---------------- vòng lặp render ---------------- */
let lastT = performance.now(), rotSpeed = .016;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;

  /* tốc độ quay theo pha: lặng = gần đứng yên */
  let targetRot = .016;
  if (state.phase === 'intro') targetRot = .02;
  if (state.phase === 'quiet') targetRot = .0008;
  if (state.phase === 'morph' || state.phase === 'text') targetRot = 0;
  if (state.phase === 'finale' || state.phase === 'letter') targetRot = .004;
  rotSpeed += (targetRot - rotSpeed) * Math.min(1, dt * 2.2);
  galaxy.rotation.y += rotSpeed * dt * 10 * .16;

  /* morph: sao bay về điểm chữ; burst: sao văng ra; finale: sao trôi về nhà */
  if (state.phase === 'morph' || state.phase === 'text' || state.phase === 'burst' || state.phase === 'finale' || state.phase === 'letter') {
    const posAttr = gGeo.getAttribute('position'), arr = posAttr.array;
    if (state.phase === 'morph') {
      const p01 = Math.min(1, (now - state.morphT0) / 2600), e = 1 - Math.pow(1 - p01, 3);
      galaxy.rotation.y = morphStartYaw + (morphTargetYaw - morphStartYaw) * e;
      galaxy.rotation.x = morphStartTilt * (1 - e);
      for (let i = 0; i < STAR_N; i++) {
        const j = i * 3;
        arr[j] = morphFrom[j] + (targetPos[j] - morphFrom[j]) * e;
        arr[j + 1] = morphFrom[j + 1] + (targetPos[j + 1] - morphFrom[j + 1]) * e;
        arr[j + 2] = morphFrom[j + 2] + (targetPos[j + 2] - morphFrom[j + 2]) * e;
      }
      if (p01 >= 1 && now - state.morphT0 > 2900) formText();
    } else if (state.phase === 'text') {
      /* chữ thở nhẹ: nhấp nháy theo sóng */
      gMat.uniforms.uOpacity.value = .94 + Math.sin(now * .0022) * .06;
    } else if (state.phase === 'burst') {
      const el = (now - state.burstT0) / 1000;
      for (let i = 0; i < STAR_N; i++) {
        if (hasTarget[i] !== 1) continue;
        const j = i * 3;
        const vx = targetPos[j] * .9, vy = targetPos[j + 1] * .9 + 6, vz = 14 + (i % 7);
        arr[j] += vx * dt * (0.4 + el); arr[j + 1] += (vy - el * el * 9) * dt; arr[j + 2] += vz * dt * (0.4 + el);
      }
      gMat.uniforms.uOpacity.value = Math.max(0, 1 - el / 2.4);
    } else { /* finale / letter: sao mờ dần về vị trí nhà, vòng hoa hiện */
      gMat.uniforms.uOpacity.value += (.34 - gMat.uniforms.uOpacity.value) * dt * .8;
      const posAttr2 = posAttr.array;
      for (let i = 0; i < STAR_N; i++) {
        const j = i * 3;
        posAttr2[j] += (homePos[j] - posAttr2[j]) * dt * .35;
        posAttr2[j + 1] += (homePos[j + 1] - posAttr2[j + 1]) * dt * .35;
        posAttr2[j + 2] += (homePos[j + 2] - posAttr2[j + 2]) * dt * .35;
      }
      galaxy.rotation.x += (-.18 - galaxy.rotation.x) * dt * .8;
      flowerRing.rotation.z = now * .00004;
      flowerRing.rotation.y = Math.sin(now * .00012) * .3;
    }
    posAttr.needsUpdate = true;
  }

  /* cỡ sao: thu nhỏ khi hợp thành chữ để nét chữ không dính vào nhau */
  const targetScale = (state.phase === 'morph' || state.phase === 'text') ? H * .30 : H * .5;
  gMat.uniforms.uScale.value += (targetScale - gMat.uniforms.uScale.value) * Math.min(1, dt * 2);

  /* cụm điều ước: hào quang khi đã thắp; tới pha chữ thì lặng lẽ rút lui */
  const wishDim = (state.phase === 'morph' || state.phase === 'text' || state.phase === 'burst') ? 0 : 1;
  for (const wsh of wishGroups) {
    const base = wsh.lit ? 1 : .55;
    wsh.mat.opacity += ((base * wishDim) - wsh.mat.opacity) * Math.min(1, dt * 2);
    if (wsh.lit) {
      const e = Math.min(1, (now - wsh.litT) / 900);
      wsh.glow.material.opacity = e * (.5 + Math.sin(now * .003) * .14) * wishDim;
      wsh.grp.rotation.y += dt * .25;
    }
  }
  const coreTarget = (state.phase === 'morph' || state.phase === 'text' || state.phase === 'burst') ? .08 : .55 + Math.sin(now * .0016) * .12;
  coreSprite.material.opacity += (coreTarget - coreSprite.material.opacity) * Math.min(1, dt * 2);

  /* giữ để gom sao */
  if (holdStart && state.phase === 'explore') {
    const pr = (now - holdStart) / HOLD_MS;
    rfg.style.strokeDashoffset = CIRC * (1 - Math.min(1, pr));
    galaxy.rotation.y += dt * pr * 1.4;      /* xoáy nhanh dần khi gom */
    if (pr >= 1) beginQuiet();
  }

  /* camera: nội suy mềm về đích */
  camState.az += (camState.tAz - camState.az) * Math.min(1, dt * 5);
  camState.pol += (camState.tPol - camState.pol) * Math.min(1, dt * 5);
  camState.rad += (camState.tRad - camState.rad) * Math.min(1, dt * 2.2);
  camState.cx += ((state.phase === 'text' ? 0 : 0) - camState.cx) * dt * 2;
  applyCam();

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) document.fonts.load('800 148px "Playfair Display"');

/* ---------------- hooks kiểm thử ---------------- */
window.__galaxy3 = {
  get phase() { return state.phase; },
  get wishes() { return state.wishes; },
  start, lightWish, beginQuiet, openLetter,
  get textFormed() { return state.phase === 'text' || state.phase === 'burst' || state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
