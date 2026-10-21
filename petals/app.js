'use strict';
/* Ngàn Cánh Hoa — a locked gift in three scenes:
   1) a PIN lock guarded by hearts, 2) an envelope that erupts into a fountain
   of real flowers while the greeting types itself out, 3) a cream letter card,
   and behind it an endless finale: flowers drifting up forever around a
   beating heart made of a hundred blooms. */

const PIN = '0101';   // placeholder — Tony sets this to his sister's birth day+month (DDMM)

const world = document.getElementById('world');
const wctx = world.getContext('2d');
const front = document.getElementById('front');
const fctx = front.getContext('2d');
const lockUI = document.getElementById('lockUI');
const slotsEl = document.querySelectorAll('.slot');
const envWrap = document.getElementById('envWrap');
const bigEnv = document.getElementById('bigEnv');
const typeBox = document.getElementById('typeBox');
const typeTitle = document.getElementById('typeTitle');
const typeSub = document.getElementById('typeSub');
const cardWrap = document.getElementById('cardWrap');
const lineEl = document.getElementById('line');
const replayBtn = document.getElementById('replay');
const music = document.getElementById('music');
const unlockSnd = document.getElementById('unlockSnd');
const wrongSnd = document.getElementById('wrongSnd');
const shimmer = document.getElementById('shimmer');
const chime = document.getElementById('chime');

const DPR = Math.min(window.devicePixelRatio || 1, 2);
let W = 0, H = 0;
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
  L.envY = H * 0.52;
  L.heart = { x: W * 0.5, y: H * 0.42, s: Math.min(W * 0.34, 138) };
}
window.addEventListener('resize', layout);
layout();

// ---------- flower library ----------
const SPECIES = ['rose', 'peony', 'allium', 'tulip', 'hydrangea', 'lisianthus', 'baby'];
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
const GLOW = { pink: glowSprite(255, 150, 180), cream: glowSprite(255, 232, 180) };

// ---------- particles ----------
const blooms = [];   // fountain + drifter + heart flowers share one pool
function addBloom(x, y, opt) {
  const o = opt || {};
  const b = {
    x, y, vx: o.vx || 0, vy: o.vy || 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 2.4,
    size: o.size || 30 + Math.random() * 34, img: o.img || rndSpecies(),
    state: o.state || 'fountain', ph: Math.random() * 6.28, ttl: o.ttl || 9, life: 0,
    tx: 0, ty: 0, fade: 1, swayAmp: 8 + Math.random() * 14,
  };
  blooms.push(b);
  if (blooms.length > 460) blooms.splice(0, blooms.length - 460);
  return b;
}
const petalBits = [];
function burstPetals(x, y, n) {
  for (let i = 0; i < n; i++) {
    petalBits.push({
      x, y, vx: (Math.random() - 0.5) * 130, vy: -30 - Math.random() * 70,
      rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 5, size: 8 + Math.random() * 9, life: 0, ttl: 1.6 + Math.random(),
    });
  }
}
// ambient petals that drift behind everything, in every scene
const ambient = [];
for (let i = 0; i < 14; i++) ambient.push({ x: Math.random() * W, y: Math.random() * H, s: 7 + Math.random() * 9, vy: 9 + Math.random() * 13, ph: Math.random() * 6.28, rot: Math.random() * 6.28 });

// ---------- state ----------
let phase = 'lock';          // lock | sealed | fountain | card | finale
let phaseT = 0;
let entered = '';
let lockBusy = false;
let fountainLeft = 0, spawnAcc = 0;
let typeStarted = false, cardShown = false;
let finaleT = 0, waveIdx = 0, trickleT = 0;
let heartFormed = false, heartBeatBoost = 1, heartHoldT = 0;
const heartLean = { x: 0, y: 0 };
function burstTrail(x, y) {
  petalBits.push({ x, y, vx: (Math.random() - 0.5) * 26, vy: -8 - Math.random() * 18,
    rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 3, size: 5 + Math.random() * 5, life: 0, ttl: 0.9 });
}
let started = false, musicVol = 0;
const pointer = { down: false, x: 0, y: 0, px: 0, py: 0, vx: 0, vy: 0 };

