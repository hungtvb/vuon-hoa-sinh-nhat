/* Người Giao Hoa — bản 17. Một bó hoa xuyên suốt 4 cảnh. */
'use strict';
const $ = s => document.querySelector(s);
const stage = $('#stage'), hint = $('#hint'), toast = $('#toast');
const music = $('#music'), sBell = $('#sfx-bell'), sKnock = $('#sfx-knock'), sSpray = $('#sfx-spray');
const scenes = { shop: $('#scene-shop'), street: $('#scene-street'), door: $('#scene-door'), garden: $('#scene-garden') };
const bouquet = $('#bouquet'), bheads = $('#bheads'), bcard = $('#bcard');
const fx = $('#fx'), fctx = fx.getContext('2d');
let W = 0, H = 0;
function sizeFx() { W = fx.width = stage.clientWidth; H = fx.height = stage.clientHeight; }
sizeFx(); addEventListener('resize', sizeFx);

/* ---- haptics: rung thật trên Android, rung giả (lắc hình) trên iPhone ---- */
function buzz(p) {
  let ok = false;
  if (navigator.vibrate) { try { ok = navigator.vibrate(p); } catch (e) { ok = false; } }
  if (!ok) {
    document.body.classList.remove('vib'); void document.body.offsetWidth;
    document.body.classList.add('vib'); setTimeout(() => document.body.classList.remove('vib'), 200);
  }
}
function setHint(t, aboveTray) { hint.textContent = t; hint.classList.toggle('above-tray', !!aboveTray); }
let toastTimer = null;
function showToast(t) {
  toast.textContent = t; toast.classList.remove('hidden', 'pop'); void toast.offsetWidth;
  toast.classList.add('pop'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2450);
}
function playSfx(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }

/* ---- particles ---- */
const petalImg = new Image(); petalImg.src = 'assets/img/petal.webp';
const parts = [];
function burst(x, y, n, spread, up) {
  for (let i = 0; i < n; i++) parts.push({ k: 'p', x, y, vx: (Math.random() - .5) * spread, vy: -Math.random() * (up || 3) - 1,
    g: .045 + Math.random() * .04, s: 12 + Math.random() * 22, r: Math.random() * 6.3, vr: (Math.random() - .5) * .15, life: 1 });
}
function droplets(x, y, n) {
  for (let i = 0; i < n; i++) parts.push({ k: 'd', x: x + (Math.random() - .5) * 30, y: y + (Math.random() - .5) * 14,
    vx: (Math.random() - .5) * 1.4, vy: 1 + Math.random() * 2, g: .02, s: 2 + Math.random() * 3, r: 0, vr: 0, life: 1 });
}
function rain(n) { for (let i = 0; i < n; i++) parts.push({ k: 'p', x: Math.random() * W, y: -30 - Math.random() * H * .4,
  vx: -.4 - Math.random() * .8, vy: .6 + Math.random() * 1.1, g: .004, s: 12 + Math.random() * 20, r: Math.random() * 6.3, vr: (Math.random() - .5) * .1, life: 1 }); }
(function loop() {
  fctx.clearRect(0, 0, W, H);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.r += p.vr;
    if (p.k === 'p') p.vx += Math.sin(p.y * .02 + p.r) * .02;
    if (p.y > H + 40 || p.x < -50 || p.x > W + 50) { parts.splice(i, 1); continue; }
    fctx.save(); fctx.translate(p.x, p.y); fctx.rotate(p.r);
    if (p.k === 'p') { if (petalImg.complete) fctx.drawImage(petalImg, -p.s / 2, -p.s / 2, p.s, p.s); }
    else { fctx.fillStyle = 'rgba(170,215,245,.75)'; fctx.beginPath(); fctx.arc(0, 0, p.s, 0, 6.3); fctx.fill(); }
    fctx.restore();
  }
  requestAnimationFrame(loop);
})();

/* ---- state ---- */
const FLOWERS = {
  peony:     { slot: [50, 30, 62, -4], wish: 'Mẫu đơn — một năm thật rực rỡ' },
  lisianthus:{ slot: [30, 12, 50, -10], wish: 'Cát tường — bình an mỗi ngày' },
  tulip:     { slot: [72, 18, 44, 9],  wish: 'Tulip — hạnh phúc ngập tràn' },
  hydrangea: { slot: [18, 42, 48, 4],  wish: 'Tú cầu — sum vầy ấm áp' },
  baby:      { slot: [84, 44, 40, -6], wish: 'Baby — trăm điều nhỏ bé dễ thương' }
};
const state = { act: 'bell', stems: 0, mist: 0, folds: 0, ride: 0, knocks: 0, bloomed: false, cardOpened: false, letterShown: false };
window.__courier = { state, buzz, musicPlaying: () => !music.paused };

