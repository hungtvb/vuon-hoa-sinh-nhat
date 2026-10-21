'use strict';
/* Gió Và Hoa — she IS the wind over one continuous flower hillside.
   Swipes bend the field and stream petals; circling stirs a small whirl;
   holding still gathers every petal into one great vortex; a flick upward
   blooms it into a flower in the sky; the rain of petals can be parted like
   a curtain; and the largest petal glides down carrying the letter. */

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
const GLOW = { gold: glowSprite(255, 196, 86), pink: glowSprite(255, 150, 180), cream: glowSprite(255, 232, 180) };
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

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
  L.skyY = H * 0.30;
  L.fieldTop = H * 0.52;
}
window.addEventListener('resize', layout);
layout();

// ---------- the field: flowers that bend with the wind and shed petals ----------
const PALETTE = ['#f7a8b8', '#fbc2d4', '#ffd9a0', '#e3c6f5', '#fff3f0', '#f78fb0', '#f9e29c', '#ffffff'];
const flowers = [];
{
  const rnd = mulberry32(777);
  for (let i = 0; i < 210; i++) {
    const y = L.fieldTop + Math.pow(rnd(), 0.85) * (H * 0.475);
    const depth = (y - L.fieldTop) / (H * 0.475);
    flowers.push({
      x: rnd() * W, y, depth, size: 5 + depth * 12,
      hue: PALETTE[Math.floor(rnd() * PALETTE.length)],
      ph: rnd() * Math.PI * 2, bend: 0, bendV: 0, shedCd: rnd() * 0.4, boost: 0,
    });
  }
  flowers.sort((a, b) => a.y - b.y);
}

// ---------- petals ----------
const petals = [];
function addPetal(x, y, opt) {
  const o = opt || {};
  const p = {
    x, y, vx: o.vx || 0, vy: o.vy || 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 3,
    size: 8 + Math.random() * 11, state: o.state || 'free', ph: Math.random() * 6.28,
    ang: 0, rad: 0, tx: 0, ty: 0, fade: 1, big: !!o.big, life: 0,
  };
  petals.push(p);
  if (petals.length > 820) petals.splice(0, petals.length - 820);
  return p;
}
for (let i = 0; i < 10; i++) addPetal(Math.random() * W, Math.random() * H * 0.7, { vx: 12 + Math.random() * 20, vy: 4 });
// front layer petals after the letter
const frontPetals = [];
for (let i = 0; i < 12; i++) frontPetals.push({ x: Math.random() * W, y: Math.random() * H, s: 8 + Math.random() * 10, vy: 11 + Math.random() * 15, ph: Math.random() * 6.28, rot: Math.random() * 6.28 });

// ---------- wind & gestures ----------
const pointer = { down: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, speed: 0, downAt: 0, moved: 0, path: [] };
let gust = 0;                    // ambient wind strength 0..1 (decays)
const miniVortex = { active: false, x: 0, y: 0, t: 0 };
const vortex = { active: false, x: 0, y: 0, charge: 0 };
let holding = false, holdTime = 0;

// ---------- film state ----------
let phase = 'wind';              // wind | gather | charged | bloom | rain | descent | letter
let phaseT = 0;
let bloomT = -1, formed = false;
let flashA = 0, goldWash = 0;
let hintStep = 0;
let letterPetal = null;
let started = false, musicVol = 0;
let freePlayTime = 0;

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
setTimeout(() => { if (phase === 'wind') showLine('Vuốt tay… gọi gió lên', 5200); }, 1100);

// ---------- audio ----------
function startMusic() { if (started) return; started = true; music.volume = 0; music.play().catch(() => {}); }
function rampMusic(dt) {
  const target = !started ? 0 : phase === 'bloom' ? 0.85 : phase === 'descent' ? 0.6 : 0.68;
  musicVol += (target - musicVol) * Math.min(1, dt * 1.7);
  if (started) music.volume = Math.max(0, Math.min(1, musicVol));
}

