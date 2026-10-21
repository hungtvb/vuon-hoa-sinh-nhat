/* Mưa Lời Chúc — bản 18. Canvas 2D vanilla: mưa lời chúc → giữ gom tim → nổ → thư → thẻ bay orbit. */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), cv = $('#sky'), ctx = cv.getContext('2d');
const hintEl = $('#hint'), music = $('#music'), sChime = $('#sfx-chime'), sShimmer = $('#sfx-shimmer');
let W = 0, H = 0, DPR = 1;
function sizeCv() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = stage.clientWidth; H = stage.clientHeight;
  cv.width = W * DPR; cv.height = H * DPR;
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
sizeCv(); addEventListener('resize', sizeCv);

function buzz(p) {
  let ok = false;
  if (navigator.vibrate) { try { ok = navigator.vibrate(p); } catch (e) { ok = false; } }
  if (!ok) { document.body.classList.remove('vib'); void document.body.offsetWidth; document.body.classList.add('vib'); setTimeout(() => document.body.classList.remove('vib'), 200); }
}
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }
function setHint(t) { if (t) { hintEl.textContent = t; hintEl.classList.remove('hidden'); } else hintEl.classList.add('hidden'); }

/* ---------------- particles ---------------- */
const WORDS = ['Chúc mừng sinh nhật', 'Sức khỏe', 'Bình an', 'Hạnh phúc', 'Luôn rạng rỡ', 'Sum vầy', 'Vui vẻ', 'May mắn', 'An nhiên', 'Tươi như hoa', 'Cười thật nhiều', 'Tuổi mới rực rỡ'];
const COLORS = ['#B0526F', '#C9657F', '#D06A86', '#C07A54', '#A85B7E', '#C95D63'];
const petalImg = new Image(); petalImg.src = 'assets/img/petal.webp';
const roseImg = new Image(); roseImg.src = 'assets/img/rose.webp';
const sparkCv = document.createElement('canvas'); sparkCv.width = sparkCv.height = 32;
{ const g = sparkCv.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,205,.95)'); gr.addColorStop(.4, 'rgba(255,226,175,.5)'); gr.addColorStop(1, 'rgba(255,226,175,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }

const N = 1450;
const parts = [];
const SHORT_WORDS = WORDS.slice(1);
function pickWord() { return Math.random() < .14 ? WORDS[0] : SHORT_WORDS[(Math.random() * SHORT_WORDS.length) | 0]; }
function newParticle(init) {
  const z = .35 + Math.random() * .65;               /* depth layer */
  const kindR = Math.random();
  const kind = kindR < .3 ? 'word' : kindR < .68 ? 'petal' : 'spark';
  return {
    kind, z,
    x: Math.random() * W,
    y: init ? (Math.random() < .55 ? Math.random() * H : -Math.random() * H * .9) : -40 - Math.random() * H * .35,
    vy: (0.55 + Math.random() * 0.9) * (0.45 + z),   /* far = slower */
    sway: Math.random() * 6.28, swaySpd: .4 + Math.random() * .9, swayAmp: 8 + Math.random() * 16,
    rot: Math.random() * 6.28, vr: (Math.random() - .5) * .02,
    size: kind === 'word' ? 11 + z * 10.5 : kind === 'petal' ? 11 + z * 17 : 3.5 + z * 5.5,
    word: pickWord(),
    color: COLORS[(Math.random() * COLORS.length) | 0],
    font: Math.random() < .6 ? "'Dancing Script', cursive" : "'Playfair Display', serif",
    alpha: kind === 'word' ? .3 + z * .55 : kind === 'petal' ? .45 + z * .45 : .35 + z * .4,
    gx: 0, gy: 0, sx: 0, sy: 0, vx: 0, vy2: 0, dead: false
  };
}
for (let i = 0; i < N; i++) parts.push(newParticle(true));
/* gentle finale rain */
const lite = [];
function spawnLite() { lite.length = 0; for (let i = 0; i < 240; i++) { const p = newParticle(true); p.kind = Math.random() < .6 ? 'petal' : 'spark'; lite.push(p); } }
/* burst petals (finale chip taps) */
const bursts = [];
function petalBurst(x, y, n) {
  for (let i = 0; i < n; i++) bursts.push({ x, y, vx: (Math.random() - .5) * 5.4, vy: -Math.random() * 4.4 - 1.2,
    g: .05 + Math.random() * .05, s: 12 + Math.random() * 20, r: Math.random() * 6.28, vr: (Math.random() - .5) * .16 });
}

