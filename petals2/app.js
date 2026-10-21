'use strict';
/* Ngàn Cánh Hoa — Bản Gọn (bản 22). No lock, no waiting games:
   tap the envelope -> a fountain of real flowers -> the sea of drifting
   blooms -> the blooms gather into a beating heart -> the letter lives
   inside the heart and opens only when she taps it. */

const world = document.getElementById('world');
const wctx = world.getContext('2d');
const envWrap = document.getElementById('envWrap');
const bigEnv = document.getElementById('bigEnv');
const typeBox = document.getElementById('typeBox');
const typeTitle = document.getElementById('typeTitle');
const typeSub = document.getElementById('typeSub');
const cardWrap = document.getElementById('cardWrap');
const lineEl = document.getElementById('line');
const replayBtn = document.getElementById('replay');
const muteBtn = document.getElementById('muteBtn');
const music = document.getElementById('music');
const shimmer = document.getElementById('shimmer');
const chime = document.getElementById('chime');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;
const L = {};
function layout() {
  W = window.innerWidth; H = window.innerHeight;
  world.width = W * DPR; world.height = H * DPR;
  world.style.width = W + 'px'; world.style.height = H + 'px';
  wctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  L.cx = W * 0.5;
  L.envY = H * 0.54;
  L.heart = { x: W * 0.5, y: H * 0.42, s: Math.min(W * 0.34, 138) };
}
window.addEventListener('resize', layout);
layout();

// ---------- flower library (six species, no daisy) ----------
const SPECIES = ['rose', 'peony', 'tulip', 'hydrangea', 'lisianthus', 'baby'];
const flowerImgs = SPECIES.map(n => { const i = new Image(); i.src = `assets/img/${n}.webp`; return i; });
const imgPetal = new Image(); imgPetal.src = 'assets/img/petal.webp';
function rndSpecies() { return flowerImgs[Math.floor(Math.random() * flowerImgs.length)]; }

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
const GLOW = { pink: glowSprite(255, 150, 180) };

// ---------- particles: one pool, three lives ----------
const blooms = [];
let fountainSpawned = 0;
function addBloom(x, y, opt) {
  const o = opt || {};
  const b = {
    x, y, vx: o.vx || 0, vy: o.vy || 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2.4,
    size: o.size || 30 + Math.random() * 34, img: o.img || rndSpecies(),
    state: o.state || 'fountain', ph: Math.random() * 6.28, ttl: o.ttl || 9, life: 0,
    tx: 0, ty: 0, fade: 1, swayAmp: 8 + Math.random() * 14,
  };
  blooms.push(b);
  if (blooms.length > 430) blooms.splice(0, blooms.length - 430);
  return b;
}
const petalBits = [];
function burstPetals(x, y, n) {
  for (let i = 0; i < n; i++) {
    petalBits.push({
      x, y, vx: (Math.random() - 0.5) * 130, vy: -30 - Math.random() * 70,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 5, size: 8 + Math.random() * 9, life: 0, ttl: 1.4 + Math.random() * 0.8,
    });
  }
}
function burstTrail(x, y) {
  petalBits.push({ x, y, vx: (Math.random() - 0.5) * 26, vy: -8 - Math.random() * 18,
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 3, size: 5 + Math.random() * 5, life: 0, ttl: 0.9 });
}
// ambient petals drifting behind everything
const ambient = [];
for (let i = 0; i < 12; i++) ambient.push({ x: Math.random() * W, y: Math.random() * H, s: 7 + Math.random() * 9, vy: 9 + Math.random() * 13, ph: Math.random() * 6.28, rot: Math.random() * 6.28 });

// ---------- state ----------
let phase = 'sealed';        // sealed | fountain | sea | card
const shownAt = performance.now();
let phaseT = 0;
let spawnAcc = 0;
let typeStarted = false;
let heartSpawned = false, heartFormed = false, heartFormedAt = 0;
let heartBeatBoost = 1, heartHoldT = 0;
let letterRead = false;
const heartLean = { x: 0, y: 0 };
const pointer = { down: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0 };
let started = false, musicVol = 0;

// ---------- audio ----------
function startMusic() { if (started) return; started = true; music.volume = 0; music.play().catch(() => {}); }
function rampMusic(dt) {
  musicVol += ((started ? 0.66 : 0) - musicVol) * Math.min(1, dt * 1.8);
  if (started && !music.muted) music.volume = Math.max(0, Math.min(1, musicVol));
}
function playSnd(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }
muteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  music.muted = !music.muted;
  muteBtn.classList.toggle('off', music.muted);
  muteBtn.querySelector('.wv').style.display = music.muted ? 'none' : '';
  muteBtn.querySelector('.mx').style.display = music.muted ? '' : 'none';
});