// ---------- the sky flower: sampled from a drawn blossom ----------
function skyFlowerTargets(cx, cy, R) {
  const c = document.createElement('canvas'); c.width = c.height = 400;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 400, 400);
  x.fillStyle = '#fff';
  for (let k = 0; k < 6; k++) {           // outer petals
    const a = (k / 6) * Math.PI * 2;
    x.beginPath();
    x.ellipse(200 + Math.cos(a) * 108, 200 + Math.sin(a) * 108, 86, 50, a, 0, 7);
    x.fill();
  }
  for (let k = 0; k < 6; k++) {           // inner petals
    const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
    x.beginPath();
    x.ellipse(200 + Math.cos(a) * 52, 200 + Math.sin(a) * 52, 46, 27, a, 0, 7);
    x.fill();
  }
  x.beginPath(); x.arc(200, 200, 26, 0, 7); x.fill();
  const d = x.getImageData(0, 0, 400, 400).data;
  let pts = [];
  for (let yy = 0; yy < 400; yy += 4) for (let xx = 0; xx < 400; xx += 4) {
    if (d[(yy * 400 + xx) * 4] > 120) pts.push({ dx: (xx - 200) / 200 * R, dy: (yy - 200) / 200 * R });
  }
  if (pts.length > 1000) { const step = pts.length / 1000; const capped = []; for (let i = 0; i < 1000; i++) capped.push(pts[Math.floor(i * step)]); pts = capped; }
  return pts;
}

// ---------- interaction ----------
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e) => {
  startMusic();
  pointer.down = true; pointer.x = pointer.px = e.clientX; pointer.y = pointer.py = e.clientY;
  pointer.vx = pointer.vy = pointer.speed = 0;
  pointer.downAt = performance.now(); pointer.moved = 0; pointer.path.length = 0;
  holdTime = 0;
  if (phase === 'descent' && letterPetal) {
    if (Math.hypot(e.clientX - letterPetal.x, e.clientY - letterPetal.y) < 84) openLetter();
  }
});
window.addEventListener('pointermove', (e) => {
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (pointer.down) {
    pointer.path.push({ x: e.clientX, y: e.clientY, t: performance.now() });
    if (pointer.path.length > 46) pointer.path.shift();
  }
});
function endPointer() {
  pointer.down = false;
  if (phase === 'gather') {
    // released early: the vortex loosens, keeps a little more than half its gathering
    vortex.active = false;
    vortex.charge *= 0.55;
    for (const p of petals) if (p.state === 'orbit') { p.state = 'free'; p.life = 5.2; p.vx += (Math.random() - 0.5) * 60; p.vy += -20 - Math.random() * 30; }
    phase = 'wind'; phaseT = 0;
    if (vortex.charge > 0.15) showLine('Giữ lâu hơn chút nữa… nén cơn gió lại', 3600);
  }
  holding = false;
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
document.addEventListener('contextmenu', (e) => e.preventDefault());

function openLetter() {
  phase = 'letter'; phaseT = 0;
  chime.currentTime = 0; chime.play().catch(() => {});
  const lp = letterPetal;
  for (let i = 0; i < 30; i++) addPetal(lp.x, lp.y, { vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 40 });
  letterPetal = null;
  setTimeout(() => {
    letterEl.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => letterEl.classList.add('risen')));
  }, 500);
  setTimeout(() => replayBtn.classList.remove('hidden'), 3400);
}
replayBtn.addEventListener('click', () => location.reload());

// ---------- phase changes ----------
function enterBloom() {
  phase = 'bloom'; phaseT = 0; bloomT = 0; formed = false;
  vortex.active = false;
  flashA = 0.35;
  shimmer.currentTime = 0; shimmer.play().catch(() => {});
}
function enterDescent() {
  phase = 'descent'; phaseT = 0;
  letterPetal = addPetal(L.cx, -30, { state: 'letter', big: true });
  letterPetal.vy = 0;
  showLine('Một cánh hoa mang thư đang xuống…', 4200);
}

