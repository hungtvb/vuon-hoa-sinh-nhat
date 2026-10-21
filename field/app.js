'use strict';
/* Gieo Một Mùa Hoa — one continuous meadow where a single flower lives its whole life:
   sow (tap) -> rain (drag clouds) -> sun (hold) -> the held breath -> the great bloom -> the letter.
   The meadow, the light and the plant are never reset between beats. */

const world = document.getElementById('world');
const wctx = world.getContext('2d');
const front = document.getElementById('front');
const fctx = front.getContext('2d');
const lineEl = document.getElementById('line');
const letterEl = document.getElementById('letter');
const replayBtn = document.getElementById('replay');
const music = document.getElementById('music');
const shimmer = document.getElementById('shimmer');
const chime = document.getElementById('chime');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;

function loadImg(src) { const i = new Image(); i.src = src; return i; }
const imgBackdrop = loadImg('assets/img/backdrop.jpg');
const imgBud = loadImg('assets/img/bud.webp');
const imgOpen = loadImg('assets/img/open.webp');
const imgPetal = loadImg('assets/img/petal.webp');

function glowSprite(r, g, b) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.25, `rgba(${r},${g},${b},0.85)`);
  gr.addColorStop(0.6, `rgba(${r},${g},${b},0.25)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
  return c;
}
const GLOW = {
  gold: glowSprite(255, 196, 86), cream: glowSprite(255, 232, 180),
  pink: glowSprite(255, 150, 180), white: glowSprite(240, 246, 255),
  sun: glowSprite(255, 214, 120),
};
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- layout ----------
const L = {};
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  for (const cv of [world, front]) {
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  fctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  L.cx = W * 0.5;
  L.soilY = H * 0.878;
  L.soilRx = W * 0.34;
  L.soilRy = H * 0.042;
  L.stemFull = H * 0.335;
  L.sunStart = { x: W * 0.80, y: H * 0.40 };
  L.sunEnd = { x: W * 0.74, y: H * 0.155 };
}
window.addEventListener('resize', layout);
layout();

// ---------- the field: hundreds of quiet sprouts waiting for the bloom wave ----------
const PALETTE = ['#f7a8b8', '#fbc2d4', '#ffd9a0', '#e3c6f5', '#fff3f0', '#f78fb0', '#f9e29c', '#f49ac1'];
const fieldFlowers = [];
{
  const rnd = mulberry32(4242);
  for (let i = 0; i < 190; i++) {
    const y = H * 0.585 + Math.pow(rnd(), 0.8) * H * 0.40;
    const x = rnd() * W;
    const depth = (y - H * 0.585) / (H * 0.40);
    if (Math.hypot(x - L.cx, (y - L.soilY) * 2.2) < W * 0.16) continue;   // keep the hero's clearing
    fieldFlowers.push({
      x, y, depth, size: 5 + depth * 13, hue: PALETTE[Math.floor(rnd() * PALETTE.length)],
      ph: rnd() * Math.PI * 2, bloomAt: 0, bloomed: 0,
    });
  }
}
function flowerDelay(f) { return Math.hypot(f.x - L.cx, (f.y - (L.soilY - L.stemFull)) * 1.4) / (W * 0.62) * 2.1; }

// ---------- petals (the connective tissue: eruption -> written words -> petal rain) ----------
const petals = [];
function addPetal(x, y, opt) {
  const o = opt || {};
  const p = {
    x, y, vx: o.vx || 0, vy: o.vy || 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 3,
    size: 9 + Math.random() * 13, state: o.state || 'free', tx: 0, ty: 0, ph: Math.random() * 6.28,
    tint: ['#ffffff', '#ffd7e4', '#ffc2d4', '#ffeef5'][Math.floor(Math.random() * 4)],
  };
  petals.push(p);
  if (petals.length > 950) petals.splice(0, petals.length - 950);
  return p;
}
// front layer: a few petals drifting forever after the bloom
const frontPetals = [];
for (let i = 0; i < 13; i++) frontPetals.push({ x: Math.random() * W, y: Math.random() * H, s: 8 + Math.random() * 10, vy: 12 + Math.random() * 16, ph: Math.random() * 6.28, rot: Math.random() * 6.28 });

// ---------- rain ----------
const drops = [];
const cloud = { x: -200, y: -200, active: false };

// ---------- state ----------
let phase = 'seed';           // seed | rain | sun | still | burst | settle | letter
let phaseT = 0;
let water = 0;                // 0..1 rain gathered
let sunAmt = 0;               // 0..1 sunlight gathered
let grow = 0;                 // plant growth 0..1 (eased follower of sunAmt)
let sprout = 0;               // sprout emergence after rain
let bloomT = -1;              // burst clock
let heroOpen = 0;             // hero flower opening 0..1
let flashA = 0, ringR = 0, ringA = 0;
let textFormed = false, textReleased = false;
let hintTimer = 0, started = false;
let musicVol = 0;
const pointer = { down: false, x: 0, y: 0 };

function lightLevel() {
  let l = 0.10 + water * 0.14 + sunAmt * 0.62;
  if (phase === 'burst' || phase === 'settle' || phase === 'letter') l = 1;
  return Math.min(1, l);
}
function stemHeight() { return 14 + sprout * 10 + grow * (L.stemFull - 24); }
function plantTop() {
  const sway = Math.sin(perfNow * 1.05) * 3.2 * (0.3 + grow);
  return { x: L.cx + sway, y: L.soilY - stemHeight() };
}

// ---------- floating line ----------
let lineTimer = null;
function showLine(text, holdMs) {
  lineEl.textContent = text;
  lineEl.classList.remove('hidden');
  requestAnimationFrame(() => lineEl.classList.add('show'));
  clearTimeout(lineTimer);
  lineTimer = setTimeout(() => {
    lineEl.classList.remove('show');
    setTimeout(() => lineEl.classList.add('hidden'), 1700);
  }, holdMs || 4200);
}
setTimeout(() => { if (phase === 'seed') showLine('Chạm vào đất… gieo một hạt hoa', 5200); }, 1000);

// ---------- audio (files through <audio> only) ----------
function startMusic() {
  if (started) return; started = true;
  music.volume = 0;
  music.play().catch(() => {});
}
function rampMusic(dt) {
  const target = !started ? 0 : phase === 'still' ? 0.15 : phase === 'burst' ? 0.82 : 0.68;
  musicVol += (target - musicVol) * Math.min(1, dt * 1.7);
  if (started) music.volume = Math.max(0, Math.min(1, musicVol));
}

// ---------- text made of petals ----------
function textTargets() {
  const c = document.createElement('canvas'); c.width = 720; c.height = 288;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 720, 288);
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '700 112px "Playfair Display", serif';
  x.fillText('Chúc Mừng', 360, 76);
  x.fillText('Sinh Nhật', 360, 208);
  const d = x.getImageData(0, 0, 720, 288).data;
  let pts = [];
  for (let yy = 0; yy < 288; yy += 5) for (let xx = 0; xx < 720; xx += 5) {
    if (d[(yy * 720 + xx) * 4] > 120) pts.push({ x: xx / 720, y: yy / 288 });
  }
  if (pts.length > 880) { const step = pts.length / 880; const capped = []; for (let i = 0; i < 880; i++) capped.push(pts[Math.floor(i * step)]); pts = capped; }
  const tw = Math.min(W * 0.95, 680), th = tw * 0.4;
  const ox = L.cx - tw / 2, oy = H * 0.048;
  return pts.map(p => ({ x: ox + p.x * tw, y: oy + p.y * th }));
}

// ---------- interaction ----------
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e) => {
  startMusic();
  pointer.down = true; pointer.x = e.clientX; pointer.y = e.clientY;
  if (phase === 'seed') {
    if (e.clientY > H * 0.45) {
      phase = 'rain'; phaseT = 0; hintTimer = 0;
      for (let i = 0; i < 18; i++) addPetal(L.cx, L.soilY - 4, { vx: 0, vy: 0, state: 'spark' });
      showLine('Kéo tay qua bầu trời… gọi mưa về', 4400);
    }
  } else if (phase === 'settle') {
    const t = plantTop();
    if (Math.hypot(e.clientX - t.x, e.clientY - t.y) < 86) openLetter();
  }
});
window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; });
window.addEventListener('pointerup', () => { pointer.down = false; });
window.addEventListener('pointercancel', () => { pointer.down = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

function openLetter() {
  phase = 'letter'; phaseT = 0;
  chime.currentTime = 0; chime.play().catch(() => {});
  const t = plantTop();
  for (let i = 0; i < 36; i++) addPetal(t.x, t.y, { vx: (Math.random() - 0.5) * 60, vy: -26 - Math.random() * 46, state: 'free' });
  setTimeout(() => {
    letterEl.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => letterEl.classList.add('risen')));
  }, 550);
  setTimeout(() => replayBtn.classList.remove('hidden'), 3400);
}
replayBtn.addEventListener('click', () => location.reload());

// ---------- transitions ----------
function enterBurst() {
  phase = 'burst'; phaseT = 0; bloomT = 0;
  flashA = 0.42; ringR = 8; ringA = 0.6;
  shimmer.currentTime = 0; shimmer.play().catch(() => {});
  const t = plantTop();
  for (let i = 0; i < 150; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 300;
    const p = addPetal(t.x, t.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 130, state: 'free' });
    p.size = 7 + Math.random() * 9;
  }
  for (const f of fieldFlowers) f.bloomAt = flowerDelay(f);
}

// ---------- update ----------
let perfNow = 0;
function update(dt, now) {
  perfNow = now;
  phaseT += dt;
  rampMusic(dt);

  // RAIN — drag the clouds over, drops that reach the soil count
  cloud.active = phase === 'rain' && pointer.down;
  if (cloud.active) {
    cloud.x += (pointer.x - cloud.x) * Math.min(1, dt * 7);
    cloud.y += (pointer.y - cloud.y) * Math.min(1, dt * 7);
    hintTimer = 0;
    for (let i = 0; i < 4; i++) {
      drops.push({ x: cloud.x + (Math.random() - 0.5) * 120, y: cloud.y + 16 + Math.random() * 8, vy: 560 + Math.random() * 160, vx: -34 });
    }
  } else if (phase === 'rain') {
    hintTimer += dt;
    if (hintTimer > 7 && water < 0.25) { hintTimer = 0; showLine('Kéo mây về phía hạt hoa nhé', 3600); }
  }
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.x += d.vx * dt; d.y += d.vy * dt;
    const inSoil = Math.abs(d.x - L.cx) < L.soilRx && Math.abs(d.y - L.soilY) < L.soilRy + 8;
    if (inSoil) { water = Math.min(1, water + 1 / 120); drops.splice(i, 1); continue; }
    if (d.y > H + 12) drops.splice(i, 1);
  }
  if (drops.length > 700) drops.splice(0, drops.length - 700);
  if (phase === 'rain' && water >= 1) { phase = 'sun'; phaseT = 0; showLine('Nhấn giữ… hứng nắng cho cây lớn', 4600); }
  if (phase === 'sun' || phase === 'rain') sprout = Math.min(1, sprout + dt * (water > 0.35 ? 0.5 : 0));

  // SUN — hold to gather light
  if (phase === 'sun') {
    if (pointer.down) sunAmt = Math.min(1, sunAmt + dt / 3.6);
    if (sunAmt >= 1) { phase = 'still'; phaseT = 0; }
  }
  grow += ((phase === 'rain' ? 0 : sunAmt) - grow) * Math.min(1, dt * 2.2);

  // STILL — the bud holds its breath
  if (phase === 'still' && phaseT > 2.4) enterBurst();

  // BURST — the great bloom, petals gather into words, then rain down
  if (phase === 'burst') {
    bloomT += dt;
    heroOpen = Math.min(1, heroOpen + dt / 0.9);
    for (const f of fieldFlowers) {
      const goal = bloomT > f.bloomAt ? 1 : 0;
      f.bloomed += (goal - f.bloomed) * Math.min(1, dt * 4.5);
    }
    if (bloomT > 1.15 && !textFormed) {
      textFormed = true;
      const targets = textTargets();
      const shuffled = targets.sort(() => Math.random() - 0.5);
      const free = petals.filter(p => p.state === 'free');
      let ti = 0;
      for (const p of free) {
        if (ti >= shuffled.length) break;
        p.state = 'form'; p.tx = shuffled[ti].x; p.ty = shuffled[ti].y; ti++;
      }
      const t = plantTop();
      while (ti < shuffled.length) {
        const p = addPetal(t.x + (Math.random() - 0.5) * 60, t.y + (Math.random() - 0.5) * 30, { state: 'form' });
        p.tx = shuffled[ti].x; p.ty = shuffled[ti].y; ti++;
      }
    }
    if (bloomT > 5.4 && !textReleased) {
      textReleased = true;
      for (const p of petals) if (p.state === 'form') {
        p.releaseAt = bloomT + Math.random() * 1.5;
        if (Math.random() < 0.35) p.dissolve = true;
      }
    }
    if (textReleased) {
      for (const p of petals) {
        if (p.state !== 'form' || bloomT < (p.releaseAt || 0)) continue;
        if (p.dissolve) { p.state = 'dissolve'; }
        else { p.state = 'fall'; p.vy = 14 + Math.random() * 26; p.vx = (Math.random() - 0.5) * 120; }
      }
    }
    if (bloomT > 6.4) { phase = 'settle'; phaseT = 0; showLine('Trong lòng hoa… có một lá thư', 4600); }
  }
  if (phase === 'settle' || phase === 'letter') {
    for (const f of fieldFlowers) f.bloomed += (1 - f.bloomed) * Math.min(1, dt * 3);
    heroOpen = Math.min(1, heroOpen + dt);
  }

  // petals physics
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    if (p.state === 'dissolve') {
      p.fade = Math.max(0, (p.fade === undefined ? 1 : p.fade) - dt * 2.6);
      p.y += 6 * dt;
      if (p.fade <= 0) { petals.splice(i, 1); }
      continue;
    }
    if (p.state === 'form') {
      p.x += (p.tx - p.x) * Math.min(1, dt * 2.6) + Math.sin(now * 2 + p.ph) * 6 * dt;
      p.y += (p.ty - p.y) * Math.min(1, dt * 2.6) + Math.cos(now * 1.7 + p.ph) * 5 * dt;
      p.rot += p.vr * dt * 0.4;
    } else if (p.state === 'fall' || p.state === 'free') {
      p.vy += (p.state === 'fall' ? 26 : 150) * dt;
      if (p.state === 'fall') p.vy = Math.min(p.vy, 64);
      p.x += p.vx * dt + Math.sin(now * 2.2 + p.ph) * 14 * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.4, dt);
      p.rot += p.vr * dt;
      if ((p.state === 'fall' || p.state === 'free') && p.y > H * 0.58) { p.fade = Math.max(0, (p.fade === undefined ? 1 : p.fade) - dt * 1.35); if (p.fade <= 0) { petals.splice(i, 1); continue; } }
      if (p.state === 'fall') p.vy = Math.min(p.vy, 88);
      if (p.y > H + 16) petals.splice(i, 1);
    } else if (p.state === 'spark') {
      p.y -= 12 * dt; p.rot += dt;
      if (Math.random() < dt * 1.4) petals.splice(i, 1);
    }
  }

  flashA = Math.max(0, flashA - dt * 0.5);
  if (ringA > 0) { ringR += dt * W * 0.5; ringA = Math.max(0, ringA - dt * 0.45); }

  // front petals drift once the world has bloomed
  if (phase === 'settle' || phase === 'letter') {
    for (const p of frontPetals) {
      p.y += p.vy * dt; p.x += Math.sin(now * 0.9 + p.ph) * 12 * dt; p.rot += dt * 0.7;
      if (p.y > H + 14) { p.y = -14; p.x = Math.random() * W; }
    }
  }
}

// ---------- draw ----------
function drawFlower(x, y, size, hue, open01, now, ph) {
  if (open01 < 0.03) {  // a closed sprout
    wctx.strokeStyle = 'rgba(66,102,58,0.85)';
    wctx.lineWidth = Math.max(1, size * 0.10);
    wctx.beginPath(); wctx.moveTo(x, y);
    wctx.quadraticCurveTo(x + Math.sin(now + ph) * 1.5, y - size * 0.7, x, y - size * 0.9);
    wctx.stroke();
    wctx.fillStyle = 'rgba(96,140,80,0.9)';
    wctx.beginPath(); wctx.arc(x, y - size * 0.92, size * 0.16, 0, 7); wctx.fill();
    return;
  }
  const s = size * (0.4 + 0.6 * open01) * (1 + 0.10 * Math.sin(now * 1.3 + ph));
  const sway = Math.sin(now * 1.1 + ph) * size * 0.05;
  wctx.strokeStyle = 'rgba(66,102,58,0.8)';
  wctx.lineWidth = Math.max(1, size * 0.09);
  wctx.beginPath(); wctx.moveTo(x, y); wctx.lineTo(x + sway, y - s * 0.8); wctx.stroke();
  wctx.fillStyle = hue;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + ph;
    wctx.beginPath();
    wctx.ellipse(x + sway + Math.cos(a) * s * 0.30, y - s * 0.8 + Math.sin(a) * s * 0.30, s * 0.30, s * 0.17, a, 0, 7);
    wctx.fill();
  }
  wctx.fillStyle = '#ffcf5e';
  wctx.beginPath(); wctx.arc(x + sway, y - s * 0.8, s * 0.15, 0, 7); wctx.fill();
}

function draw(now) {
  wctx.clearRect(0, 0, W, H);
  if (imgBackdrop.complete && imgBackdrop.naturalWidth) {
    const s = Math.max(W / imgBackdrop.naturalWidth, H / imgBackdrop.naturalHeight);
    const dw = imgBackdrop.naturalWidth * s, dh = imgBackdrop.naturalHeight * s;
    wctx.drawImage(imgBackdrop, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else { wctx.fillStyle = '#2c3550'; wctx.fillRect(0, 0, W, H); }

  const light = lightLevel();

  // pre-dawn dim that lifts as the film gathers light
  if (light < 0.98) {
    const g = wctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(40,46,88,${0.40 * (1 - light)})`);
    g.addColorStop(1, `rgba(40,46,88,${0.16 * (1 - light)})`);
    wctx.fillStyle = g; wctx.fillRect(0, 0, W, H);
  }
  // the sun, rising as she holds
  if (sunAmt > 0.01 || phase === 'burst' || phase === 'settle' || phase === 'letter') {
    const sp = phase === 'sun' || phase === 'still' ? sunAmt : 1;
    const sx = L.sunStart.x + (L.sunEnd.x - L.sunStart.x) * sp;
    const sy = L.sunStart.y + (L.sunEnd.y - L.sunStart.y) * sp;
    wctx.globalCompositeOperation = 'lighter';
    const sz = 120 + 130 * sp;
    wctx.globalAlpha = 0.18 + 0.62 * sp;
    wctx.drawImage(GLOW.sun, sx - sz / 2, sy - sz / 2, sz, sz);
    wctx.globalAlpha = 1;
    wctx.fillStyle = '#fff3cf';
    wctx.beginPath(); wctx.arc(sx, sy, 15 + 5 * sp, 0, 7); wctx.fill();
    wctx.globalCompositeOperation = 'source-over';
  }
  // golden wash at the bloom
  if (phase === 'burst' || phase === 'settle' || phase === 'letter') {
    const g = wctx.createRadialGradient(L.cx, L.soilY - L.stemFull, 20, L.cx, L.soilY - L.stemFull, H * 0.75);
    g.addColorStop(0, 'rgba(255,196,100,0.20)');
    g.addColorStop(1, 'rgba(255,196,100,0)');
    wctx.fillStyle = g; wctx.fillRect(0, 0, W, H);
  }

  // soil mound — soft-edged, darkens as it drinks the rain
  const moist = water;
  const sg = wctx.createRadialGradient(L.cx, L.soilY, 4, L.cx, L.soilY, L.soilRx);
  sg.addColorStop(0, `rgba(${104 - moist * 34},${78 - moist * 26},${54 - moist * 18},0.95)`);
  sg.addColorStop(0.72, `rgba(${96 - moist * 30},${72 - moist * 24},${50 - moist * 16},0.75)`);
  sg.addColorStop(1, 'rgba(90,68,48,0)');
  wctx.save();
  wctx.translate(L.cx, L.soilY); wctx.scale(1, L.soilRy / L.soilRx); wctx.translate(-L.cx, -L.soilY);
  wctx.fillStyle = sg;
  wctx.beginPath(); wctx.arc(L.cx, L.soilY, L.soilRx, 0, 7); wctx.fill();
  wctx.restore();

  // field of flowers (behind the hero)
  for (const f of fieldFlowers) drawFlower(f.x, f.y, f.size, f.hue, f.bloomed, now, f.ph);

  // the seed, waiting
  if (phase === 'seed') {
    const p = 0.7 + 0.3 * Math.sin(now * 2.4);
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = 0.8 * p;
    const sz = 46 * p;
    wctx.drawImage(GLOW.cream, L.cx - sz / 2, L.soilY - sz / 2 - 2, sz, sz);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
    wctx.fillStyle = '#8a6b46';
    wctx.beginPath(); wctx.ellipse(L.cx, L.soilY - 2, 6.5, 4.6, 0.5, 0, 7); wctx.fill();
    wctx.fillStyle = '#c9a86a';
    wctx.beginPath(); wctx.ellipse(L.cx - 1.5, L.soilY - 3.5, 2.4, 1.6, 0.5, 0, 7); wctx.fill();
  }

  // ---- the hero plant ----
  const top = plantTop();
  const h = stemHeight();
  if (phase !== 'seed') {
    // stem
    wctx.strokeStyle = '#4e7d46';
    wctx.lineWidth = 4.6;
    wctx.lineCap = 'round';
    wctx.beginPath();
    wctx.moveTo(L.cx, L.soilY);
    wctx.quadraticCurveTo(L.cx + (top.x - L.cx) * 0.3, L.soilY - h * 0.55, top.x, top.y + 6);
    wctx.stroke();
    // leaves unfurl with growth
    const leafOpen = Math.max(0, Math.min(1, (grow - 0.12) / 0.5));
    for (const [frac, side] of [[0.34, -1], [0.55, 1], [0.72, -1]]) {
      const lx = L.cx + (top.x - L.cx) * frac * 0.8, ly = L.soilY - h * frac;
      const ls = (10 + grow * 26) * (frac === 0.72 ? 0.8 : 1);
      const ang = side * (0.5 + leafOpen * 0.75);
      wctx.save();
      wctx.translate(lx, ly); wctx.rotate(ang); wctx.scale(side, 1);
      wctx.fillStyle = '#59894f';
      wctx.beginPath();
      wctx.moveTo(0, 0);
      wctx.quadraticCurveTo(ls * 0.55, -ls * 0.42, ls * 1.15, -ls * 0.10);
      wctx.quadraticCurveTo(ls * 0.55, ls * 0.20, 0, 0);
      wctx.fill();
      wctx.restore();
    }
    // bud / open flower at the top
    if (grow > 0.5 || phase === 'burst' || phase === 'settle' || phase === 'letter') {
      const budScale = phase === 'seed' ? 0 : Math.max(0, Math.min(1, (grow - 0.5) / 0.5));
      if (heroOpen < 1 && imgBud.complete) {
        const bw = 30 + budScale * 46, bh = bw * (imgBud.naturalHeight / imgBud.naturalWidth || 1);
        const tremble = phase === 'still' ? Math.sin(now * 26) * 1.3 : 0;
        if (phase === 'still') {
          wctx.globalCompositeOperation = 'lighter';
          wctx.globalAlpha = 0.45 + 0.3 * Math.sin(now * 3.4);
          const gs = 90 + 16 * Math.sin(now * 3.4);
          wctx.drawImage(GLOW.pink, top.x - gs / 2, top.y - bh * 0.52 - gs / 2, gs, gs);
          wctx.globalCompositeOperation = 'source-over';
          wctx.globalAlpha = 1;
        }
        wctx.globalAlpha = 1 - heroOpen;
        wctx.drawImage(imgBud, top.x - bw / 2 + tremble, top.y - bh + 12, bw, bh);
        wctx.globalAlpha = 1;
      }
      if (heroOpen > 0 && imgOpen.complete) {
        const spring = 1 + 0.22 * Math.sin(Math.min(1, heroOpen) * Math.PI);
        const ow = 118 * spring * (0.4 + 0.6 * heroOpen), oh = ow * (imgOpen.naturalHeight / imgOpen.naturalWidth || 1);
        if (phase === 'settle' || phase === 'letter') {
          wctx.globalCompositeOperation = 'lighter';
          wctx.globalAlpha = 0.4 + 0.22 * Math.sin(now * 2.2);
          const gs = 150 + 20 * Math.sin(now * 2.2);
          wctx.drawImage(GLOW.pink, top.x - gs / 2, top.y - gs / 2 + 16, gs, gs);
          wctx.globalCompositeOperation = 'source-over';
          wctx.globalAlpha = 1;
        }
        wctx.drawImage(imgOpen, top.x - ow / 2, top.y - oh + 18, ow, oh);
      }
    } else if (sprout > 0.05) {
      // first two seed leaves
      wctx.fillStyle = '#6fa35e';
      for (const side of [-1, 1]) {
        wctx.beginPath();
        wctx.ellipse(L.cx + side * 6 * sprout, L.soilY - h - 2, 6.5 * sprout, 3.2 * sprout, side * 0.5, 0, 7);
        wctx.fill();
      }
    }
  }

  // the rain cloud that follows her hand
  if (cloud.active) {
    for (const [ox, oy, r] of [[0, 0, 30], [-26, 6, 22], [26, 6, 23], [-10, -9, 20], [14, -8, 19]]) {
      const g = wctx.createRadialGradient(cloud.x + ox, cloud.y + oy, 0, cloud.x + ox, cloud.y + oy, r);
      g.addColorStop(0, 'rgba(74,86,110,0.55)');
      g.addColorStop(1, 'rgba(74,86,110,0)');
      wctx.fillStyle = g;
      wctx.beginPath(); wctx.arc(cloud.x + ox, cloud.y + oy, r, 0, 7); wctx.fill();
    }
  }
  // rain
  wctx.strokeStyle = 'rgba(178,205,240,0.55)';
  wctx.lineWidth = 1.4;
  wctx.beginPath();
  for (const d of drops) { wctx.moveTo(d.x, d.y); wctx.lineTo(d.x + 3, d.y + 13); }
  wctx.stroke();

  // petals
  for (const p of petals) {
    const ds = p.state === 'form' ? p.size * 0.45 : p.size;
    wctx.save();
    wctx.translate(p.x, p.y); wctx.rotate(p.rot);
    if (imgPetal.complete) {
      wctx.globalAlpha = (p.fade === undefined ? 0.95 : 0.95 * p.fade);
      wctx.drawImage(imgPetal, -ds / 2, -ds / 2, ds, ds);
    } else {
      wctx.fillStyle = p.tint;
      wctx.globalAlpha = (p.fade === undefined ? 1 : p.fade);
      wctx.beginPath(); wctx.ellipse(0, 0, ds / 2, ds / 3.4, 0, 0, 7); wctx.fill();
    }
    wctx.restore();
  }
  wctx.globalAlpha = 1;

  // burst ring + flash
  if (ringA > 0) {
    wctx.strokeStyle = `rgba(255,170,190,${ringA})`;
    wctx.lineWidth = 2.5;
    wctx.beginPath(); wctx.arc(top.x, top.y, ringR, 0, 7); wctx.stroke();
  }
  if (flashA > 0) { wctx.fillStyle = `rgba(255,240,220,${flashA})`; wctx.fillRect(0, 0, W, H); }

  // front petals (only meaningful after the bloom; drawn above the letter too)
  fctx.clearRect(0, 0, W, H);
  if (phase === 'settle' || phase === 'letter') {
    for (const p of frontPetals) {
      fctx.save();
      fctx.translate(p.x, p.y); fctx.rotate(p.rot);
      fctx.globalAlpha = 0.75;
      if (imgPetal.complete) fctx.drawImage(imgPetal, -p.s / 2, -p.s / 2, p.s, p.s);
      fctx.restore();
    }
    fctx.globalAlpha = 1;
  }
}

// ---------- main loop ----------
let last = performance.now();
function frame(ts) {
  const now = ts / 1000;
  let dt = (ts - last) / 1000; last = ts;
  dt = Math.min(dt, 0.033);
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hooks for automated visual verification
window.__bloom = {
  phase: () => phase,
  water: () => water, sun: () => sunAmt,
  setWater: (p) => { water = p; }, setSun: (p) => { sunAmt = p; },
  flowerPos: () => { const t = plantTop(); return { x: t.x, y: t.y + 10 }; },
  bloomT: () => bloomT, formed: () => textFormed,
  musicPlaying: () => started && !music.paused && music.currentTime > 0,
};
