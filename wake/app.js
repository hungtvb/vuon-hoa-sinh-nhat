'use strict';
/* Vườn Hoa Thức Giấc — one continuous moonlit garden, asleep until her touch brings the light.
   Tap wakes the first flower; dragging carries light from bed to bed; holding on a great bud
   blooms a little sun; a drawn path sends the fireflies out to light the dark corners;
   a flick upward throws stars into the sky; and when the garden is bright enough,
   the moonflower on the arch opens — with the letter inside. */

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
const GLOW = { gold: glowSprite(255, 196, 86), cream: glowSprite(255, 232, 180), moon: glowSprite(190, 205, 255), pink: glowSprite(255, 150, 180), green: glowSprite(170, 255, 150) };
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
  L.moon = { x: W * 0.5, y: H * 0.335 };
  L.moonSky = { x: W * 0.44, y: H * 0.15 };
}
window.addEventListener('resize', layout);
layout();

// ---------- the garden ----------
const PALETTE = ['#a8c8ff', '#fbc2d4', '#fff3f0', '#e3c6f5', '#ffd9a0', '#b8e6c9', '#f7a8b8'];
const flowers = [];
{
  const rnd = mulberry32(2024);
  const zones = [
    { x0: 0.02, x1: 0.40, y0: 0.60, y1: 0.985, n: 58 },
    { x0: 0.58, x1: 0.98, y0: 0.60, y1: 0.985, n: 58 },
    { x0: 0.05, x1: 0.30, y0: 0.50, y1: 0.62, n: 14 },
    { x0: 0.70, x1: 0.95, y0: 0.50, y1: 0.62, n: 14 },
    { x0: 0.40, x1: 0.46, y0: 0.66, y1: 0.95, n: 6 },
    { x0: 0.54, x1: 0.60, y0: 0.66, y1: 0.95, n: 6 },
  ];
  for (const z of zones) {
    for (let i = 0; i < z.n; i++) {
      const x = (z.x0 + rnd() * (z.x1 - z.x0)) * W;
      const y = (z.y0 + rnd() * (z.y1 - z.y0)) * H;
      const depth = Math.max(0, Math.min(1, (y - H * 0.5) / (H * 0.5)));
      flowers.push({
        x, y, depth, size: 6 + depth * 11, hue: PALETTE[Math.floor(rnd() * PALETTE.length)],
        ph: rnd() * Math.PI * 2, awake: false, wakeT: 0, queuedAt: -1, awakeSince: 0,
      });
    }
  }
  flowers.sort((a, b) => a.y - b.y);
}
// five great buds that bloom into little suns when she holds her light on them
const sunBuds = [
  { fx: 0.15, fy: 0.65 }, { fx: 0.85, fy: 0.63 }, { fx: 0.22, fy: 0.87 }, { fx: 0.78, fy: 0.86 }, { fx: 0.88, fy: 0.76 },
].map(p => ({ x: p.fx * W, y: p.fy * H, bloomed: false, charge: 0, pulseT: 0 }));

const sparks = [];   // tiny light motes
function addSpark(x, y, opt) {
  const o = opt || {};
  const s = { x, y, vx: o.vx || 0, vy: o.vy || 0, life: 0, ttl: o.ttl || 1.6, size: o.size || 3, hue: o.hue || 'gold', star: !!o.star, tw: Math.random() * 6.28 };
  sparks.push(s);
  if (sparks.length > 420) sparks.splice(0, sparks.length - 420);
  return s;
}
const stars = [];
const trail = [];    // her light trail while dragging {x,y,ttl}
const rings = [];    // expanding light rings {x,y,r,a}

const frontPetals = [];
for (let i = 0; i < 12; i++) frontPetals.push({ x: Math.random() * W, y: Math.random() * H, s: 8 + Math.random() * 10, vy: 11 + Math.random() * 15, ph: Math.random() * 6.28, rot: Math.random() * 6.28 });