// ---------- audio ----------
function startMusic() { if (started) return; started = true; music.volume = 0; music.play().catch(() => {}); }
function rampMusic(dt) {
  musicVol += ((started ? 0.66 : 0) - musicVol) * Math.min(1, dt * 1.6);
  if (started) music.volume = Math.max(0, Math.min(1, musicVol));
}
function playSnd(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }

// ---------- floating line ----------
let lineTimer = null;
function showLine(text, holdMs) {
  lineEl.textContent = text;
  lineEl.classList.remove('hidden');
  requestAnimationFrame(() => lineEl.classList.add('show'));
  clearTimeout(lineTimer);
  lineTimer = setTimeout(() => {
    lineEl.classList.remove('show');
    setTimeout(() => lineEl.classList.add('hidden'), 1600);
  }, holdMs || 4000);
}

// ---------- phase 1: the PIN lock ----------
function refreshSlots() {
  slotsEl.forEach((s, i) => {
    s.classList.toggle('on', i < entered.length);
    s.classList.remove('bad');
  });
}
function pinKey(k) {
  if (phase !== 'lock' || lockBusy) return;
  startMusic();   // first touch anywhere starts the music bed quietly? no — music starts at unlock; keep silent here
  if (k === 'del') { entered = entered.slice(0, -1); refreshSlots(); return; }
  if (entered.length >= 4) return;
  entered += k;
  refreshSlots();
  if (entered.length === 4) {
    lockBusy = true;
    if (entered === PIN) {
      playSnd(unlockSnd);
      startMusic();
      setTimeout(() => {
        lockUI.classList.add('hidden');
        envWrap.classList.remove('hidden');
        phase = 'sealed'; phaseT = 0;
      }, 620);
    } else {
      playSnd(wrongSnd);
      slotsEl.forEach(s => s.classList.add('bad'));
      lockUI.classList.add('shake');
      setTimeout(() => {
        lockUI.classList.remove('shake');
        entered = ''; lockBusy = false; refreshSlots();
      }, 700);
    }
  }
}
document.getElementById('keypad').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) pinKey(b.dataset.k);
});

// ---------- phase 2: the envelope fountain ----------
bigEnv.addEventListener('click', () => {
  if (phase !== 'sealed') return;
  phase = 'fountain'; phaseT = 0;
  fountainLeft = 5.6;
  envWrap.classList.add('hidden');
  typeBox.classList.remove('hidden');
  playSnd(shimmer);
  burstPetals(L.cx, L.envY, 26);
  for (let i = 0; i < 54; i++) {
    addBloom(L.cx + (Math.random() - 0.5) * 60, L.envY, {
      vx: (Math.random() - 0.5) * 560, vy: -560 - Math.random() * 460,
    });
  }
});

// typewriter with human pacing: letters breathe, punctuation rests
function typewrite(el, text, done) {
  let i = 0;
  el.textContent = '';
  const step = () => {
    if (i >= text.length) { if (done) done(); return; }
    const ch = text[i++];
    el.textContent += ch;
    let d = 55;
    if (ch === ' ') d = 30;
    else if ('.,—…!'.includes(ch)) d = 360;
    else if (ch === ',') d = 200;
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

// ---------- phase 3: the card & the finale ----------
function showCard() {
  if (cardShown) return;
  cardShown = true;
  phase = 'card'; phaseT = 0;
  typeBox.classList.add('hidden');
  playSnd(chime);
  cardWrap.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => cardWrap.classList.add('show')));
}
function hideCard() {
  cardWrap.classList.remove('show');
  setTimeout(() => {
    cardWrap.classList.add('hidden');
    if (phase === 'card') { phase = 'finale'; phaseT = 0; finaleT = 0; }
    setTimeout(() => replayBtn.classList.remove('hidden'), 2400);
  }, 480);
}
document.getElementById('cardClose').addEventListener('click', hideCard);
cardWrap.addEventListener('click', (e) => { if (e.target === cardWrap) hideCard(); });
replayBtn.addEventListener('click', () => location.reload());