// ---------- update ----------
function update(dt, now) {
  phaseT += dt;
  rampMusic(dt);

  // pointer velocity (px per ms, smoothed)
  if (pointer.down) {
    const ivx = (pointer.x - pointer.px) / Math.max(1, dt * 1000);
    const ivy = (pointer.y - pointer.py) / Math.max(1, dt * 1000);
    pointer.vx += (ivx - pointer.vx) * 0.5;
    pointer.vy += (ivy - pointer.vy) * 0.5;
    pointer.speed = Math.hypot(pointer.vx, pointer.vy);
    pointer.moved += Math.hypot(pointer.x - pointer.px, pointer.y - pointer.py);
    if (pointer.speed > 0.4) gust = Math.min(1.6, gust + pointer.speed * dt * 1.4);
  }
  pointer.px = pointer.x; pointer.py = pointer.y;
  gust = Math.max(0, gust - dt * 0.55);
  freePlayTime += dt;

  // -- circular stirring makes a small whirl (only in free wind)
  if (phase === 'wind' && pointer.down && pointer.path.length > 14) {
    const pts = pointer.path;
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    cx /= pts.length; cy /= pts.length;
    let ang = 0;
    for (let i = 1; i < pts.length; i++) {
      const a0 = Math.atan2(pts[i - 1].y - cy, pts[i - 1].x - cx);
      const a1 = Math.atan2(pts[i].y - cy, pts[i].x - cx);
      let da = a1 - a0;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      ang += da;
    }
    if (Math.abs(ang) > 4.2) { miniVortex.active = true; miniVortex.x = cx; miniVortex.y = cy; miniVortex.t = 1.1; }
  }
  if (miniVortex.t > 0) { miniVortex.t -= dt; if (miniVortex.t <= 0) miniVortex.active = false; }

  // -- holding still gathers the great vortex
  holding = pointer.down && (performance.now() - pointer.downAt > 340) && pointer.moved < 14;
  if ((phase === 'wind' || phase === 'gather') && holding) {
    if (phase === 'wind') {
      phase = 'gather'; phaseT = 0;
      vortex.active = true; vortex.x = pointer.x; vortex.y = pointer.y;
    }
    vortex.x += (pointer.x - vortex.x) * Math.min(1, dt * 5);
    vortex.y += (pointer.y - vortex.y) * Math.min(1, dt * 5);
    vortex.charge = Math.min(1, vortex.charge + dt / 3.1);
    // every flower sheds toward the vortex; every free petal is captured
    for (const p of petals) if (p.state === 'free') { p.state = 'orbit'; p.life = 0; p.fade = 1; }
    if (vortex.charge >= 1) {
      phase = 'charged'; phaseT = 0;
      showLine('Vuốt mạnh lên trời… thả hoa nở', 4400);
    }
  }

  // -- charged: the vortex waits, self-sustaining; an upward flick releases it
  if (phase === 'charged') {
    vortex.x += (L.cx - vortex.x) * Math.min(1, dt * 0.8);
    vortex.y += (L.skyY + 30 - vortex.y) * Math.min(1, dt * 0.8);
    if (pointer.down && pointer.vy < -1.5 && Math.abs(pointer.vy) > Math.abs(pointer.vx) * 1.2) enterBloom();
  }

  // -- wind bends the field & strips petals (free wind and gathering alike)
  const windActive = phase === 'wind' || phase === 'gather' || phase === 'charged';
  if (windActive) {
    for (const f of flowers) {
      let target = Math.sin(now * 1.2 + f.ph) * 0.05 + gust * 0.22 * (pointer.vx >= 0 ? 1 : -1);
      if (pointer.down && pointer.speed > 0.15) {
        const d = Math.hypot(f.x + f.bend * 20 - pointer.x, f.y - 8 - pointer.y);
        if (d < 140) target += (1 - d / 140) * Math.min(1.2, pointer.speed) * 0.55 * Math.sign(pointer.vx || 1);
      }
      if (phase === 'gather') target += 0.3;   // the whole field leans toward the gathering
      f.bendV += ((target - f.bend) * 9 - f.bendV * 4.5) * dt;
      f.bend += f.bendV * dt;
      // shedding
      f.shedCd -= dt;
      const shedRate = phase === 'gather' ? 0.6 : Math.min(1, gust * 1.5 + (pointer.down && pointer.speed > 0.9 ? 0.55 : 0));
      if (f.shedCd <= 0 && Math.random() < shedRate) {
        f.shedCd = (phase === 'gather' ? 0.10 : 0.16) + Math.random() * (phase === 'gather' ? 0.18 : 0.3);
        const hx = f.x + f.bend * 22, hy = f.y - f.size * 0.9;
        addPetal(hx, hy, {
          vx: pointer.vx * 130 + (Math.random() - 0.5) * 30,
          vy: -18 - Math.random() * 26,
          state: phase === 'gather' ? 'orbit' : 'free',
        });
      }
    }
  }

  // -- the bloom: vortex rises and opens into a flower in the sky
  if (phase === 'bloom') {
    bloomT += dt;
    goldWash = Math.min(1, goldWash + dt * 0.8);
    if (!formed && bloomT > 0.55) {
      formed = true;
      const targets = skyFlowerTargets(L.cx, L.skyY, Math.min(W * 0.40, 168));
      const shuffled = targets.sort(() => Math.random() - 0.5);
      let ti = 0;
      for (const p of petals) {
        if (ti >= shuffled.length) break;
        if (p.state === 'orbit' || p.state === 'free') { p.state = 'form'; p.tx = shuffled[ti].dx; p.ty = shuffled[ti].dy; ti++; }
      }
      while (ti < shuffled.length) {
        const p = addPetal(vortex.x + (Math.random() - 0.5) * 40, vortex.y + (Math.random() - 0.5) * 40, { state: 'form' });
        p.tx = shuffled[ti].dx; p.ty = shuffled[ti].dy; ti++;
      }
    }
    if (bloomT > 5.4) {
      phase = 'rain'; phaseT = 0;
      for (const p of petals) if (p.state === 'form') { p.state = 'rain'; p.vy = 16 + Math.random() * 30; p.vx = (Math.random() - 0.5) * 36; }
      for (const f of flowers) f.boost = 1;   // the whole field answers, blooming brighter
    }
  }
  if (phase === 'rain') {
    for (const f of flowers) f.boost = Math.max(0, f.boost - dt * 0.25);
    if (phaseT > 4.6) enterDescent();
  }
  if (phase === 'descent' && letterPetal) {
    const lp = letterPetal;
    lp.t = (lp.t || 0) + dt;
    const targetY = H * 0.46;
    lp.y += (targetY - lp.y) * Math.min(1, dt * (lp.y < 10 ? 2.2 : 0.85));
    lp.x = L.cx + Math.sin(lp.t * 1.3) * 16;
    lp.rot += dt * 1.6;
  }

  // -- petal physics by state
  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    if (p.state === 'letter') continue;
    if (p.state === 'orbit') {
      const cx = phase === 'bloom' ? L.cx : vortex.x, cy = phase === 'bloom' ? L.skyY : vortex.y;
      if (p.rad === 0) {
        p.rad = Math.max(18, Math.hypot(p.x - cx, p.y - cy));
        p.ang = Math.atan2(p.y - cy, p.x - cx);
        p.rf = 0.30 + Math.random() * 0.80;
        p.sq = 0.5 + Math.random() * 0.45;
        p.wob = Math.random() * 6.28;
      }
      const baseR = phase === 'bloom' ? 30 : 16 + (1 - vortex.charge) * 84;
      const targetR = baseR * p.rf * (1 + 0.10 * Math.sin(now * 2.1 + p.wob));
      p.rad += (targetR - p.rad) * Math.min(1, dt * 2.2);
      p.ang += dt * (1.6 + 110 / Math.max(26, p.rad));
      p.x = cx + Math.cos(p.ang) * p.rad;
      p.y = cy + Math.sin(p.ang) * p.rad * p.sq;
      p.rot += dt * 4;
    } else if (p.state === 'form') {
      const rot = bloomT * 0.14;
      const ca = Math.cos(rot), sa = Math.sin(rot);
      const gx = L.cx + p.tx * ca - p.ty * sa, gy = L.skyY + p.tx * sa + p.ty * ca;
      p.x += (gx - p.x) * Math.min(1, dt * 4.2) + Math.sin(now * 2 + p.ph) * 5 * dt;
      p.y += (gy - p.y) * Math.min(1, dt * 4.2) + Math.cos(now * 1.8 + p.ph) * 4 * dt;
      p.rot += p.vr * dt * 0.4;
    } else if (p.state === 'rain') {
      p.vy += 20 * dt; p.vy = Math.min(p.vy, 58);
      // parting the curtain: a horizontal drag pushes petals aside
      if (pointer.down && Math.abs(pointer.vx) > 0.25) {
        const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        if (d < 95) { const push = (1 - d / 95) * pointer.vx * 260; p.vx += push * dt * 3.2; }
      }
      p.x += p.vx * dt + Math.sin(now * 2.1 + p.ph) * 13 * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.35, dt);
      p.rot += p.vr * dt;
      if (p.y > H * 0.76) { p.fade -= dt * 1.7; if (p.fade <= 0) { petals.splice(i, 1); continue; } }
    } else {  // free: carried by wind, turbulence and a whisper of gravity
      let wx = 14 + gust * 90 * (pointer.vx >= 0 ? 1 : -1) * 0.4, wy = 0;
      if (pointer.down && pointer.speed > 0.2) {
        const d = Math.hypot(p.x - pointer.x, p.y - pointer.y);
        if (d < 150) { const f = (1 - d / 150); wx += pointer.vx * 190 * f; wy += pointer.vy * 150 * f; }
      }
      if (miniVortex.active) {
        const dx = p.x - miniVortex.x, dy = p.y - miniVortex.y;
        const d = Math.hypot(dx, dy);
        if (d < 165 && d > 4) {
          const tang = 120 * (1 - d / 165) + 26;
          wx += (-dy / d) * tang - (dx / d) * 26;
          wy += (dx / d) * tang - (dy / d) * 26;
        }
      }
      p.vx += (wx - p.vx) * Math.min(1, dt * 2.4);
      p.vy += (wy + 13 - p.vy) * Math.min(1, dt * 2.0);
      p.x += p.vx * dt + Math.sin(now * 2.3 + p.ph) * 11 * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life += dt;
      if (p.life > 7) { p.fade -= dt * 1.3; if (p.fade <= 0) { petals.splice(i, 1); continue; } }
      if (p.x < -24) p.x = W + 20;
      if (p.x > W + 24) p.x = -20;
      if (p.y > H + 16) { if (phase === 'wind' && petals.length > 240) petals.splice(i, 1); else { p.y = -12; p.x = Math.random() * W; } }
      if (p.y < -30) p.y = -30;
    }
  }

  flashA = Math.max(0, flashA - dt * 0.5);

  if (phase === 'letter') {
    for (const p of frontPetals) {
      p.y += p.vy * dt; p.x += Math.sin(now * 0.9 + p.ph) * 12 * dt; p.rot += dt * 0.7;
      if (p.y > H + 14) { p.y = -14; p.x = Math.random() * W; }
    }
  }
}

