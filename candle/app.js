/* Dưới Ánh Nến — bản 19. Ánh sáng là nhân vật chính: thắp → thổi tắt → điều ước → thư. */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), hint = $('#hint'), darkness = $('#darkness');
const music = $('#music'), sChime = $('#sfxChime'), sShimmer = $('#sfxShimmer');
const fx = $('#fx'), ctx = fx.getContext('2d');
let W = 0, H = 0, DPR = 1;
function sizeFx() {
  DPR = Math.min(2, devicePixelRatio || 1);
  W = stage.clientWidth; H = stage.clientHeight;
  fx.width = W * DPR; fx.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
sizeFx(); addEventListener('resize', sizeFx);

function setHint(t) { hint.textContent = t; }
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }
function startMusic() { if (music.paused) music.play().catch(() => {}); }

/* ---------------- state ---------------- */
const state = {
  act: 'light',            // light -> blow -> silence -> wish -> letter -> done
  lit: [false, false, false, false, false],
  litCount: 0,
  blowProgress: 0, holding: false, blown: false,
  wishShown: false, letterAt: 0, letterVisible: false
};
function updateDarkness() {
  let o;
  if (state.act === 'light' || state.act === 'blow') o = 0.78 - state.litCount * 0.122;      // 0.78 -> 0.17
  else if (state.act === 'silence') o = 0.66;                                                // căn phòng lặng, tối lại
  else o = 0.5;                                                                               // ánh điều ước + thư
  darkness.style.opacity = o;
}
updateDarkness();

/* ---------------- candles & flames (canvas) ---------------- */
const candleEls = [...document.querySelectorAll('.candle')];
const flames = candleEls.map((el, i) => ({ el, phase: i * 1.7, sway: 0, seed: Math.random() * 100 }));
function flameAnchor(f) {
  const r = f.el.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + 16 }; // đầu bấc
}
const smokes = [], sparks = [], motes = [];
for (let i = 0; i < 26; i++) motes.push({ x: Math.random(), y: Math.random(), s: .6 + Math.random() * 1.6, v: .008 + Math.random() * .02, ph: Math.random() * 6.3 });

