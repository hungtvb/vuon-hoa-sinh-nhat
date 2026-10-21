/* Trái Tim Ngàn Hoa 3D — bản 24. Three.js: trái tim hạt hoa/sao xoay 360°,
   đập lub-dub → nạp 3 cánh điều ước → giữ cho tim đập dồn → lặng → tim nở bung
   thành vòng hoa → thư ở vùng lặng tại tâm. Mọi morph chạy theo tiến độ thời gian. */
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
{ /* nền đêm rượu hoa hồng ấm: gradient canvas tự vẽ */
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 512);
  gr.addColorStop(0, '#160A18'); gr.addColorStop(.45, '#2A1022'); gr.addColorStop(.75, '#3D152A'); gr.addColorStop(1, '#2A0F1E');
  g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
  scene.background = new THREE.CanvasTexture(c);
}
const camera = new THREE.PerspectiveCamera(55, W / H, .1, 400);
const camState = { az: 0, pol: 1.25, rad: 95, tAz: 0, tPol: 1.25, tRad: 52 };
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
  composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(W, H), .42, .55, .28));
} catch (e) { composer = null; }

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(.35, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const starTex = glowTexture('rgba(255,255,255,1)', 'rgba(255,210,200,.45)');
const dustTex = glowTexture('rgba(255,180,190,.5)', 'rgba(220,110,150,.16)');

/* sao nền xa */
{
  const n = 900, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1, th = Math.random() * 6.283, s = Math.sqrt(1 - u * u), r = 150 + Math.random() * 70;
    pos.set([s * Math.cos(th) * r, u * r, s * Math.sin(th) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .9, map: starTex, color: 0xE8C8D8, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false })));
}

/* ---------------- trái tim hạt ----------------
   Hàm tim ẩn: f(x,y,z) = (x² + 9/4·z² + y² − 1)³ − x²y³ − 9/80·z²y³.
   Lấy mẫu: điểm trong hộp, giữ điểm gần mặt f≈0 (vỏ) + điểm trong ruột f<0 rải thưa. */
function heartF(x, y, z) {
  const a = x * x + 2.25 * z * z + y * y - 1;
  return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
}
const HN = 3400;
const hPos = new Float32Array(HN * 3), hCol = new Float32Array(HN * 3), hSize = new Float32Array(HN);
const homePos = new Float32Array(HN * 3), bloomPos = new Float32Array(HN * 3), fromPos = new Float32Array(HN * 3);
const cShell = [new THREE.Color('#FFB7C9'), new THREE.Color('#FF8FAB'), new THREE.Color('#FB6F92'), new THREE.Color('#FFD9A0'), new THREE.Color('#FFF0E6')];
const tmpC = new THREE.Color();
{
  let placed = 0, guard = 0;
  while (placed < HN && guard++ < 400000) {
    const x = (Math.random() * 2 - 1) * 1.25, y = (Math.random() * 2 - 1) * 1.25, z = (Math.random() * 2 - 1) * 1.25;
    const f = heartF(x, y, z);
    const isShell = Math.abs(f) < .055, isCore = f < -.02 && Math.random() < .16;
    if (!isShell && !isCore) continue;
    /* hàm tim Taubin đã có núm hướng xuống theo +y — KHÔNG lật y */
    const S = 11.5;
    homePos.set([x * S, y * S - 0.8, z * S], placed * 3);
    /* đích nở bung: vòng hoa elip quanh tâm + rải sao xa */
    const a = Math.random() * 6.283, ring = Math.random() < .72;
    if (ring) bloomPos.set([Math.cos(a) * (17.5 + Math.random() * 4), Math.sin(a) * (11 + Math.random() * 3), (Math.random() - .5) * 5 - 2], placed * 3);
    else bloomPos.set([(Math.random() - .5) * 56, (Math.random() - .5) * 34, -8 - Math.random() * 22], placed * 3);
    tmpC.copy(cShell[placed % 3 === 0 ? 2 : (Math.random() < .5 ? 0 : 1)]);
    if (Math.random() < .12) tmpC.copy(cShell[3]); else if (Math.random() < .07) tmpC.copy(cShell[4]);
    const b = isShell ? (.62 + Math.random() * .4) : (.34 + Math.random() * .25);
    hCol.set([tmpC.r * b, tmpC.g * b, tmpC.b * b], placed * 3);
    hSize[placed] = isShell ? 1.5 + Math.random() * 1.2 : 1.1 + Math.random() * .8;
    placed++;
  }
  hPos.set(homePos);
}
const hGeo = new THREE.BufferGeometry();
hGeo.setAttribute('position', new THREE.BufferAttribute(hPos, 3));
hGeo.setAttribute('color', new THREE.BufferAttribute(hCol, 3));
hGeo.setAttribute('size', new THREE.BufferAttribute(hSize, 1));
const hMat = new THREE.ShaderMaterial({
  uniforms: { uTex: { value: starTex }, uScale: { value: H * .5 }, uOpacity: { value: 1 } },
  vertexShader: 'attribute float size; varying vec3 vC; uniform float uScale;' +
    'void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
    ' gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }',
  fragmentShader: 'uniform sampler2D uTex; uniform float uOpacity; varying vec3 vC;' +
    'void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC, 1.0) * t * uOpacity; }',
  blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, vertexColors: true
});
const heartGroup = new THREE.Group(); scene.add(heartGroup);
heartGroup.add(new THREE.Points(hGeo, hMat));
/* quầng sáng tâm tim */
const heartGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFF9DB4, transparent: true, opacity: .34, blending: THREE.AdditiveBlending, depthWrite: false }));
heartGlow.scale.set(30, 30, 1); heartGroup.add(heartGlow);
/* hoa thật bám trên mặt tim: lấy vị trí từ chính các hạt vỏ phía trước → rải đều khắp mặt */
const surfaceFlowers = [];
{
  const front = [];
  for (let i = 0; i < HN; i++) if (homePos[i * 3 + 2] > 3.5) front.push(i);
  const loader = new THREE.TextureLoader();
  ['assets/img/rose.webp', 'assets/img/peony.webp'].forEach(f => loader.load(f, tex => {
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      const src = front[Math.floor(Math.random() * front.length)] * 3;
      s.position.set(homePos[src] + (Math.random() - .5) * 1.4, homePos[src + 1] + (Math.random() - .5) * 1.4, homePos[src + 2] + 1.1);
      const sc = 1.9 + Math.random() * .8; s.scale.set(sc, sc, 1);
      heartGroup.add(s); surfaceFlowers.push(s);
    }
  }));
}