// ---------- floating line ----------
let lineTimer = null;
function showLine(text, holdMs) {
  lineEl.textContent = text;
  lineEl.classList.remove('hidden');
  requestAnimationFrame(() => lineEl.classList.add('show'));
  clearTimeout(lineTimer);
  lineTimer = setTimeout(() => {
    lineEl.classList.remove('show');
    setTimeout(() => lineEl.classList.add('hidden'), 1200);
  }, holdMs || 4000);
}

// ---------- open the envelope ----------
function openEnvelope() {
  if (phase !== 'sealed') return;
  if (performance.now() - shownAt < 500) return;   // arm-delay: swallow stray first taps
  phase = 'fountain'; phaseT = 0;
  startMusic();
  playSnd(shimmer);
  bigEnv.classList.add('opening');
  setTimeout(() => envWrap.classList.add('hidden'), 380);
  typeBox.classList.remove('hidden');
  burstPetals(L.cx, L.envY, 26);
  for (let i = 0; i < 46; i++) {
    addBloom(L.cx + (Math.random() - 0.5) * 60, L.envY, {
      vx: (Math.random() - 0.5) * 560, vy: -560 - Math.random() * 460,
      size: 24 + Math.random() * 38,
    });
    fountainSpawned++;
  }
}
bigEnv.addEventListener('click', openEnvelope);

// typewriter: quick and even, a breath at the punctuation
function typewrite(el, text, done) {
  let i = 0;
  el.textContent = '';
  const step = () => {
    if (i >= text.length) { if (done) done(); return; }
    const ch = text[i++];
    el.textContent += ch;
    let d = 40;
    if (ch === ' ') d = 22;
    else if ('.,—…!'.includes(ch)) d = 170;
    setTimeout(step, d);
  };
  step();
}
function startType() {
  if (typeStarted) return;
  typeStarted = true;
  typewrite(typeTitle, 'Chúc Mừng Sinh Nhật', () => {
    typewrite(typeSub, 'Một ngàn cánh hoa gửi tới chị…');
  });
}

// ---------- the sea & the heart ----------
function spawnDrifters(n) {
  for (let i = 0; i < n; i++) {
    const b = addBloom(Math.random() * W, H + 26 + Math.random() * 60, {
      state: 'drift', vy: -14 - Math.random() * 20, vx: (Math.random() - 0.5) * 7,
      size: 22 + Math.random() * 30, ttl: 48,
    });
    b.baseVy = b.vy;
  }
}
function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: L.heart.x + x * (L.heart.s / 16), y: L.heart.y - y * (L.heart.s / 16) };
}
function setupHeart() {
  const N = 88;
  for (let i = 0; i < N; i++) {
    const hp = heartPoint((i / N) * Math.PI * 2);
    const b = addBloom(L.cx + (Math.random() - 0.5) * W * 0.7, H + 30 + Math.random() * 120, {
      state: 'heart', size: 25 + Math.random() * 17, ttl: 1e9,
    });
    b.tx = hp.x; b.ty = hp.y;
    b.riseDelay = Math.random() * 0.9;
    b.ht = 0;
  }
}

// ---------- the letter card ----------
function showCard() {
  phase = 'card'; phaseT = 0;
  letterRead = true;
  typeBox.classList.add('hidden');
  lineEl.classList.remove('show'); lineEl.classList.add('hidden');
  playSnd(chime);
  cardWrap.classList.remove('hidden');
  const lines = cardWrap.querySelectorAll('.reveal');
  lines.forEach(p => p.classList.remove('show'));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    cardWrap.classList.add('show');
    lines.forEach((p, i) => setTimeout(() => p.classList.add('show'), 250 + i * 280));
  }));
}
function hideCard() {
  cardWrap.classList.remove('show');
  setTimeout(() => {
    cardWrap.classList.add('hidden');
    if (phase === 'card') phase = 'sea';
    setTimeout(() => replayBtn.classList.remove('hidden'), 1800);
  }, 450);
}
document.getElementById('cardClose').addEventListener('click', hideCard);
cardWrap.addEventListener('click', (e) => { if (e.target === cardWrap) hideCard(); });
replayBtn.addEventListener('click', () => location.reload());