function gotoScene(name) {
  for (const k in scenes) {
    const el = scenes[k], was = el.classList.contains('active');
    el.classList.toggle('active', k === name);
    el.classList.toggle('gone', was && k !== name);
  }
}

/* ============ MÀN 1: chuông cửa ============ */
$('#bell').addEventListener('click', () => {
  if (state.act !== 'bell') return;
  const bell = $('#bell'); bell.classList.add('rung'); setTimeout(() => bell.classList.remove('rung'), 550);
  playSfx(sBell); buzz(25);
  music.play().catch(() => {});
  $('.sunbeam').classList.add('on');
  setTimeout(() => {
    bouquet.classList.remove('hidden');
    state.act = 'mist';
    setHint('Vuốt nhẹ để phun sương cho hoa tỉnh giấc');
  }, 450);
});

/* ============ MÀN 2: phun sương ============ */
let mistLast = 0;
scenes.shop.addEventListener('pointermove', e => {
  if (state.act !== 'mist' || !e.isPrimary) return;
  const now = performance.now(); if (now - mistLast < 60) return; mistLast = now;
  const r = stage.getBoundingClientRect();
  droplets(e.clientX - r.left, e.clientY - r.top, 3);
  if (Math.random() < .3) playSfx(sSpray);
  state.mist++;
  if (state.mist === 4) $('.shopbg').style.filter = 'saturate(.94) brightness(1.025)';
  if (state.mist === 8) $('.shopbg').classList.add('awake');
  if (state.mist >= 12) {
    state.act = 'stems';
    bouquet.className = 'pos-wrap'; bouquet.id = 'bouquet';
    $('#tray').classList.add('show');
    setHint('Kéo từng cành hoa vào bó — hoặc chạm để cắm', true);
    showToast('Hoa đã tỉnh giấc');
  }
});

/* ============ MÀN 3: bó hoa ============ */
function addStem(name, el) {
  if (state.act !== 'stems' || el.classList.contains('used')) return;
  el.classList.add('used');
  const f = FLOWERS[name];
  const img = document.createElement('img');
  img.src = 'assets/img/' + name + '.webp'; img.className = 'bhead'; img.alt = '';
  img.style.left = f.slot[0] + '%'; img.style.top = f.slot[1] + '%'; img.style.width = f.slot[2] + '%';
  img.style.setProperty('--r', f.slot[3] + 'deg'); img.style.zIndex = 3 + state.stems;
  bheads.appendChild(img);
  requestAnimationFrame(() => img.classList.add('in'));
  state.stems++; buzz(15);
  showToast(f.wish);
  if (state.stems >= 5) {
    setTimeout(() => {
      state.act = 'wrap';
      $('#tray').classList.remove('show');
      setHint('Vuốt lên — hoặc chạm vào bó hoa — để gấp giấy gói');
    }, 600);
  }
}
document.querySelectorAll('.trayitem').forEach(el => {
  const name = el.dataset.flower;
  let ghost = null, moved = false, sx = 0, sy = 0;
  el.addEventListener('pointerdown', e => {
    if (state.act !== 'stems') return;
    sx = e.clientX; sy = e.clientY; moved = false;
    ghost = document.createElement('img'); ghost.src = 'assets/img/' + name + '.webp'; ghost.className = 'dragghost';
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
    document.body.appendChild(ghost);
    el.setPointerCapture(e.pointerId);
  });
  el.addEventListener('pointermove', e => {
    if (!ghost) return;
    if (Math.abs(e.clientX - sx) + Math.abs(e.clientY - sy) > 12) moved = true;
    ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
  });
  el.addEventListener('pointerup', e => {
    if (!ghost) return;
    const g = ghost; ghost = null; g.remove();
    if (!moved) { addStem(name, el); return; }
    const br = bouquet.getBoundingClientRect(), cx = br.left + br.width / 2, cy = br.top + br.height * .3;
    if (Math.hypot(e.clientX - cx, e.clientY - cy) < br.width * .75) addStem(name, el);
  });
  el.addEventListener('pointercancel', () => { if (ghost) { ghost.remove(); ghost = null; } });
});