function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: L.heart.x + x * (L.heart.s / 16), y: L.heart.y - y * (L.heart.s / 16) };
}
function setupFinale() {
  // the heart: blooms rise from below, then converge onto the heart curve and stay
  const N = 88;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const hp = heartPoint(t);
    const b = addBloom(L.cx + (Math.random() - 0.5) * W * 0.7, H + 30 + Math.random() * 130, {
      state: 'heart', size: 25 + Math.random() * 17, ttl: 1e9,
    });
    b.tx = hp.x; b.ty = hp.y;
    b.riseDelay = Math.random() * 4.2;
  }
}
function spawnDrifters(n) {
  for (let i = 0; i < n; i++) {
    const b = addBloom(Math.random() * W, H + 26 + Math.random() * 60, {
      state: 'drift', vy: -13 - Math.random() * 19, vx: (Math.random() - 0.5) * 7,
      size: 22 + Math.random() * 30, ttl: 46,
    });
    b.baseVy = b.vy;
  }
}

// ---------- pointer for fountain wind / finale play ----------
const stage = document.getElementById('stage');
stage.addEventListener('pointerdown', (e) => {
  pointer.down = true; pointer.x = pointer.px = e.clientX; pointer.y = pointer.py = e.clientY;
  pointer.vx = pointer.vy = 0;
  heartHoldT = 0;
  if (phase === 'finale') {
    // tap a drifting bloom: it bursts into petals
    for (let i = blooms.length - 1; i >= 0; i--) {
      const b = blooms[i];
      if (b.state === 'drift' && Math.hypot(b.x - e.clientX, b.y - e.clientY) < b.size * 0.72) {
        burstPetals(b.x, b.y, 7);
        blooms.splice(i, 1);
        break;
      }
    }
    // tap the heart: the letter returns
    if (heartFormed && Math.hypot(L.heart.x - e.clientX, L.heart.y - e.clientY) < L.heart.s * 1.25) {
      cardShown = false; showCard();
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
    if (phaseT > 1.15) startType();
    if (fountainLeft > 0) {
      fountainLeft -= dt;
      const pressure = pointer.down ? 1.8 : 1;
      spawnAcc += dt * 44 * pressure;
      while (spawnAcc >= 1) {
        spawnAcc -= 1;
        addBloom(L.cx + (Math.random() - 0.5) * 76, L.envY, {
          vx: (Math.random() - 0.5) * 480,
          vy: (-540 - Math.random() * 430) * (pointer.down ? 1.14 : 1),
          size: 24 + Math.random() * 38,
        });
      }
    } else if (phaseT > 7.6 && !cardShown) {
      showCard();
    }
  }

  if (phase === 'finale') {
    finaleT += dt;
    // staggered waves, then a permanent trickle
    const waveTimes = [0.3, 6, 14];
    if (waveIdx < waveTimes.length && finaleT > waveTimes[waveIdx]) { waveIdx++; spawnDrifters(64); }
    trickleT -= dt;
    if (finaleT > 16 && trickleT <= 0) { trickleT = 2 + Math.random() * 1.4; spawnDrifters(1 + Math.floor(Math.random() * 3)); }
    if (finaleT > 8.6 && !heartFormed) {
      heartFormed = true;
      showLine('Rê tay qua biển hoa, chạm vào trái tim nhé', 5600);
    }
    heartLean.x *= Math.pow(0.12, dt); heartLean.y *= Math.pow(0.12, dt);
    if (pointer.down && (Math.abs(pointer.vx) > 0.25 || Math.abs(pointer.vy) > 0.25)) {
      for (const b of blooms) {
        if (b.state !== 'drift') continue;
        const dx = b.x - pointer.x, dy = b.y - pointer.y;
        const d = Math.hypot(dx, dy);
        if (d < 135) {
          const f = 1 - d / 135;
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
    // holding on the heart makes it beat faster and glow
    if (pointer.down && Math.hypot(L.heart.x - pointer.x, L.heart.y - pointer.y) < L.heart.s * 1.3) heartHoldT += dt; else heartHoldT = Math.max(0, heartHoldT - dt * 2);
    heartBeatBoost = 1 + Math.min(1.6, heartHoldT * 1.4);
  }

  // bloom physics
  for (let i = blooms.length - 1; i >= 0; i--) {
    const b = blooms[i];
    b.life += dt;
    if (b.state === 'fountain') {
      b.vy += 620 * dt;
      // her swiping pushes the falling flowers around
      if (pointer.down && (Math.abs(pointer.vx) > 0.3 || Math.abs(pointer.vy) > 0.3)) {
        const d = Math.hypot(b.x - pointer.x, b.y - pointer.y);
        if (d < 135) { const f = (1 - d / 135); b.vx += pointer.vx * 300 * f * dt; b.vy += pointer.vy * 200 * f * dt; }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.vx *= Math.pow(0.78, dt);
      b.rot += b.vr * dt;
      if (b.y > H * 0.94) b.fade -= dt * 1.6;
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
      const t = finaleT - (b.riseDelay || 0);
      if (t < 5) {           // rising with the others
        b.y -= dt * (26 + (b.ph % 1) * 16);
        b.x += Math.sin(now + b.ph) * 8 * dt;
      } else if (t < 8.4) {  // converging onto the curve
        const e = Math.min(1, (t - 5) / 3.4);
        const k = Math.min(1, dt * (1.2 + e * 2.2));
        b.x += (b.tx - b.x) * k;
        b.y += (b.ty - b.y) * k;
      } else {               // home: gentle breathing on the curve, leaning toward her hand
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
  // a two-thump heartbeat: lub-dub … rest
  const period = 1.15 / heartBeatBoost;
  const t = (now % period) / period;
  const thump = Math.exp(-Math.pow((t - 0.10) * 9, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.30) * 9, 2));
  return 1 + 0.055 * thump * heartBeatBoost;
}
function draw(now) {
  wctx.clearRect(0, 0, W, H);
  // ambient petals behind everything
  for (const a of ambient) {
    wctx.save();
    wctx.translate(a.x, a.y); wctx.rotate(a.rot);
    wctx.globalAlpha = 0.5;
    if (imgPetal.complete) wctx.drawImage(imgPetal, -a.s / 2, -a.s / 2, a.s, a.s);
    wctx.restore();
  }
  wctx.globalAlpha = 1;

  // the heart's glow breathes with its beat
  if (phase === 'finale' || phase === 'card') {
    const hs = heartbeatScale(now);
    wctx.globalCompositeOperation = 'lighter';
    wctx.globalAlpha = 0.30 + 0.12 * (hs - 1) * 18;
    const gs = L.heart.s * 3.1 * hs;
    wctx.drawImage(GLOW.pink, L.heart.x - gs / 2, L.heart.y - gs / 2, gs, gs);
    wctx.globalCompositeOperation = 'source-over';
    wctx.globalAlpha = 1;
  }

  const hs = phase === 'finale' || phase === 'card' ? heartbeatScale(now) : 1;
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
  fctx.clearRect(0, 0, W, H);
}

// ---------- main loop ----------
let last = performance.now();
function frame(ts) {
  const now = ts / 1000;
  let dt = (ts - last) / 1000; last = ts;
  dt = Math.min(dt, 0.033);
  if (phase === 'finale' && finaleT === 0 && blooms.every(b => b.state !== 'heart')) setupFinale();
  update(dt, now);
  draw(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hooks for automated visual verification
window.__petals = {
  phase: () => phase,
  enterPin: (digits) => { for (const d of digits) pinKey(d); },
  openEnvelope: () => bigEnv.click(),
  fountainCount: () => blooms.filter(b => b.state === 'fountain').length,
  heartFormed: () => heartFormed,
  cardVisible: () => !cardWrap.classList.contains('hidden'),
  closeCard: () => hideCard(),
  musicPlaying: () => started && !music.paused && music.currentTime > 0,
};