// ---------- fireflies ----------
const fireflies = { arrived: false, state: 'idle', path: [], t: 0, dur: 0, home: { x: W * 0.5, y: H * 0.94 }, pts: [] };
for (let i = 0; i < 14; i++) fireflies.pts.push({ x: fireflies.home.x, y: fireflies.home.y, off: i * 0.32, ph: Math.random() * 6.28 });

// ---------- state ----------
let phase = 'garden';            // garden | moonbloom | finale | letter
let phaseT = 0;
let moonOpen = 0;
let flashA = 0;
let propTimer = 0, starTimer = 3;
let hintFlags = { drag: false, flies: false, moon: false };
let started = false, musicVol = 0;
const pointer = { down: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0, downAt: 0, stroke: [], strokeLen: 0, holdTarget: null };

function awakeCount() { let n = 0; for (const f of flowers) if (f.awake) n++; return n; }
function awakePct() { return awakeCount() / flowers.length; }
function wakeFlower(f, delay, now) {
  if (f.awake || f.queuedAt >= 0) return;
  f.queuedAt = now + (delay || 0);
}
function wakeNear(x, y, r, now, delayStep) {
  const list = flowers.filter(f => !f.awake && f.queuedAt < 0 && Math.hypot(f.x - x, f.y - y) < r);
  list.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
  list.forEach((f, i) => wakeFlower(f, (delayStep || 0) * i, now));
  return list.length;
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
setTimeout(() => { if (phase === 'garden' && awakeCount() === 0) showLine('Chạm vào một bông hoa… đánh thức khu vườn', 5400); }, 1100);

// ---------- audio ----------
function startMusic() { if (started) return; started = true; music.volume = 0; music.play().catch(() => {}); }
function rampMusic(dt) {
  const target = !started ? 0 : phase === 'moonbloom' ? 0.85 : 0.66;
  musicVol += (target - musicVol) * Math.min(1, dt * 1.7);
  if (started) music.volume = Math.max(0, Math.min(1, musicVol));
}

// ---------- interaction ----------
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e) => {
  startMusic();
  pointer.down = true; pointer.x = pointer.px = e.clientX; pointer.y = pointer.py = e.clientY;
  pointer.vx = pointer.vy = 0; pointer.downAt = performance.now();
  pointer.stroke = [{ x: e.clientX, y: e.clientY }]; pointer.strokeLen = 0;
  pointer.holdTarget = null;
  const now = performance.now() / 1000;
  if (phase === 'garden') {
    // tap wakes the nearest sleeping flower
    let best = null, bd = 95;
    for (const f of flowers) { const d = Math.hypot(f.x - e.clientX, f.y - e.clientY); if (!f.awake && d < bd) { bd = d; best = f; } }
    if (best) { wakeFlower(best, 0, now); rings.push({ x: best.x, y: best.y, r: 4, a: 0.5 }); }
    // holding on a great bud starts charging it
    for (const b of sunBuds) if (!b.bloomed && Math.hypot(b.x - e.clientX, b.y - e.clientY) < 82) pointer.holdTarget = b;
    // the moonflower, when the garden is bright enough
    if (awakePct() >= 0.85 && Math.hypot(L.moon.x - e.clientX, L.moon.y - e.clientY) < 105) enterMoonbloom();
  } else if (phase === 'finale') {
    if (Math.hypot(L.moon.x - e.clientX, L.moon.y - e.clientY) < 115) openLetter();
  }
});
window.addEventListener('pointermove', (e) => {
  if (pointer.down) {
    pointer.strokeLen += Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y);
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.stroke.push({ x: e.clientX, y: e.clientY });
    if (pointer.stroke.length > 220) pointer.stroke.shift();
    if (phase === 'garden') {
      const now = performance.now() / 1000;
      trail.push({ x: e.clientX, y: e.clientY, ttl: 0.9 });
      wakeNear(e.clientX, e.clientY, 42, now, 0.02);
    }
  } else { pointer.x = e.clientX; pointer.y = e.clientY; }
});
function endPointer() {
  if (!pointer.down) return;
  pointer.down = false;
  const now = performance.now() / 1000;
  if (phase !== 'garden') return;
  // an upward flick throws light into the sky as stars
  if (pointer.vy < -1.35 && Math.abs(pointer.vy) > Math.abs(pointer.vx) * 1.15 && pointer.stroke.length > 3) {
    const sx = pointer.stroke[0].x, sy = pointer.stroke[0].y;
    const n = 8 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const tx = W * 0.08 + Math.random() * W * 0.84, ty = H * 0.04 + Math.random() * H * 0.2;
      stars.push({ x: sx, y: sy, tx, ty, t: 0, dur: 1.1 + Math.random() * 0.7, ph: Math.random() * 6.28, settled: false });
    }
    showLine('', 1); lineEl.classList.add('hidden');
  }
  // a drawn path sends the fireflies out along it
  if (fireflies.arrived && fireflies.state === 'idle' && pointer.strokeLen > 130 && pointer.stroke.length > 6) {
    fireflies.state = 'follow';
    fireflies.path = pointer.stroke.slice();
    // path length & duration
    let len = 0;
    for (let i = 1; i < fireflies.path.length; i++) len += Math.hypot(fireflies.path[i].x - fireflies.path[i - 1].x, fireflies.path[i].y - fireflies.path[i - 1].y);
    fireflies.dur = Math.max(1.6, Math.min(4.2, len / 210));
    fireflies.t = 0;
  }
  pointer.holdTarget = null;
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
document.addEventListener('contextmenu', (e) => e.preventDefault());