/* ============ MÀN 4: gói + thắt nơ + gắn thiệp ============ */
let swipeY = null;
stage.addEventListener('pointerdown', e => { if (state.act === 'wrap') swipeY = e.clientY; });
stage.addEventListener('pointerup', e => {
  if (state.act !== 'wrap' || swipeY === null) return;
  const dy = swipeY - e.clientY; swipeY = null;
  if (dy < 24 && dy > 6) return; /* vuốt ngắn thì bỏ qua; vuốt rõ hoặc chạm nhẹ đều tính */
  state.folds++;
  $('.flap-' + (state.folds === 1 ? 'l' : 'r')).classList.add('fold');
  buzz(20);
  if (state.folds >= 2) {
    state.act = 'ribbon';
    $('#ribbon').classList.add('on');
    setHint('Nhấn giữ để thắt nơ cho bó hoa');
  }
});
/* ribbon hold */
const ring = $('#holdring'), ringFg = ring.querySelector('.ringfg');
const CIRC = 2 * Math.PI * 26; ringFg.style.strokeDasharray = CIRC; ringFg.style.strokeDashoffset = CIRC;
let holdStart = 0, holdRaf = 0;
function holdTick() {
  const p = Math.min(1, (performance.now() - holdStart) / 520);
  ringFg.style.strokeDashoffset = CIRC * (1 - p);
  if (p >= 1) { finishBow(); return; }
  holdRaf = requestAnimationFrame(holdTick);
}
bouquet.addEventListener('pointerdown', e => {
  if (state.act === 'ribbon') {
    ring.classList.add('show'); holdStart = performance.now(); cancelAnimationFrame(holdRaf); holdTick();
  } else if (state.act === 'card') {
    attachCard();
  }
});
addEventListener('pointerup', () => {
  if (state.act === 'ribbon' && holdStart) { cancelAnimationFrame(holdRaf); holdStart = 0; ring.classList.remove('show'); ringFg.style.strokeDashoffset = CIRC; }
});
function finishBow() {
  holdStart = 0; ring.classList.remove('show');
  $('#ribbon').classList.add('bowed'); buzz([30, 50, 30]);
  const r = bouquet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  burst(r.left - sr.left + r.width / 2, r.top - sr.top + r.height * .4, 10, 4, 2.5);
  state.act = 'card';
  setHint('Chạm vào bó hoa để gắn tấm thiệp');
}
function attachCard() {
  bcard.classList.add('on'); buzz(20); state.act = 'ridePrep';
  setHint('Xong rồi! Giữ tay để đạp xe mang hoa đi giao');
  setTimeout(() => {
    gotoScene('street');
    bouquet.className = 'pos-basket'; bouquet.id = 'bouquet';
    $('#bike').classList.add('bob');
    state.act = 'ride';
  }, 750);
}
bcard.addEventListener('click', e => {
  e.stopPropagation();
  if (state.act === 'garden') { openLetter(); return; }
  if (state.act !== 'ride' && state.act !== 'knock' && state.act !== 'ridePrep') return;
  bcard.classList.remove('sealed'); void bcard.offsetWidth; bcard.classList.add('sealed');
  showToast('Để tới nơi hãy mở nhé');
});

/* ============ MÀN 5: đạp xe qua phố ============ */
const strip = $('#streetStrip'), ridefill = $('#ridefill');
let pedaling = false, downhillDone = false;
scenes.street.addEventListener('pointerdown', () => {
  if (state.act !== 'ride') return;
  pedaling = true;
  state.ride = Math.min(1, state.ride + 0.045); /* chạm cũng tiến một đoạn — không bắt giữ tay suốt */
});
addEventListener('pointerup', () => pedaling = false);
let lastRideHint = '';
setInterval(() => {
  if (state.act !== 'ride') return;
  if (pedaling) state.ride = Math.min(1, state.ride + 0.0115);
  const stripW = strip.scrollWidth, view = stage.clientWidth;
  strip.style.transform = 'translateX(' + (-(stripW - view) * state.ride) + 'px)';
  ridefill.style.width = (state.ride * 100) + '%';
  if (state.ride > .5 && !downhillDone) {
    downhillDone = true; rain(26); buzz(25);
    state.ride = Math.min(1, state.ride + 0.1); /* xuống dốc: xe tự vọt đi một đoạn */
    showToast('Xuống dốc — thả tay cho xe trôi');
  }
  const h = state.ride < .45 ? 'Giữ tay để đạp xe' : state.ride < .9 ? 'Sắp tới rồi, cố lên' : 'Tới nơi rồi';
  if (h !== lastRideHint) { lastRideHint = h; setHint(h); }
  if (state.ride >= 1) {
    state.act = 'knockPrep';
    setTimeout(() => {
      gotoScene('door');
      bouquet.className = 'pos-door'; bouquet.id = 'bouquet';
      music.volume = .35;
      state.act = 'knock';
      setHint('Chạm gõ cửa ba nhịp nhé');
    }, 500);
  }
}, 50);