/* ---------------- 3 cánh hoa điều ước bay quanh ---------------- */
const WISHES = ['Sức khỏe', 'Bình an', 'Hạnh phúc'];
const wishSprites = [];
{
  const loader = new THREE.TextureLoader();
  WISHES.forEach((name, i) => {
    loader.load('assets/img/petal.webp', tex => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: .95, depthWrite: false }));
      s.scale.set(3.2, 3.2, 1);
      s.userData = { name, idx: i, ang: i * 2.094, caught: false, flyT: 0 };
      scene.add(s); wishSprites.push(s);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustTex, color: 0xFFC98F, transparent: true, opacity: .22, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.set(9, 9, 1); s.add(halo);
    });
  });
}

/* ---------------- state + luồng ---------------- */
const state = { phase: 'intro', wishes: 0, armAt: 0, morphT0: 0, bloomT0: 0, chargeGlow: 0 };
let holdStart = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'awake';
  camState.tRad = 47; camState.tPol = 1.22;
  setHint('Kéo để xoay quanh tim, chạm 3 cánh hoa bay');
  buzz(20);
}
function catchWish(i) {
  const s = wishSprites[i];
  if (!s || s.userData.caught || state.phase !== 'awake') return;
  s.userData.caught = true; s.userData.flyT = performance.now();
  state.wishes++;
  const lbl = $('#wishLabel'); lbl.textContent = s.userData.name; lbl.classList.add('show');
  setTimeout(() => lbl.classList.remove('show'), 1500);
  playSfx(sChime); buzz([30, 40, 30]);
  state.chargeGlow = Math.min(1, state.chargeGlow + .34);
  if (state.wishes >= 3) setHint('Giữ yên để tim đập dồn… rồi buông tay ra nhé');
  else setHint('Đã nạp ' + state.wishes + '/3 điều ước — đuổi theo cánh hoa tiếp theo');
}
function beginQuiet() {
  if (state.phase !== 'awake' || state.wishes < 3) return;
  state.phase = 'quiet';
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  try { music.volume = .35; } catch (e) {}
  setTimeout(beginBloom, 1050);
}
function beginBloom() {
  if (state.phase !== 'quiet') return;
  fromPos.set(hGeo.getAttribute('position').array);
  state.phase = 'bloom'; state.morphT0 = performance.now();
  try { music.volume = 1; } catch (e) {}
  playSfx(sShimmer); buzz([35, 50, 35, 50, 120]);
  camState.tRad = 52; camState.tPol = 1.3;
}
function showFinale() {
  state.phase = 'finale'; state.bloomT0 = performance.now();
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;
  const fl = $('#flash'); fl.style.opacity = .5; setTimeout(() => fl.style.opacity = 0, 180);
  setHint('Một lá thư đang chờ ở giữa vòng hoa');
}