function enterMoonbloom() {
  phase = 'moonbloom'; phaseT = 0;
  flashA = 0.4;
  shimmer.currentTime = 0; shimmer.play().catch(() => {});
  rings.push({ x: L.moon.x, y: L.moon.y, r: 10, a: 0.7 });
  const now = performance.now() / 1000;
  const sorted = flowers.filter(f => !f.awake).sort((a, b) => Math.hypot(a.x - L.moon.x, a.y - L.moon.y) - Math.hypot(b.x - L.moon.x, b.y - L.moon.y));
  sorted.forEach((f, i) => wakeFlower(f, 0.25 + i * 0.012, now));
}
function openLetter() {
  phase = 'letter'; phaseT = 0;
  chime.currentTime = 0; chime.play().catch(() => {});
  for (let i = 0; i < 26; i++) addSpark(L.moon.x, L.moon.y, { vx: (Math.random() - 0.5) * 60, vy: -16 - Math.random() * 36, ttl: 2.2, hue: 'pink', size: 3.4 });
  setTimeout(() => {
    letterEl.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => letterEl.classList.add('risen')));
  }, 520);
  setTimeout(() => replayBtn.classList.remove('hidden'), 3400);
}
replayBtn.addEventListener('click', () => location.reload());

// ---------- update ----------
function update(dt, now) {
  phaseT += dt;
  rampMusic(dt);

  if (pointer.down) {
    const ivx = (pointer.x - pointer.px) / Math.max(1, dt * 1000);
    const ivy = (pointer.y - pointer.py) / Math.max(1, dt * 1000);
    pointer.vx += (ivx - pointer.vx) * 0.45;
    pointer.vy += (ivy - pointer.vy) * 0.45;
  }
  pointer.px = pointer.x; pointer.py = pointer.y;

  // queued awakenings
  for (const f of flowers) {
    if (f.queuedAt >= 0 && now >= f.queuedAt) {
      f.queuedAt = -1; f.awake = true; f.wakeT = 0; f.awakeSince = now;
      for (let i = 0; i < 3; i++) addSpark(f.x, f.y - 4, { vx: (Math.random() - 0.5) * 22, vy: -12 - Math.random() * 18, ttl: 1.1, size: 2.4 });
    }
    if (f.awake && f.wakeT < 1) f.wakeT = Math.min(1, f.wakeT + dt * 2.4);
  }
  // slow organic spread: light creeps from awake flowers to their neighbours
  propTimer -= dt;
  if (propTimer <= 0 && phase === 'garden') {
    propTimer = 1.25;
    for (const f of flowers) {
      if (!f.awake || now - f.awakeSince < 6) continue;
      if (Math.random() > 0.35) continue;
      let best = null, bd = 56;
      for (const g of flowers) {
        if (g.awake || g.queuedAt >= 0) continue;
        const d = Math.hypot(g.x - f.x, g.y - f.y);
        if (d < bd) { bd = d; best = g; }
      }
      if (best) wakeFlower(best, 2.5 + Math.random() * 2.5, now);
    }
  }

  // great buds: hold to bloom a little sun
  if (pointer.down && pointer.holdTarget && phase === 'garden') {
    const b = pointer.holdTarget;
    if (Math.hypot(b.x - pointer.x, b.y - pointer.y) < 96) {
      b.charge = Math.min(1, b.charge + dt / 1.15);
      if (b.charge >= 1 && !b.bloomed) {
        b.bloomed = true; b.pulseT = 0;
        rings.push({ x: b.x, y: b.y, r: 8, a: 0.65 });
        const now2 = performance.now() / 1000;
        wakeNear(b.x, b.y, 165, now2, 0.02);
        for (let i = 0; i < 14; i++) addSpark(b.x, b.y, { vx: (Math.random() - 0.5) * 90, vy: -20 - Math.random() * 50, ttl: 1.8, hue: 'gold', size: 3 });
      }
    }
  }
  for (const b of sunBuds) if (b.bloomed) b.pulseT += dt;

  // fireflies arrive once the garden is a third awake
  const pct = awakePct();
  if (!fireflies.arrived && pct >= 0.35) {
    fireflies.arrived = true;
    if (!hintFlags.flies) { hintFlags.flies = true; showLine('Đom đóm đã tới — vẽ một đường, chúng sẽ bay theo thắp sáng', 5200); }
  }
  if (fireflies.arrived) {
    if (fireflies.state === 'follow') {
      fireflies.t += dt / fireflies.dur;
      if (fireflies.t >= 1) { fireflies.state = 'return'; fireflies.t = 0; }
    } else if (fireflies.state === 'return') {
      fireflies.t += dt;
      if (fireflies.t > 1.6) fireflies.state = 'idle';
    }
    const pathPos = (tt) => {
      const path = fireflies.path;
      if (!path || path.length < 2) return fireflies.home;
      const total = path.length - 1;
      const ft = Math.max(0, Math.min(1, tt)) * total;
      const i = Math.floor(ft), fr = ft - i;
      const a = path[i], b = path[Math.min(i + 1, total)];
      return { x: a.x + (b.x - a.x) * fr, y: a.y + (b.y - a.y) * fr };
    };
    for (const fp of fireflies.pts) {
      let gx, gy;
      if (fireflies.state === 'follow') {
        const p = pathPos(fireflies.t - fp.off * 0.055);
        gx = p.x; gy = p.y;
      } else {
        gx = fireflies.home.x + Math.sin(now * 0.6 + fp.ph) * 34;
        gy = fireflies.home.y + Math.cos(now * 0.8 + fp.ph * 1.3) * 12;
      }
      fp.x += (gx - fp.x) * Math.min(1, dt * 3.2);
      fp.y += (gy - fp.y) * Math.min(1, dt * 3.2);
      if (fireflies.state === 'follow') wakeNear(fp.x, fp.y, 42, now, 0);
    }
  }

  // stars: fly up, settle, and now and then drop a waking mote
  for (const st of stars) {
    if (!st.settled) {
      st.t += dt / st.dur;
      if (st.t >= 1) { st.settled = true; st.x = st.tx; st.y = st.ty; }
      else {
        const e = 1 - Math.pow(1 - st.t, 3);
        st.x += (st.tx - st.x) * Math.min(1, dt * 3.4) * e + Math.sin(now * 3 + st.ph) * 8 * dt;
        st.y += (st.ty - st.y) * Math.min(1, dt * 3.4) * e - 26 * dt;
      }
    }
  }
  starTimer -= dt;
  if (starTimer <= 0) {
    starTimer = 3.4 + Math.random() * 3.4;
    const settled = stars.filter(s => s.settled);
    if (settled.length && phase === 'garden') {
      const st = settled[Math.floor(Math.random() * settled.length)];
      addSpark(st.x, st.y, { vx: 0, vy: 8, ttl: 3.4, hue: 'cream', size: 2.6, star: true });
    }
  }
  // star motes drift down and wake what they touch
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life += dt;
    s.x += s.vx * dt + Math.sin(now * 1.7 + s.tw) * 6 * dt;
    s.y += s.vy * dt;
    if (s.star) {
      s.vy = Math.min(s.vy + 4 * dt, 17);
      if (Math.random() < dt * 2.2) {
        const near = flowers.filter(f => !f.awake && Math.hypot(f.x - s.x, f.y - s.y) < 30);
        if (near.length) { wakeFlower(near[0], 0, now); s.life = s.ttl; }
      }
    }
    if (s.life >= s.ttl) sparks.splice(i, 1);
  }

  // trail fade
  for (let i = trail.length - 1; i >= 0; i--) { trail[i].ttl -= dt; if (trail[i].ttl <= 0) trail.splice(i, 1); }
  if (trail.length > 90) trail.splice(0, trail.length - 90);
  // rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.r += dt * 190; r.a -= dt * 0.5;
    if (r.a <= 0) rings.splice(i, 1);
  }

  // moonbloom cinematic
  if (phase === 'moonbloom') {
    moonOpen = Math.min(1, moonOpen + dt / 1.6);
    if (phaseT > 2.6) { phase = 'finale'; phaseT = 0; showLine('Trong hoa nguyệt quế… có một lá thư', 4600); }
  }
  flashA = Math.max(0, flashA - dt * 0.45);

  // hint: dragging, once she has woken her first flowers
  if (phase === 'garden' && !hintFlags.drag && awakeCount() >= 3) {
    hintFlags.drag = true;
    showLine('Kéo tay… ánh sáng sẽ lan theo', 4400);
  }
  if (phase === 'garden' && !hintFlags.moon && pct >= 0.85) {
    hintFlags.moon = true;
    showLine('Bông hoa nguyệt quế đã sẵn sàng — chạm vào nó', 5200);
  }

  if (phase === 'letter') {
    for (const p of frontPetals) {
      p.y += p.vy * dt; p.x += Math.sin(now * 0.9 + p.ph) * 12 * dt; p.rot += dt * 0.7;
      if (p.y > H + 14) { p.y = -14; p.x = Math.random() * W; }
    }
  }
}