/* ============ MÀN 6: gõ cửa ============ */
$('#knocker').addEventListener('click', () => {
  if (state.act !== 'knock') return;
  state.knocks++; playSfx(sKnock); buzz(45);
  const d = scenes.door; d.classList.remove('knocked'); void d.offsetWidth; d.classList.add('knocked');
  if (state.knocks < 3) setHint('Gõ thêm ' + (3 - state.knocks) + ' nhịp nữa');
  else {
    state.act = 'partyPrep'; setHint('…');
    setTimeout(openParty, 750);
  }
});

/* ============ MÀN 7: bất ngờ vườn tiệc ============ */
function openParty() {
  gotoScene('garden');
  bouquet.className = 'pos-garden'; bouquet.id = 'bouquet';
  music.volume = 1;
  buzz([60, 40, 160]);
  const fl = $('.gardenflash'); fl.style.opacity = .85; setTimeout(() => fl.style.opacity = 0, 120);
  setTimeout(() => {
    /* the bouquet blooms once more */
    [['rose', 50, 2, 66, -6], ['peony', 12, 20, 46, 8], ['rose', 88, 22, 46, 10]].forEach(a => {
      const img = document.createElement('img');
      img.src = 'assets/img/' + a[0] + '.webp'; img.className = 'bhead extra';
      img.style.left = a[1] + '%'; img.style.top = a[2] + '%'; img.style.width = a[3] + '%';
      img.style.setProperty('--r', a[4] + 'deg'); img.style.zIndex = 9;
      bheads.appendChild(img); requestAnimationFrame(() => img.classList.add('in'));
    });
    bouquet.classList.add('bloom');
    state.bloomed = true;
    const r = bouquet.getBoundingClientRect(), sr = stage.getBoundingClientRect();
    burst(r.left - sr.left + r.width / 2, r.top - sr.top, 34, 6, 4);
    rain(18);
    state.act = 'garden';
    setHint('Chạm vào tấm thiệp trên bó hoa');
  }, 600);
}

/* ============ MÀN 8: thư ============ */
const LETTER = [
  'Sáng nay em ghé tiệm hoa từ sớm, tự tay chọn từng cành cho chị:',
  'mẫu đơn cho một năm thật rực rỡ, cát tường cho bình an,',
  'tulip cho hạnh phúc, cẩm tú cầu cho những bữa cơm sum vầy,',
  'và baby trắng cho trăm điều nhỏ bé dễ thương.',
  'Bó xong, em đạp xe mang qua phố — chỉ để nói một câu:',
  'cảm ơn chị đã luôn ở đây, thương mọi người theo cách dịu dàng nhất.',
  'Tuổi mới, chúc chị khỏe, vui, và lúc nào cũng được thương',
  'nhiều như cách chị thương mọi người vậy.'
];
function openLetter() {
  if (state.act !== 'garden' || state.letterShown && !$('#letter').classList.contains('hidden')) return;
  state.cardOpened = true; buzz(20);
  const L = $('#letter'); L.classList.remove('hidden');
  const body = $('#letterBody'); body.innerHTML = '';
  LETTER.forEach((line, i) => {
    const p = document.createElement('p'); p.textContent = line; body.appendChild(p);
    setTimeout(() => p.classList.add('show'), 220 + i * 260);
  });
  setTimeout(() => { $('.sign').classList.add('show'); state.letterShown = true; }, 220 + LETTER.length * 260);
  setHint('Chạm đâu trong vườn, hoa nở ở đó');
}
$('#closeLetter').addEventListener('click', () => { $('#letter').classList.add('hidden'); buzz(15); });
scenes.garden.addEventListener('click', e => {
  if (state.act !== 'garden' || !state.letterShown) return;
  const r = stage.getBoundingClientRect();
  burst(e.clientX - r.left, e.clientY - r.top, 8, 3.4, 2.4);
});

/* mute */
$('#mute').addEventListener('click', function () {
  music.muted = !music.muted; this.classList.toggle('off', music.muted);
});
document.addEventListener('contextmenu', e => e.preventDefault());