/* ---------------- state ---------------- */
const state = { phase: 'intro', heartAt: 0, gatherT0: 0, burstT0: 0, letterAt: 0, armAt: 0 };
let holdStart = 0, holdX = 0, holdY = 0, lastTapAt = 0;
const ring = $('#ring'), rfg = ring.querySelector('.rfg');
const CIRC = 2 * Math.PI * 31; rfg.style.strokeDasharray = CIRC; rfg.style.strokeDashoffset = CIRC;
const HOLD_MS = 1400;

function heartPoint() {
  const t = Math.random() * 6.283, u = Math.sqrt(Math.random());
  const hx = 16 * Math.pow(Math.sin(t), 3);
  const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  const S = Math.min(W, H) / 37, cx = W / 2, cy = H * .42;
  return [cx + S * hx * u, cy - S * hy * u];
}

function start() {
  if (state.phase !== 'intro') return;
  $('#intro').classList.add('gone');
  $('#mute').classList.remove('hidden');
  music.play().catch(() => {});
  state.phase = 'rain';
  setHint('Nhấn giữ để gom tim — hoặc chạm 2 lần');
  buzz(20);
}
function gather() {
  if (state.phase !== 'rain') return;
  state.phase = 'gather'; state.gatherT0 = performance.now();
  ring.classList.add('hidden'); holdStart = 0;
  setHint('');
  for (const p of parts) { p.sx = p.x; p.sy = p.y; const g = heartPoint(); p.gx = g[0]; p.gy = g[1]; }
  buzz([25, 40, 25]);
}
function formHeart() {
  state.phase = 'heart'; state.heartAt = performance.now();
  playSfx(sChime); buzz([35, 50, 35]);
}
function explode() {
  state.phase = 'burst'; state.burstT0 = performance.now();
  const cx = W / 2, cy = H * .42;
  for (const p of parts) {
    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1, sp = 2 + Math.random() * 6.5;
    p.vx = dx / d * sp; p.vy2 = dy / d * sp - 1.2;
  }
  const fl = $('#flash'); fl.style.opacity = .8; setTimeout(() => fl.style.opacity = 0, 130);
  playSfx(sShimmer); buzz([60, 40, 140]);
  setTimeout(showFinale, 1150);
}
function showFinale() {
  if (state.phase !== 'burst') return;
  state.phase = 'finale';
  spawnLite();
  const card = $('#lettercard'); card.classList.remove('hidden');
  state.armAt = performance.now() + 600;      /* chống chạm xuyên */
  buildOrbit();
  $('#orbit').classList.remove('hidden');
  setHint('Chạm vào lá thư nhé');
}

/* ---------------- letter ---------------- */
const LETTER = [
  'Hôm nay em gom hết những lời chúc đẹp nhất, thả vào một cơn mưa gửi tới chị.',
  'Sức khỏe, để chị luôn rạng rỡ như hoa buổi sớm.',
  'Bình an, để lòng chị nhẹ tênh, ngủ ngon mỗi đêm.',
  'Hạnh phúc, cho cả những ngày thường nhất.',
  'Và sum vầy, cho những bữa cơm nhà luôn đủ tiếng cười.',
  'Tuổi mới, chúc chị nở rộ theo cách của riêng mình —',
  'dịu dàng, rực rỡ và được thương thật nhiều.'
];
function openLetter() {
  if (state.phase !== 'finale' && state.phase !== 'letter') return;
  if (performance.now() < state.armAt) {           /* chưa hết arm-delay */
    const c = $('#lettercard'); c.classList.remove('locked'); void c.offsetWidth; c.classList.add('locked');
    return;
  }
  if (state.phase === 'letter') return;
  state.phase = 'letter'; state.letterAt = performance.now();
  buzz(20);
  $('#letter').classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 200 + i * 260);
  });
  setTimeout(() => $('.sign').classList.add('show'), 200 + LETTER.length * 260);
  setHint('Chạm vào những thẻ chữ đang bay quanh nhé');
}
$('#lettercard').addEventListener('click', e => { e.stopPropagation(); openLetter(); });
$('#closeLetter').addEventListener('click', () => {
  $('#letter').classList.add('hidden');
  if (state.phase === 'letter') state.phase = 'finale';
  buzz(15);
});

