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
/* Bản mờ của cánh hoa cho lớp xa — mắt đọc thành chiều sâu thật, không phải hạt nhỏ đi đơn thuần */
const petalBlur = document.createElement('canvas'); petalBlur.width = petalBlur.height = 64;
petalImg.onload = () => {
  const g = petalBlur.getContext('2d');
  try { g.filter = 'blur(3px)'; } catch (e) {}
  g.drawImage(petalImg, 4, 4, 56, 56);
};
/* Bokeh nền: đốm sáng lớn trôi rất chậm ở mặt phẳng xa nhất → thị sai với mưa chính */
const bokehCv = document.createElement('canvas'); bokehCv.width = bokehCv.height = 128;
{ const g = bokehCv.getContext('2d'); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,205,190,.85)'); gr.addColorStop(.55, 'rgba(255,190,180,.35)'); gr.addColorStop(1, 'rgba(255,190,180,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
const bokeh = [];
for (let i = 0; i < 22; i++) bokeh.push({ x: Math.random(), y: Math.random(), r: 40 + Math.random() * 115, s: .004 + Math.random() * .01, a: .07 + Math.random() * .08 });
const sparkCv = document.createElement('canvas'); sparkCv.width = sparkCv.height = 32;
{ const g = sparkCv.getContext('2d'); const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, 'rgba(255,240,205,.95)'); gr.addColorStop(.4, 'rgba(255,226,175,.5)'); gr.addColorStop(1, 'rgba(255,226,175,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }

const N = 2400;
const parts = [];
const SHORT_WORDS = WORDS.slice(1);
const HERO_WORDS = ['Chúc mừng sinh nhật', 'Tuổi mới rực rỡ', 'Cười thật nhiều', 'Luôn rạng rỡ', 'Tươi như hoa'];
/* Cụm chữ hero: tối đa ~14 cụm trên toàn màn hình, spawn có kiểm tra khoảng cách TOÀN CỤC
   với mọi hero khác (|dx|<215 và |dy|<110 là vùng cấm) → từng cụm đứng riêng, đọc được. */
function placeHero(p, init) {
  for (let t = 0; t < 12; t++) {
    const x = 105 + Math.random() * (W - 210), y = init ? Math.random() * H : -50 - Math.random() * H * .5 - t * 60;
    let ok = true;
    for (const q of parts) {
      if (q !== p && q.hero && Math.abs(q.x - x) < 215 && Math.abs(q.y - y) < 110) { ok = false; break; }
    }
    if (ok) { p.x = x; p.y = y; return; }
  }
  p.x = 105 + Math.random() * (W - 210); p.y = -80 - Math.random() * H * .8;
}
function newParticle(init) {
  const z = .12 + Math.random() * .88;               /* depth: phi tuyến qua z2 ở dưới */
  const z2 = z * z;
  const kindR = Math.random();
  const kind = kindR < .5 ? 'spark' : kindR < .9 ? 'petal' : 'word';   /* mật độ bằng cánh + sao, chữ chỉ ~10% */
  const hero = kind === 'word' && z >= .6 && Math.random() < .15;      /* ~14 hero / 240 chữ */
  const p = {
    kind, z, hero, role: 'ambient',
    x: Math.random() * W,
    y: init ? (Math.random() < .55 ? Math.random() * H : -Math.random() * H * .9) : -40 - Math.random() * H * .35,
    vy: (0.5 + Math.random() * 0.75) * (0.22 + z2 * 1.25) * (hero ? .8 : 1),
    sway: Math.random() * 6.28, swaySpd: .4 + Math.random() * .9, swayAmp: 8 + Math.random() * 16,
    rot: Math.random() * 6.28, vr: (Math.random() - .5) * .02,
    size: kind === 'word' ? (hero ? 17 + z * 11 : 8 + z * 7) : kind === 'petal' ? 6 + z2 * 27 : 2 + z2 * 7,
    word: hero ? HERO_WORDS[(Math.random() * HERO_WORDS.length) | 0] : SHORT_WORDS[(Math.random() * SHORT_WORDS.length) | 0],
    color: COLORS[(Math.random() * COLORS.length) | 0],
    font: Math.random() < .6 ? "'Dancing Script', cursive" : "'Playfair Display', serif",
    alpha: kind === 'word' ? (hero ? .92 : .1 + z * .5) : kind === 'petal' ? .16 + z * .74 : .14 + z * .6,
    gx: 0, gy: 0, sx: 0, sy: 0, vx: 0, vy2: 0, dead: false
  };
  if (hero) placeHero(p, init);
  return p;
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

/* Tim: lấy mẫu điểm đều — viền tham số + ruột bằng rejection sampling trên lưới jitter.
   Trả về điểm trong hệ tọa độ màn hình; R = bán kính chuẩn hóa. */
function heartTargets(count, scale) {
  const cx = W / 2, cy = H * .42, R = Math.min(W, H) * .40 * scale;
  const pts = [];
  const nEdge = Math.round(count * .5);
  for (let i = 0; i < nEdge; i++) {
    const t = (i / nEdge) * 6.283 + (Math.random() - .5) * .05;
    const hx = 16 * Math.pow(Math.sin(t), 3) / 16;
    const hy = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
    pts.push([cx + hx * R + (Math.random() - .5) * 5, cy - hy * R + (Math.random() - .5) * 5]);
  }
  let guard = 0;
  while (pts.length < count && guard++ < count * 30) {
    const nx = (Math.random() * 2 - 1) * 1.08, ny = (Math.random() * 2 - 1) * 1.02;
    const a = nx * nx + ny * ny - 1;
    if (a * a * a - nx * nx * ny * ny * ny <= 0) pts.push([cx + nx * R, cy - ny * R]);
  }
  return pts;
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
  /* Phân vai: lõi tim = 640 hạt (cánh/sao/từ NGẮN), quầng = 520 hạt viền tim phóng to,
     còn lại là mưa nền mờ — mọi hạt đều hội tụ nhưng lõi tim luôn sạch, đều, đọc rõ hình. */
  const coreT = heartTargets(780, 1.02), haloT = heartTargets(380, 1.18);
  const prio = p => p.kind === 'petal' ? 0 : p.kind === 'spark' ? 1 : 2;
  const shuffled = parts.slice().sort(() => Math.random() - .5).sort((a, b) => prio(a) - prio(b));
  let ci = 0, hi = 0;
  for (const p of shuffled) {
    p.sx = p.x; p.sy = p.y; p.sizeMul = 1;
    if (ci < coreT.length && p.kind !== 'word') { p.role = 'core'; p.sizeMul = 1.3; p.gx = coreT[ci][0]; p.gy = coreT[ci][1]; ci++; }
    else if (hi < haloT.length && p.kind !== 'word') { p.role = 'halo'; p.gx = haloT[hi][0]; p.gy = haloT[hi][1]; hi++; }
    else p.role = 'ambient';
  }
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
  setTimeout(showFinale, 2100);          /* burst bay ~2,1s mới lắng sang finale */
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
let orbitA = 0, orbitLast = 0;
function moveOrbit(now) {
  const dtms = Math.min(80, now - (orbitLast || now)); orbitLast = now;
  /* orbit 52s/vòng; mỗi 11s tăng tốc ×4 trong 0,75s (surge) như engine mẫu */
  const surge = (now % 11000) < 750 ? 4 : 1;
  orbitA += (6.283 / 52000) * surge * dtms;
  const cx = W / 2, cy = H * .44, R = Math.min(W, H) * .355;
  for (const c of chipEls) {
    const a = c.off + orbitA;
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
  if (p.dead) return;
  let dim = 1;
  if (p.role === 'ambient' && (state.phase === 'gather' || state.phase === 'heart' || state.phase === 'burst')) dim = .16;
  else if (p.role === 'halo' && (state.phase === 'heart' || state.phase === 'burst')) dim = .4;
  const sm = p.sizeMul || 1;
  if (p.kind === 'word') {
    ctx.globalAlpha = p.alpha * dim;
    ctx.font = (p.z > .82 ? '700 ' : '500 ') + p.size + 'px ' + p.font;
    ctx.fillStyle = p.color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.word, p.x, p.y);
  } else if (p.kind === 'petal') {
    ctx.globalAlpha = p.alpha * dim;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    const img = (p.z < .45 && petalBlur._ready !== false && petalImg.complete) ? petalBlur : petalImg;
    if (petalImg.complete) ctx.drawImage(img, -p.size * sm / 2, -p.size * sm / 2, p.size * sm, p.size * sm);
    ctx.restore();
  } else {
    ctx.globalAlpha = p.alpha * dim;
    ctx.drawImage(sparkCv, p.x - p.size * sm, p.y - p.size * sm, p.size * sm * 2, p.size * sm * 2);
  }
  ctx.globalAlpha = 1;
}
let perfChecked = false, perfFrames = 0, perfSum = 0;
function frame(now) {
  const dt = Math.min(.033, (now - lastT) / 1000); lastT = now;
  const k = dt * 60;                                   /* frame-normalized step */
  /* Lớp nền xa nhất: bokeh trôi lên cực chậm — thị sai với mưa chính tạo không gian 3D */
  if (state.phase !== 'intro') {
    for (const b of bokeh) {
      b.y -= b.s * dt; if (b.y < -.18) { b.y = 1.15; b.x = Math.random(); }
      ctx.globalAlpha = b.a;
      ctx.drawImage(bokehCv, b.x * W - b.r, b.y * H - b.r, b.r * 2, b.r * 2);
    }
    ctx.globalAlpha = 1;
  }
  /* Máy yếu: tự hạ mật độ (bản lite ~1.700 hạt) để giữ mượt — hình hài cao trào không đổi */
  if (!perfChecked && state.phase === 'rain') {
    perfFrames++; perfSum += dt;
    if (perfFrames >= 110) {
      perfChecked = true;
      if (perfSum / perfFrames > .026) {
        let culled = 0;
        for (const p of parts) { if (p.kind === 'spark' && culled < 900) { p.dead = true; culled++; } }
      }
    }
  }
  ctx.clearRect(0, 0, W, H);
  const wind = Math.sin(now * .0003) * .35;

  if (state.phase === 'heart' || state.phase === 'burst') {
    /* quầng sáng hồng sau lưng tim — neo silhouette cho tim đọc rõ trên nền sáng */
    const R = Math.min(W, H) * .54, gx = W / 2, gy = H * .42;
    const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
    gr.addColorStop(0, 'rgba(240,150,175,.26)'); gr.addColorStop(.7, 'rgba(240,150,175,.12)'); gr.addColorStop(1, 'rgba(240,150,175,0)');
    ctx.fillStyle = gr; ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
  }
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
  const rainStep = p => {
    p.sway += p.swaySpd * dt;
    p.y += p.vy * k; p.x += (Math.sin(p.sway) * .35 + wind * p.z) * k; p.rot += p.vr * k;
    if (p.y > H + 42) { const keep = { role: p.role, dead: p.dead }; Object.assign(p, newParticle(false)); p.role = keep.role; p.dead = keep.dead; }
    if (p.x < -70) p.x = W + 60; if (p.x > W + 70) p.x = -60;
  };
  if (state.phase === 'rain') {
    /* đang giữ: mưa chậm dần (nín thở) + hút xoáy quanh điểm chạm */
    const holdPr = holdStart ? Math.min(1, (now - holdStart) / HOLD_MS) : 0;
    const spd = 1 - .45 * holdPr;
    for (const p of parts) {
      if (p.dead) continue;
      p.sway += p.swaySpd * dt;
      p.y += p.vy * spd * k; p.x += (Math.sin(p.sway) * .35 + wind * p.z) * k; p.rot += p.vr * k;
      if (holdStart) {
        const dx = holdX - p.x, dy = holdY - p.y, d = Math.hypot(dx, dy);
        if (d < 250 && d > 4) { p.x += dx / d * 1.6 * k; p.y += dy / d * 1.6 * k; }
      }
      if (p.y > H + 42) Object.assign(p, newParticle(false));
      if (p.x < -70) p.x = W + 60; if (p.x > W + 70) p.x = -60;
    }
    if (holdStart) {
      rfg.style.strokeDashoffset = CIRC * (1 - holdPr);
      if (holdPr >= 1) gather();
    }
  } else if (state.phase === 'gather') {
    const p01 = Math.min(1, (now - state.gatherT0) / 1700), e = 1 - Math.pow(1 - p01, 3);
    const cx = W / 2, cy = H * .42;
    const grow = .84 + .16 * e;               /* camera đẩy vào: tim lớn dần khi hội tụ */
    for (const p of parts) {
      if (p.dead) continue;
      if (p.role === 'ambient') { rainStep(p); continue; }
      const tx = cx + (p.gx - cx) * grow, ty = cy + (p.gy - cy) * grow;
      let vx = p.sx + (tx - p.sx) * e, vy = p.sy + (ty - p.sy) * e;
      const dx = vx - cx, dy = vy - cy, ang = (1 - e) * 2.1;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      p.x = cx + dx * ca - dy * sa; p.y = cy + dx * sa + dy * ca;
      p.rot += .06 * k;
    }
    if (p01 >= 1) formHeart();
  } else if (state.phase === 'heart') {
    const el = now - state.heartAt, cyc = (el % 950) / 950;
    const pulse = cyc < .13 ? Math.sin(cyc / .13 * Math.PI) * .055 : cyc < .27 ? Math.sin((cyc - .13) / .14 * Math.PI) * .032 : 0;
    const drift = 1 + Math.min(.05, el / 1950 * .05);   /* vẫn đang tiến lại gần rất chậm */
    const cx = W / 2, cy = H * .42;
    for (const p of parts) {
      if (p.dead) continue;
      if (p.role === 'ambient') { rainStep(p); continue; }
      const s = drift * (1 + pulse);
      p.x = cx + (p.gx - cx) * s + Math.sin(now * .004 + p.gy) * .7;
      p.y = cy + (p.gy - cy) * s + Math.cos(now * .003 + p.gx) * .7;
    }
    if (el > 1950) explode();                            /* ~2 nhịp lub-dub */
  } else if (state.phase === 'burst') {
    for (const p of parts) {
      if (p.dead) continue;
      if (p.role === 'ambient') { rainStep(p); continue; }
      p.x += p.vx * k; p.y += p.vy2 * k; p.vy2 += .02 * k; p.vx *= .996; p.rot += p.vr * 3 * k;
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