// ---------- draw ----------
function drawFlowerShape(x, y, s, hue, open01, now, ph) {
  if (open01 < 0.25) {
    wctx.fillStyle = 'rgba(26,38,32,0.92)';
    wctx.beginPath(); wctx.ellipse(x, y - s * 0.3, s * 0.27, s * 0.38, 0, 0, 7); wctx.fill();
    wctx.fillStyle = 'rgba(140,170,150,0.16)';
    wctx.beginPath(); wctx.ellipse(x - s * 0.07, y - s * 0.46, s * 0.10, s * 0.13, -0.4, 0, 7); wctx.fill();
    return;
  }
  const sc = s * (0.45 + 0.55 * open01);
  wctx.fillStyle = hue;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 + ph;
    wctx.beginPath();
    wctx.ellipse(x + Math.cos(a) * sc * 0.30, y - sc * 0.3 + Math.sin(a) * sc * 0.30, sc * 0.30, sc * 0.17, a, 0, 7);
    wctx.fill();
  }
  wctx.fillStyle = '#ffe9a8';
  wctx.beginPath(); wctx.arc(x, y - sc * 0.3, sc * 0.15, 0, 7); wctx.fill();
}

function draw(now) {
  wctx.clearRect(0, 0, W, H);
  if (imgBackdrop.complete && imgBackdrop.naturalWidth) {
    const s = Math.max(W / imgBackdrop.naturalWidth, H / imgBackdrop.naturalHeight);
    const dw = imgBackdrop.naturalWidth * s, dh = imgBackdrop.naturalHeight * s;
    wctx.drawImage(imgBackdrop, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else { wctx.fillStyle = '#101a2e'; wctx.fillRect(0, 0, W, H); }

  const pct = awakePct();
  // the garden's darkness lifts as it wakes
  const dark = 0.52 * (1 - pct) + (phase === 'garden' ? 0 : 0);
  if (dark > 0.01) { wctx.fillStyle = `rgba(7,10,32,${dark})`; wctx.fillRect(0, 0, W, H); }
  // the moon brightens with the garden
  wctx.globalCompositeOperation = 'lighter';
  wctx.globalAlpha = 0.25 + pct * 0.5;
  const ms = 120 + pct * 90;
  wctx.drawImage(GLOW.moon, L.moonSky.x - ms / 2, L.moonSky.y - ms / 2, ms, ms);
  wctx.globalCompositeOperation = 'source-over';
  wctx.globalAlpha = 1;

  // her light trail
  if (trail.length > 1) {
    wctx.globalCompositeOperation = 'lighter';
    for (const t of trail) {
      wctx.globalAlpha = Math.max(0, t.ttl / 0.9) * 0.35;
      const gs = 44;
      wctx.drawImage(GLOW.gold, t.x - gs / 2, t.y - gs / 2, gs, gs);
    }
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  // flowers
  for (const f of flowers) {
    if (f.awake) {
      wctx.globalCompositeOperation = 'lighter';
      wctx.globalAlpha = 0.30 * f.wakeT;
      const gs = f.size * 3.4;
      wctx.drawImage(GLOW.gold, f.x - gs / 2, f.y - f.size * 0.3 - gs / 2, gs, gs);
      wctx.globalCompositeOperation = 'source-over';
      wctx.globalAlpha = 1;
    }
    drawFlowerShape(f.x, f.y, f.size, f.hue, f.awake ? f.wakeT : 0, now, f.ph);
  }

  // great buds / little suns
  for (const b of sunBuds) {
    if (!b.bloomed) {
      const pulse = b.charge > 0 ? 0.4 + b.charge * 0.5 : 0.17 + 0.09 * Math.sin(now * 2 + b.x);
      wctx.globalCompositeOperation = 'lighter';
      wctx.globalAlpha = pulse;
      const gs = 54 + b.charge * 60;
      wctx.drawImage(GLOW.gold, b.x - gs / 2, b.y - gs / 2, gs, gs);
      wctx.globalCompositeOperation = 'source-over';
      wctx.globalAlpha = 1;
      wctx.fillStyle = '#7a6a3a';
      wctx.beginPath(); wctx.ellipse(b.x, b.y, 10.5, 13, 0, 0, 7); wctx.fill();
      wctx.fillStyle = '#c9a84c';
      wctx.beginPath(); wctx.ellipse(b.x - 3, b.y - 4, 4, 5.4, -0.4, 0, 7); wctx.fill();
    } else {
      wctx.globalCompositeOperation = 'lighter';
      wctx.globalAlpha = 0.5 + 0.16 * Math.sin(now * 2.4 + b.x);
      const gs = 120 + 14 * Math.sin(now * 2.4 + b.x);
      wctx.drawImage(GLOW.gold, b.x - gs / 2, b.y - gs / 2, gs, gs);
      wctx.globalCompositeOperation = 'source-over';
      wctx.globalAlpha = 1;
      drawFlowerShape(b.x, b.y + 6, 21, '#ffd76a', 1, now, b.x);
    }
  }

  // the moonflower on the arch
  {
    const ready = pct >= 0.85 && phase === 'garden';
    const glowA = phase === 'garden' ? 0.14 + pct * 0.3 + (ready ? 0.25 + 0.18 * Math.sin(now * 3.6) : 0) : 0.75;
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = glowA;
    const gs = 120 + pct * 90 + (ready ? 16 * Math.sin(now * 3.6) : 0) + moonOpen * 90;
    wctx.drawImage(GLOW.moon, L.moon.x - gs / 2, L.moon.y - gs / 2, gs, gs);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
    if (moonOpen < 1 && imgBud.complete) {
      const bw = 84 + pct * 14, bh = bw * (imgBud.naturalHeight / imgBud.naturalWidth || 1);
      wctx.globalAlpha = 1 - moonOpen;
      wctx.drawImage(imgBud, L.moon.x - bw / 2, L.moon.y - bh / 2, bw, bh);
      wctx.globalAlpha = 1;
    }
    if (moonOpen > 0 && imgOpen.complete) {
      const spring = 1 + 0.2 * Math.sin(Math.min(1, moonOpen) * Math.PI);
      const ow = 168 * spring * (0.35 + 0.65 * moonOpen), oh = ow * (imgOpen.naturalHeight / imgOpen.naturalWidth || 1);
      if (phase === 'finale' || phase === 'letter') {
        wctx.globalCompositeOperation = 'lighter';
        wctx.globalAlpha = 0.4 + 0.2 * Math.sin(now * 2.2);
        const gs2 = 190 + 22 * Math.sin(now * 2.2);
        wctx.drawImage(GLOW.pink, L.moon.x - gs2 / 2, L.moon.y - gs2 / 2, gs2, gs2);
        wctx.globalCompositeOperation = 'source-over';
        wctx.globalAlpha = 1;
      }
      wctx.drawImage(imgOpen, L.moon.x - ow / 2, L.moon.y - oh / 2, ow, oh);
    }
  }

  // fireflies
  if (fireflies.arrived) {
    wctx.globalCompositeOperation = 'lighter';
    for (const fp of fireflies.pts) {
      wctx.globalAlpha = 0.55 + 0.35 * Math.sin(now * 3.1 + fp.ph);
      const gs = 17;
      wctx.drawImage(GLOW.green, fp.x - gs / 2, fp.y - gs / 2, gs, gs);
    }
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  // stars
  wctx.globalCompositeOperation = 'lighter';
  for (const st of stars) {
    wctx.globalAlpha = st.settled ? 0.55 + 0.4 * Math.sin(now * 2.2 + st.ph) : 0.9;
    const gs = st.settled ? 15 : 12;
    wctx.drawImage(GLOW.cream, st.x - gs / 2, st.y - gs / 2, gs, gs);
  }
  // sparks / motes
  for (const s of sparks) {
    wctx.globalAlpha = Math.max(0, 1 - s.life / s.ttl) * 0.9;
    const gs = s.size * 4.4;
    wctx.drawImage(s.hue === 'pink' ? GLOW.pink : s.hue === 'cream' ? GLOW.cream : GLOW.gold, s.x - gs / 2, s.y - gs / 2, gs, gs);
  }
  wctx.globalCompositeOperation = 'source-over';
  wctx.globalAlpha = 1;

  // rings
  for (const r of rings) {
    wctx.strokeStyle = `rgba(255,220,150,${Math.max(0, r.a)})`;
    wctx.lineWidth = 2.2;
    wctx.beginPath(); wctx.arc(r.x, r.y, r.r, 0, 7); wctx.stroke();
  }
  if (flashA > 0) { wctx.fillStyle = `rgba(240,244,255,${flashA})`; wctx.fillRect(0, 0, W, H); }

  // front petals above the letter
  fctx.clearRect(0, 0, W, H);
  if (phase === 'letter') {
    for (const p of frontPetals) {
      fctx.save();
      fctx.translate(p.x, p.y); fctx.rotate(p.rot);
      fctx.globalAlpha = 0.7;
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
window.__wake = {
  phase: () => phase,
  awakePct: () => awakePct(),
  wakeTo: (p) => {
    const now = performance.now() / 1000;
    const target = Math.floor(flowers.length * p);
    const sorted = flowers.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x));
    let n = 0;
    for (const f of sorted) { if (n >= target) break; if (!f.awake) { wakeFlower(f, Math.random() * 0.3, now); n++; } }
  },
  tapMoon: () => { if (phase === 'garden') enterMoonbloom(); },
  fliesArrived: () => fireflies.arrived,
  stars: () => stars.length,
  musicPlaying: () => started && !music.paused && music.currentTime > 0,
};