/* ---------------- orbit chips ---------------- */
const CHIPS = ['Sức khỏe', 'Bình an', 'Hạnh phúc', 'Sum vầy', 'Luôn rạng rỡ', 'May mắn'];
const chipEls = [];
function buildOrbit() {
  const box = $('#orbit'); box.innerHTML = ''; chipEls.length = 0;
  CHIPS.forEach((w, i) => {
    const d = document.createElement('div'); d.className = 'chip'; d.textContent = w;
    d.addEventListener('click', e => {
      e.stopPropagation();
      const r = d.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      petalBurst(r.left - sr.left + r.width / 2, r.top - sr.top + r.height / 2, 16);
      d.classList.add('pop'); setTimeout(() => d.classList.remove('pop'), 260);
      buzz(15);
    });
    box.appendChild(d); chipEls.push({ el: d, off: i / CHIPS.length * 6.283 });
  });
}
function moveOrbit(now) {
  const cx = W / 2, cy = H * .44, R = Math.min(W, H) * .355, t = now * .00016;
  for (const c of chipEls) {
    const a = c.off + t;
    c.el.style.left = (cx + Math.cos(a) * R) + 'px';
    c.el.style.top = (cy + Math.sin(a) * R * .82) + 'px';
  }
}

/* ---------------- input: start / hold / double-tap ---------------- */
stage.addEventListener('pointerdown', e => {
  const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  if (state.phase === 'intro') { start(); return; }
  if (state.phase !== 'rain') return;
  /* chạm đúp = đường thay thế */
  const now = performance.now();
  if (now - lastTapAt < 330) { lastTapAt = 0; gather(); return; }
  lastTapAt = now;
  holdStart = now; holdX = x; holdY = y;
  ring.style.left = x + 'px'; ring.style.top = y + 'px'; ring.classList.remove('hidden');
});
addEventListener('pointerup', () => {
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
});
addEventListener('pointercancel', () => {
  if (holdStart) { holdStart = 0; ring.classList.add('hidden'); rfg.style.strokeDashoffset = CIRC; }
});
$('#mute').addEventListener('click', function (e) {
  e.stopPropagation();
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- render loop ---------------- */
let lastT = performance.now();
function drawParticle(p) {
  if (p.kind === 'word') {
    ctx.globalAlpha = p.alpha;
    ctx.font = (p.z > .82 ? '700 ' : '500 ') + p.size + 'px ' + p.font;
    ctx.fillStyle = p.color;
    ctx.fillText(p.word, p.x, p.y);
  } else if (p.kind === 'petal') {
    ctx.globalAlpha = p.alpha;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    if (petalImg.complete) ctx.drawImage(petalImg, -p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  } else {
    ctx.globalAlpha = p.alpha;
    ctx.drawImage(sparkCv, p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
  }
  ctx.globalAlpha = 1;
}
function frame(now) {
  const dt = Math.min(.033, (now - lastT) / 1000); lastT = now;
  const k = dt * 60;                                   /* frame-normalized step */
  ctx.clearRect(0, 0, W, H);
  const wind = Math.sin(now * .0003) * .35;

  if (state.phase === 'rain' || state.phase === 'gather' || state.phase === 'heart' || state.phase === 'burst') {
    for (const p of parts) drawParticle(p);
  } else if (state.phase === 'finale' || state.phase === 'letter') {
    for (const p of lite) drawParticle(p);
  }
  for (const b of bursts) {
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.globalAlpha = .95;
    if (petalImg.complete) ctx.drawImage(petalImg, -b.s / 2, -b.s / 2, b.s, b.s);
    ctx.restore(); ctx.globalAlpha = 1;
  }

  /* --- updates per phase --- */
  if (state.phase === 'rain') {
    for (const p of parts) {
      p.sway += p.swaySpd * dt;
      p.y += p.vy * k; p.x += (Math.sin(p.sway) * .35 + wind * p.z) * k; p.rot += p.vr * k;
      if (holdStart) {                                  /* hút nhẹ quanh điểm chạm */
        const dx = holdX - p.x, dy = holdY - p.y, d = Math.hypot(dx, dy);
        if (d < 150 && d > 4) { p.x += dx / d * 1.1 * k; p.y += dy / d * 1.1 * k; }
      }
      if (p.y > H + 42) { Object.assign(p, newParticle(false)); }
      if (p.x < -70) p.x = W + 60; if (p.x > W + 70) p.x = -60;
    }
    if (holdStart) {
      const pr = (now - holdStart) / HOLD_MS;
      rfg.style.strokeDashoffset = CIRC * (1 - Math.min(1, pr));
      if (pr >= 1) gather();
    }
  } else if (state.phase === 'gather') {
    const p01 = Math.min(1, (now - state.gatherT0) / 1700), e = 1 - Math.pow(1 - p01, 3);
    const cx = W / 2, cy = H * .42;
    for (const p of parts) {
      let vx = p.sx + (p.gx - p.sx) * e, vy = p.sy + (p.gy - p.sy) * e;
      const dx = vx - cx, dy = vy - cy, ang = (1 - e) * 2.1;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      p.x = cx + dx * ca - dy * sa; p.y = cy + dx * sa + dy * ca;
      p.rot += .06 * k;
    }
    if (p01 >= 1) formHeart();
  } else if (state.phase === 'heart') {
    const el = now - state.heartAt, cyc = (el % 950) / 950;
    const pulse = cyc < .13 ? Math.sin(cyc / .13 * Math.PI) * .055 : cyc < .27 ? Math.sin((cyc - .13) / .14 * Math.PI) * .032 : 0;
    const cx = W / 2, cy = H * .42;
    for (const p of parts) {
      p.x = cx + (p.gx - cx) * (1 + pulse) + Math.sin(now * .004 + p.gy) * .7;
      p.y = cy + (p.gy - cy) * (1 + pulse) + Math.cos(now * .003 + p.gx) * .7;
    }
    if (el > 1950) explode();                            /* ~2 nhịp lub-dub */
  } else if (state.phase === 'burst') {
    for (const p of parts) {
      p.x += p.vx * k; p.y += p.vy2 * k; p.vy2 += .028 * k; p.rot += p.vr * 3 * k;
    }
  } else if (state.phase === 'finale' || state.phase === 'letter') {
    for (const p of lite) {
      p.sway += p.swaySpd * dt;
      p.y += p.vy * .55 * k; p.x += (Math.sin(p.sway) * .3 + wind * p.z) * k; p.rot += p.vr * k;
      if (p.y > H + 42) { Object.assign(p, newParticle(false)); p.kind = Math.random() < .6 ? 'petal' : 'spark'; }
    }
    moveOrbit(now);
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]; b.x += b.vx * k; b.y += b.vy * k; b.vy += b.g * k; b.r += b.vr * k;
    if (b.y > H + 40) bursts.splice(i, 1);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
if (document.fonts && document.fonts.load) {
  document.fonts.load("700 20px 'Dancing Script'"); document.fonts.load("500 20px 'Playfair Display'");
}

/* ---------------- hooks for testing ---------------- */
window.__rain = {
  get phase() { return state.phase; },
  start, gather, openLetter,
  get heartFormed() { return state.heartAt > 0; },
  get letterVisible() { return !$('#letter').classList.contains('hidden'); },
  musicPlaying: () => !music.paused
};