// ---------- pointer: wind, stirring, the heart tap ----------
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e) => {
  pointer.down = true; pointer.x = pointer.px = e.clientX; pointer.y = pointer.py = e.clientY;
  pointer.vx = pointer.vy = 0;
  heartHoldT = 0;
  if (phase === 'sea') {
    // tap a drifting bloom: it bursts into petals
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      if (b.state === 'drift' && Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.size * 0.72) {
        burstPetals(b.x, b.y, 7);
        blooms.splice(i, 1);
        break;
      }
    }
    // tap the heart: the letter lives inside it (never opens on its own)
    if (heartFormed && performance.now() - heartFormedAt > 500 &&
        Math.hypot(L.heart.x - e.clientX, L.heart.y - e.clientY) < L.heart.s * 1.3) {
      showCard();
    }
  }
});
window.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; });
window.addEventListener('pointerup', () => { pointer.down = false; heartHoldT = 0; });
window.addEventListener('pointercancel', () => { pointer.down = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

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

  for (const a of ambient) {
    a.y += a.vy * dt; a.x += Math.sin(now * 0.9 + a.ph) * 10 * dt; a.rot += dt * 0.6;
    if (a.y > H + 14) { a.y = -14; a.x = Math.random() * W; }
  }

  if (phase === 'fountain') {
    if (phaseT > 0.45) startType();
    if (phaseT < 2.3) {
      const pressure = pointer.down ? 1.8 : 1;
      spawnAcc += dt * 100 * pressure;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        addBloom(L.cx + (Math.random() - 0.5) * 76, L.envY, {
          vx: (Math.random() - 0.5) * 480,
          vy: (-540 - Math.random() * 430) * (pointer.down ? 1.14 : 1),
          size: 24 + Math.random() * 38,
        });
        fountainSpawned++;
      }
    } else {
      // the fountain settles into the sea: everything still flying calms down and drifts
      phase = 'sea'; phaseT = 0;
      for (const b of blooms) {
        if (b.state === 'fountain') {
          b.state = 'drift'; b.life = 0; b.ttl = 48; b.fade = 1;
          b.vy = -12 - Math.random() * 18; b.baseVy = b.vy; b.vx *= 0.3;
        }
      }
      spawnDrifters(36);
    }
  }

  if (phase === 'sea' || phase === 'card') {
    // ~3.5s into the sea, the heart gathers — briskly this time
    if (!heartSpawned && phaseT > 3.5 && phase === 'sea') { heartSpawned = true; setupHeart(); }
    if (heartSpawned && !heartFormed) {
      let settled = 0, total = 0;
      for (const b of blooms) if (b.state === 'heart') { total++; if ((b.ht || 0) - (b.riseDelay || 0) > 3.1) settled++; }
      if (total > 0 && settled >= total * 0.9) {
        heartFormed = true;
        heartFormedAt = performance.now();
        playSnd(chime);
        showLine(letterRead ? 'Rê tay qua biển hoa…' : 'Chạm vào trái tim nhé', 4600);
      }
    }
    // a gentle permanent trickle keeps the sea alive
    if (Math.random() < dt * 0.55) spawnDrifters(1);
  }

  if (phase === 'sea') {
    heartLean.x *= Math.pow(0.12, dt); heartLean.y *= Math.pow(0.12, dt);
    if (pointer.down && (Math.abs(pointer.vx) > 0.25 || Math.abs(pointer.vy) > 0.25)) {
      for (const b of blooms) {
        if (b.state !== 'drift') continue;
        const dx = b.x - pointer.x, dy = b.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 140) {
          const f = 1 - d / 140;
          b.vx += pointer.vx * 330 * f * dt + (-dy / (d + 1)) * 46 * f * dt;
          b.vy += pointer.vy * 330 * f * dt + (dx / (d + 1)) * 46 * f * dt;
          if (Math.random() < 0.3) burstTrail(b.x, b.y);
        }
      }
      const hd = Math.hypot(L.heart.x - pointer.x, L.heart.y - pointer.y);
      if (hd < 240) {
        heartLean.x = Math.max(-16, Math.min(16, (pointer.x - L.heart.x) * 0.10));
        heartLean.y = Math.max(-16, Math.min(16, (pointer.y - L.heart.y) * 0.10));
      }
    }
    // holding on the heart (optional, never required) makes it beat faster
    if (heartFormed && pointer.down && Math.hypot(L.heart.x - pointer.x, L.heart.y - pointer.y) < L.heart.s * 1.3) heartHoldT += dt;
    else heartHoldT = Math.max(0, heartHoldT - dt * 2);
    heartBeatBoost = 1 + Math.min(1.6, heartHoldT * 1.4);
  }

  // bloom physics
  for (let i = blooms.length - 1; i >= 0; i--) {
    const b = blooms[i];
    b.life += dt;
    if (b.state === 'fountain') {
      b.vy += 620 * dt;
      if (pointer.down && (Math.abs(pointer.vx) > 0.3 || Math.abs(pointer.vy) > 0.3)) {
        const d = Math.hypot(b.x - pointer.x, b.y - pointer.y);
        if (d < 140) { const f = (1 - d / 140); b.vx += pointer.vx * 300 * f * dt; b.vy += pointer.vy * 200 * f * dt; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= Math.pow(0.78, dt);
      b.rot += b.vr * dt;
      if (b.y > H * 0.96) b.fade -= dt * 1.8;
      if (b.fade <= 0 || b.life > b.ttl) blooms.splice(i, 1);
    } else if (b.state === 'drift') {
      b.vx += (0 - b.vx) * Math.min(1, dt * 0.9);
      b.vy += ((b.baseVy || -20) - b.vy) * Math.min(1, dt * 0.9);
      b.x += b.vx * dt + Math.sin(now * 0.9 + b.ph) * b.swayAmp * dt;
      b.y += b.vy * dt;
      b.rot += b.vr * dt * 0.5;
      b.fade = Math.min(1, Math.max(0, (b.ttl - b.life) / 3));
      if (b.y < -50 || b.life > b.ttl) blooms.splice(i, 1);
    } else if (b.state === 'heart') {
      b.ht = (b.ht || 0) + dt;
      const t = b.ht - (b.riseDelay || 0);
      if (t < 1.3) {            // rising with the others
        b.y -= dt * (30 + (b.ph % 1) * 18);
        b.x += Math.sin(now + b.ph) * 8 * dt;
      } else if (t < 3.3) {     // converging onto the curve
        const e = Math.min(1, (t - 1.3) / 2.0);
        const k = Math.min(1, dt * (1.4 + e * 2.6));
        b.x += (b.tx - b.x) * k;
        b.y += (b.ty - b.y) * k;
      } else {                  // home: breathing on the curve, leaning toward her hand
        b.x += (b.tx + heartLean.x + Math.sin(now * 1.1 + b.ph) * 2.4 - b.x) * Math.min(1, dt * 3);
        b.y += (b.ty + heartLean.y + Math.cos(now * 0.9 + b.ph) * 2.4 - b.y) * Math.min(1, dt * 3);
      }
      b.rot += b.vr * dt * 0.3;
    }
  }
  for (let i = petalBits.length - 1; i >= 0; i--) {
    const p = petalBits[i];
    p.life += dt;
    p.vy += 190 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    if (p.life > p.ttl) petalBits.splice(i, 1);
  }
}

// ---------- draw ----------
function heartbeatScale(now) {
  const period = 1.15 / heartBeatBoost;
  const t = (now % period) / period;
  const thump = Math.exp(-Math.pow((t - 0.10) * 9, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.30) * 9, 2));
  return 1 + 0.055 * thump * heartBeatBoost;
}
function draw(now) {
  wctx.clearRect(0, 0, W, H);
  for (const a of ambient) {
    wctx.save();
    wctx.translate(a.x, a.y); wctx.rotate(a.rot);
    wctx.globalAlpha = 0.5;
    if (imgPetal.complete) wctx.drawImage(imgPetal, -a.s / 2, -a.s / 2, a.s, a.s);
    wctx.restore();
  }
  wctx.globalAlpha = 1;

  if (heartSpawned) {
    const hs = heartbeatScale(now);
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = 0.30 + 0.12 * (hs - 1) * 18;
    const gs = L.heart.s * 3.1 * hs;
    wctx.drawImage(GLOW.pink, L.heart.x - gs / 2, L.heart.y - gs / 2, gs, gs);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  const hs = heartSpawned ? heartbeatScale(now) : 1;
  for (const b of blooms) {
    const sc = b.state === 'heart' ? hs : 1;
    wctx.save();
    wctx.translate(b.x, b.y); wctx.rotate(b.rot); wctx.scale(sc, sc);
    wctx.globalAlpha = Math.max(0, Math.min(1, b.fade));
    if (b.img.complete) wctx.drawImage(b.img, -b.size / 2, -b.size / 2, b.size, b.size);
    wctx.restore();
  }
  wctx.globalAlpha = 1;
  for (const p of petalBits) {
    wctx.save();
    wctx.translate(p.x, p.y); wctx.rotate(p.rot);
    wctx.globalAlpha = Math.max(0, 1 - p.life / p.ttl) * 0.95;
    if (imgPetal.complete) wctx.drawImage(imgPetal, -p.size / 2, -p.size / 2, p.size, p.size);
    wctx.restore();
  }
  wctx.globalAlpha = 1;
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
window.__petals2 = {
  phase: () => phase,
  openEnvelope: () => bigEnv.click(),
  fountainCount: () => blooms.filter(b => b.state === 'fountain').length,
  heartFormed: () => heartFormed,
  tapHeart: () => { if (heartFormed && phase === 'sea') showCard(); },
  cardVisible: () => !cardWrap.classList.contains('hidden'),
  musicPlaying: () => started && !music.paused && music.currentTime > 0,
};