// ---------- draw ----------
function drawFlower(f, now) {
  const s = f.size * (1 + f.boost * 0.3);
  const sway = Math.sin(now * 1.15 + f.ph) * 0.04;
  const bendX = (f.bend + sway) * s * 1.5;
  wctx.strokeStyle = 'rgba(58,94,52,0.75)';
  wctx.lineWidth = Math.max(1, s * 0.09);
  wctx.beginPath(); wctx.moveTo(f.x, f.y);
  wctx.quadraticCurveTo(f.x + bendX * 0.4, f.y - s * 0.5, f.x + bendX, f.y - s * 0.9);
  wctx.stroke();
  const hx = f.x + bendX, hy = f.y - s * 0.9;
  wctx.fillStyle = f.hue;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + f.ph;
    wctx.beginPath();
    wctx.ellipse(hx + Math.cos(a) * s * 0.30, hy + Math.sin(a) * s * 0.30, s * 0.30, s * 0.17, a, 0, 7);
    wctx.fill();
  }
  wctx.fillStyle = '#ffcf5e';
  wctx.beginPath(); wctx.arc(hx, hy, s * 0.15, 0, 7); wctx.fill();
}

function draw(now) {
  wctx.clearRect(0, 0, W, H);
  if (imgBackdrop.complete && imgBackdrop.naturalWidth) {
    const s = Math.max(W / imgBackdrop.naturalWidth, H / imgBackdrop.naturalHeight);
    const dw = imgBackdrop.naturalWidth * s, dh = imgBackdrop.naturalHeight * s;
    wctx.drawImage(imgBackdrop, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else { wctx.fillStyle = '#7a9a5e'; wctx.fillRect(0, 0, W, H); }

  // golden wash as the sky flower blooms
  if (goldWash > 0) {
    const g = wctx.createRadialGradient(L.cx, L.skyY, 20, L.cx, L.skyY, H * 0.7);
    g.addColorStop(0, `rgba(255,205,110,${0.26 * goldWash})`);
    g.addColorStop(1, 'rgba(255,205,110,0)');
    wctx.fillStyle = g; wctx.fillRect(0, 0, W, H);
  }

  for (const f of flowers) drawFlower(f, now);

  // the gathering vortex glow
  if ((phase === 'gather' || phase === 'charged') && vortex.active || phase === 'charged') {
    const vx = phase === 'charged' ? vortex.x : vortex.x, vy = vortex.y;
    wctx.globalCompositeOperation = 'lighter';
    const pulse = (phase === 'charged' ? 0.42 + 0.18 * Math.sin(now * 4.2) : 0.2 + vortex.charge * 0.3);
    wctx.globalAlpha = pulse;
    const gs = 80 + vortex.charge * 120 + (phase === 'charged' ? 14 * Math.sin(now * 4.2) : 0);
    wctx.drawImage(GLOW.pink, vx - gs / 2, vy - gs / 2, gs, gs);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }
  // mini whirl glow
  if (miniVortex.active) {
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = 0.22;
    wctx.drawImage(GLOW.cream, miniVortex.x - 55, miniVortex.y - 55, 110, 110);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  // petals
  for (const p of petals) {
    if (p.state === 'letter') continue;
    const ds = p.state === 'form' ? p.size * 0.6 : p.state === 'orbit' ? p.size * 0.72 : p.size;
    wctx.save();
    wctx.translate(p.x, p.y); wctx.rotate(p.rot);
    wctx.globalAlpha = 0.95 * (p.fade === undefined ? 1 : p.fade);
    if (imgPetal.complete) wctx.drawImage(imgPetal, -ds / 2, -ds / 2, ds, ds);
    else { wctx.fillStyle = '#fbc2d4'; wctx.beginPath(); wctx.ellipse(0, 0, ds / 2, ds / 3.4, 0, 0, 7); wctx.fill(); }
    wctx.restore();
  }
  wctx.globalAlpha = 1;

  // the letter petal: large, glowing, impossible to miss
  if (letterPetal) {
    const lp = letterPetal;
    const pulse = 0.65 + 0.3 * Math.sin(now * 3);
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = pulse * 0.8;
    const gs = 120 + 18 * Math.sin(now * 3);
    wctx.drawImage(GLOW.gold, lp.x - gs / 2, lp.y - gs / 2, gs, gs);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
    wctx.save();
    wctx.translate(lp.x, lp.y); wctx.rotate(lp.rot);
    if (imgPetal.complete) wctx.drawImage(imgPetal, -34, -34, 68, 68);
    wctx.restore();
    // a tiny envelope heart of light at its center
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = 0.9;
    wctx.drawImage(GLOW.cream, lp.x - 13, lp.y - 13, 26, 26);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  if (flashA > 0) { wctx.fillStyle = `rgba(255,244,220,${flashA})`; wctx.fillRect(0, 0, W, H); }

  // front petals above the letter
  fctx.clearRect(0, 0, W, H);
  if (phase === 'letter') {
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
window.__wind = {
  phase: () => phase,
  charge: () => vortex.charge,
  setCharge: (c) => { vortex.charge = c; },
  beginGather: (x, y) => { phase = 'gather'; vortex.active = true; vortex.x = x; vortex.y = y; for (const p of petals) if (p.state === 'free') p.state = 'orbit'; },
  flick: () => { if (phase === 'charged') enterBloom(); },
  petalCount: () => petals.length,
  letterPetalPos: () => letterPetal ? { x: letterPetal.x, y: letterPetal.y } : null,
  musicPlaying: () => started && !music.paused && music.currentTime > 0,
};