function spawnSmoke(x, y) {
  for (let i = 0; i < 16; i++) smokes.push({ x: x + (Math.random() - .5) * 8, y, vx: (Math.random() - .5) * .22, vy: -.55 - Math.random() * .6,
    r: 3 + Math.random() * 3, grow: .12 + Math.random() * .1, a: .34, curl: Math.random() * 6.3 });
}
function spawnSparks(n) {
  const cx = W / 2, cy = H * .34;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 3.4;
    sparks.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, g: .028,
      w: 3 + Math.random() * 4, h: 5 + Math.random() * 6, rot: Math.random() * 6.3, vr: (Math.random() - .5) * .25,
      col: ['#ffd9a0', '#ffb35c', '#f7a8bc', '#fff0c8'][i % 4], life: 1 });
  }
}
let windT = 0;
function drawFlame(f, i, t) {
  const a = flameAnchor(f);
  const lit = state.lit[i];
  let scale = lit ? 1 : 0;
  if (state.act === 'blow' || state.blown) scale *= Math.max(0, 1 - state.blowProgress * 1.06);
  if (scale <= 0.01) return;
  /* gió nhẹ + nhiễu rung vật lý */
  windT = t * .0011;
  const wind = Math.sin(windT * 1.3 + f.seed) * .5 + Math.sin(windT * 3.7 + f.phase) * .22;
  const blowLean = state.holding ? 7 * state.blowProgress : 0;
  const lean = wind * 2.4 + blowLean;
  const flick = 1 + Math.sin(t * .021 + f.phase * 3) * .07 + Math.sin(t * .047 + f.seed) * .05 + (Math.random() - .5) * .05;
  const hgt = 34 * scale * flick, wid = 11.5 * scale * (2 - flick * .35);
  /* quầng sáng */
  const R = 56 * scale * (1 + Math.sin(t * .009 + f.phase) * .06);
  const g = ctx.createRadialGradient(a.x, a.y - hgt * .45, 2, a.x, a.y - hgt * .45, R);
  g.addColorStop(0, 'rgba(255,196,110,.34)'); g.addColorStop(.45, 'rgba(255,160,70,.1)'); g.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(a.x, a.y - hgt * .45, R, 0, 6.3); ctx.fill();
  /* thân lửa: ngoài cam, giữa vàng, lõi trắng */
  const layers = [
    ['rgba(255,116,32,.88)', 1, 1],
    ['rgba(255,178,64,.95)', .68, .8],
    ['rgba(255,240,196,.98)', .38, .55]
  ];
  for (const [col, ws, hs] of layers) {
    const w = wid * ws, h = hgt * hs, tipX = a.x + lean * hs, tipY = a.y - h;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(a.x - w, a.y);
    ctx.bezierCurveTo(a.x - w, a.y - h * .45, tipX - w * .3, tipY + h * .4, tipX, tipY);
    ctx.bezierCurveTo(tipX + w * .3, tipY + h * .4, a.x + w, a.y - h * .45, a.x + w, a.y);
    ctx.bezierCurveTo(a.x + w * .4, a.y + 2.5, a.x - w * .4, a.y + 2.5, a.x - w, a.y);
    ctx.fill();
  }
  /* chân lửa xanh rất nhẹ */
  ctx.fillStyle = 'rgba(110,170,255,.5)';
  ctx.beginPath(); ctx.ellipse(a.x, a.y - 1, wid * .34, 3.2, 0, 0, 6.3); ctx.fill();
}
(function loop(t) {
  ctx.clearRect(0, 0, W, H);
  /* bụi sáng li ti trong không khí */
  ctx.fillStyle = 'rgba(255,214,150,.35)';
  for (const m of motes) {
    m.y -= m.v / H * 10; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); }
    const tw = .5 + .5 * Math.sin(t * .001 + m.ph);
    ctx.globalAlpha = .12 + tw * .22; ctx.beginPath(); ctx.arc(m.x * W, m.y * H, m.s, 0, 6.3); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'lighter';
  flames.forEach((f, i) => drawFlame(f, i, t || 0));
  ctx.globalCompositeOperation = 'source-over';
  /* khói */
  for (let i = smokes.length - 1; i >= 0; i--) {
    const s = smokes[i]; s.curl += .03; s.x += s.vx + Math.sin(s.curl) * .3; s.y += s.vy; s.r += s.grow; s.a -= .0035;
    if (s.a <= 0) { smokes.splice(i, 1); continue; }
    const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
    g.addColorStop(0, 'rgba(216,206,196,' + s.a + ')'); g.addColorStop(1, 'rgba(216,206,196,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.3); ctx.fill();
  }
  /* pháo giấy ấm */
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= .992; p.rot += p.vr; p.life -= .008;
    if (p.life <= 0 || p.y > H + 20) { sparks.splice(i, 1); continue; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(loop);
})(0);

/* ---------------- (1) thắp nến ---------------- */
candleEls.forEach((el, i) => {
  el.addEventListener('click', () => {
    if (state.act !== 'light' || state.lit[i]) return;
    startMusic();
    state.lit[i] = true; state.litCount++;
    el.classList.add('lit');
    playSfx(sChime);
    updateDarkness();
    if (state.litCount >= 5) {
      state.act = 'blow';
      $('#blowZone').classList.remove('hidden');
      setHint('Nhấn giữ để thổi tắt nến và ước một điều');
    } else {
      setHint('Đã thắp ' + state.litCount + ' nến — chạm tiếp nhé');
    }
  });
});

/* ---------------- (2) giữ để thổi ---------------- */
const ring = $('#holdRing'), ringFg = ring.querySelector('.rf');
const CIRC = 2 * Math.PI * 32; ringFg.style.strokeDasharray = CIRC; ringFg.style.strokeDashoffset = CIRC;
let holdStart = 0, holdRaf = 0;
function holdTick() {
  state.blowProgress = Math.min(1, (performance.now() - holdStart) / 1200);
  ringFg.style.strokeDashoffset = CIRC * (1 - state.blowProgress);
  if (state.blowProgress >= 1) { blowOut(); return; }
  holdRaf = requestAnimationFrame(holdTick);
}
function beginHold(e) {
  if (state.act !== 'blow') return;
  e.preventDefault();
  state.holding = true; ring.classList.remove('hidden');
  holdStart = performance.now() - state.blowProgress * 1200;
  cancelAnimationFrame(holdRaf); holdTick();
}
function endHold() {
  if (state.act !== 'blow' || !state.holding) return;
  state.holding = false; cancelAnimationFrame(holdRaf);
  ring.classList.add('hidden'); ringFg.style.strokeDashoffset = CIRC;
  /* thả sớm: lửa bùng trở lại */
  const decay = setInterval(() => {
    state.blowProgress = Math.max(0, state.blowProgress - .09);
    if (state.blowProgress <= 0 || state.act !== 'blow') clearInterval(decay);
  }, 30);
}
$('#blowZone').addEventListener('pointerdown', beginHold);
addEventListener('pointerup', endHold);
addEventListener('pointercancel', endHold);

function blowOut() {
  state.holding = false; state.blown = true; state.act = 'silence';
  ring.classList.add('hidden'); $('#blowZone').classList.add('hidden');
  flames.forEach(f => { const a = flameAnchor(f); spawnSmoke(a.x, a.y - 4); });
  music.volume = .22;                                   /* nhạc nhỏ đi — khoảng lặng */
  setHint('…');
  updateDarkness();
  setTimeout(showWish, 1500);                            /* lặng trọn một nhịp rồi điều ước mới hiện */
}

/* ---------------- (3) điều ước ---------------- */
function showWish() {
  if (state.act !== 'silence') return;
  state.act = 'wish'; state.wishShown = true;
  updateDarkness();
  music.volume = .5;
  const wish = $('#wish'); wish.classList.remove('hidden');
  wish.querySelectorAll('p').forEach((p, i) => setTimeout(() => p.classList.add('show'), 200 + i * 480));
  playSfx(sShimmer);
  spawnSparks(42);
  setTimeout(() => spawnSparks(22), 420);
  setHint('Có một lá thư để dành cuối buổi…');
  setTimeout(() => {
    state.act = 'letter'; state.letterAt = performance.now();
    $('#letterCard').classList.remove('hidden');
  }, 1750);
}

/* ---------------- (4) lá thư ---------------- */
const LETTER = [
  'Tối nay không ồn ào, chỉ có bánh, nến và một điều ước nhỏ.',
  'Chúc chị tuổi mới bình an, khỏe mạnh,',
  'việc gì cũng nhẹ nhàng như ngọn nến vừa thắp —',
  'lúc cần thì sáng ấm, lúc mệt thì được nghỉ ngơi.',
  'Cảm ơn chị đã luôn là người giữ lửa cho cả nhà.',
  'Sinh nhật vui vẻ, chị nhé.'
];
$('#letterCard').addEventListener('click', () => {
  if (state.act !== 'letter' && state.act !== 'done') return;
  if (performance.now() - state.letterAt < 600) {        /* arm-delay: vừa hiện chưa bấm được */
    const c = $('#letterCard'); c.classList.remove('denied'); void c.offsetWidth; c.classList.add('denied');
    return;
  }
  openLetter();
});
function openLetter() {
  if (state.letterVisible) return;
  state.letterVisible = true; state.act = 'done';
  const L = $('#letter'); L.classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 240 + i * 300);
  });
  setTimeout(() => $('.sign').classList.add('show'), 240 + LETTER.length * 300);
  setHint('Chúc mừng sinh nhật');
}
$('#closeLetter').addEventListener('click', () => {
  $('#letter').classList.add('hidden'); state.letterVisible = false;
});
$('#mute').addEventListener('click', function () {
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());

/* ---------------- hooks cho test ---------------- */
window.__candle = {
  state,
  get lit() { return state.litCount; },
  get blow() { return state.blowProgress; },
  get blown() { return state.blown; },
  get letterArmed() { return performance.now() - state.letterAt >= 600; },
  openLetter,
  get letterVisible() { return state.letterVisible; },
  musicPlaying: () => !music.paused
};