/* ---------------- thư ---------------- */
const LETTER = [
  'Có những điều khó nói thành lời, em gói hết vào một trái tim.',
  'Trái tim này có ba nhịp dành cho chị: một nhịp cho sức khỏe,',
  'một nhịp cho những ngày thật bình an,',
  'và một nhịp cho hạnh phúc cứ ghé hoài, không chịu đi.',
  'Dù ở đâu, chị hãy nhớ luôn có một nhịp đập ở đây, dành cho chị.',
  'Chúc chị tuổi mới nở rộ như hoa đúng mùa — rực rỡ theo cách rất riêng của chị.'
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
  if (state.phase === 'awake' && state.wishes >= 3) {
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
    if (pinchD > 0) camState.tRad = Math.max(24, Math.min(80, camState.tRad - (d - pinchD) * .22));
    pinchD = d;
  }
});
function endPointer(e) {
  const wasTap = dragMoved <= 7 && pointers.size === 1;
  pointers.delete(e.pointerId);
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
  if (!wasTap || state.phase !== 'awake') return;
  let best = -1, bestD = 95;
  wishSprites.forEach((s, i) => {
    if (s.userData.caught) return;
    const v = s.position.clone().project(camera);
    const sx = (v.x * .5 + .5) * W, sy = (-v.y * .5 + .5) * H;
    const d = Math.hypot(sx - e.clientX, sy - e.clientY);
    if (d < bestD) { bestD = d; best = i; }
  });
  if (best >= 0) catchWish(best);
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

/* nhịp tim lub-dub: hai cú đập mỗi chu kỳ */
function beatPulse(t, rate) {
  const cyc = (t * rate) % 1;
  const lub = Math.exp(-Math.pow((cyc - .08) * 9, 2));
  const dub = Math.exp(-Math.pow((cyc - .3) * 11, 2)) * .65;
  return lub + dub;
}

/* ---------------- vòng lặp ---------------- */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
  const t = now / 1000;

  /* nhịp + biên độ theo pha */
  let rate = .72, amp = .045;
  if (state.phase === 'intro') { rate = .55; amp = .03; }
  if (holdStart && state.phase === 'awake') { rate = 1.7; amp = .07; }
  if (state.phase === 'quiet') { rate = .3; amp = .006; }
  if (state.phase === 'bloom' || state.phase === 'finale' || state.phase === 'letter') { rate = .5; amp = .012; }
  const beat = beatPulse(t, rate);
  const holdPr = holdStart ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
  const glow = .3 + state.chargeGlow * .3 + beat * .18 + holdPr * .3;
  heartGlow.material.opacity = Math.min(.85, glow);
  const sc = 1 + beat * amp + holdPr * .05;
  heartGroup.scale.set(sc, sc, sc);
  heartGroup.rotation.y += dt * (state.phase === 'quiet' ? .02 : .12);
  heartGroup.rotation.x = Math.sin(t * .22) * .07;

  /* cánh hoa điều ước: bay lượn quanh tim; đã bắt thì bay vào tâm và tan */
  for (const s of wishSprites) {
    const u = s.userData;
    if (u.caught) {
      const e = Math.min(1, (now - u.flyT) / 700);
      s.position.lerp(new THREE.Vector3(0, 0, 0), .18);
      const k = 3.2 * (1 - e); s.scale.set(Math.max(.01, k), Math.max(.01, k), 1);
      s.material.opacity = 1 - e;
      if (e >= 1) s.visible = false;
    } else {
      u.ang += dt * .34;
      const R = 19.5;
      s.position.set(Math.cos(u.ang) * R, Math.sin(u.ang * 1.7) * 5.5, Math.sin(u.ang) * R);
      s.material.rotation = t * .6 + u.idx;
    }
  }

  /* giữ để qua lặng */
  if (holdStart && state.phase === 'awake') {
    rfg.style.strokeDashoffset = CIRC * (1 - holdPr);
    if (holdPr >= 1) beginQuiet();
  }

  /* nở bung theo tiến độ thời gian */
  if (state.phase === 'bloom') {
    const p01 = Math.min(1, (now - state.morphT0) / 2400), e = 1 - Math.pow(1 - p01, 3);
    const arr = hGeo.getAttribute('position').array;
    for (let i = 0; i < HN; i++) {
      const j = i * 3;
      arr[j] = fromPos[j] + (bloomPos[j] - fromPos[j]) * e;
      arr[j + 1] = fromPos[j + 1] + (bloomPos[j + 1] - fromPos[j + 1]) * e;
      arr[j + 2] = fromPos[j + 2] + (bloomPos[j + 2] - fromPos[j + 2]) * e;
    }
    hGeo.getAttribute('position').needsUpdate = true;
    heartGlow.material.opacity = .3 * (1 - e);
    for (const s of surfaceFlowers) s.material.opacity = .95 * (1 - e);
    if (p01 >= 1) showFinale();
  } else if (state.phase === 'finale' || state.phase === 'letter') {
    heartGroup.rotation.y += dt * .06;
  }

  camState.az += (camState.tAz - camState.az) * Math.min(1, dt * 5);
  camState.pol += (camState.tPol - camState.pol) * Math.min(1, dt * 5);
  camState.rad += (camState.tRad - camState.rad) * Math.min(1, dt * 2.2);
  applyCam();

  if (composer) composer.render(); else renderer.render(scene, camera);
}
requestAnimationFrame(frame);

/* ---------------- hooks kiểm thử ---------------- */
window.__heart3d = {
  get phase() { return state.phase; },
  get wishes() { return state.wishes; },
  start, catchWish, beginQuiet, openLetter,
  get bloomed() { return state.phase === 'finale' || state.phase === 'letter'; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
