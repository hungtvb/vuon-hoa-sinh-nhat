"use strict";
/* Hành trình 8 step — Material 3 Expressive.
   Phong bì -> phòng tối/bật đèn -> reveal -> thắp & thổi nến (nhấn giữ)
   -> chọn điều ước -> bùng nổ vườn hoa -> thiệp quà -> gửi ước lên trời. */
const $ = id => document.getElementById(id);
const stage = $("app");
const layer = $("fxLayer");
const PETAL_COLORS = ["#ffd9de", "#ffdad5", "#ffdbcc", "#f6a8b8", "#e58aa5"];
const BLOOM_ICONS = ["local_florist", "filter_vintage", "spa", "favorite"];
const BLOOM_BG = ["#ffd9de", "#ffdbcc", "#ffdad5", "#bc004b"];
const BLOOM_FG = ["#bc004b", "#894f33", "#82524b", "#ffffff"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let selectedWish = null;

/* ---------- điều hướng step ---------- */
function gotoStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
  if (id === "step-sky") initSky();
}

/* ---------- cánh hoa rơi xuyên suốt ---------- */
function spawnPetal() {
  if (layer.querySelectorAll(".petal").length > 22) return;
  const p = document.createElement("div");
  p.className = "petal";
  const s = rand(9, 17);
  p.style.cssText = `left:${rand(0, 97)}%; width:${s}px; height:${s}px; background:${pick(PETAL_COLORS)}; animation-duration:${rand(6.5, 11)}s`;
  layer.appendChild(p);
  setTimeout(() => p.remove(), 11500);
}
for (let i = 0; i < 6; i++) setTimeout(spawnPetal, i * 420);
setInterval(spawnPetal, 750);

/* ---------- hoa nở + cánh tung tại điểm (dùng ở step quà + phong bì) ---------- */
function bloomAt(x, y, size, parent) {
  const i = Math.floor(Math.random() * BLOOM_ICONS.length);
  const f = document.createElement("div");
  f.className = "tap-bloom";
  f.style.cssText = `left:${x}px; top:${y}px; width:${size}px; height:${size}px; background:${BLOOM_BG[i]}; color:${BLOOM_FG[i]}`;
  f.innerHTML = `<span class="msr">${BLOOM_ICONS[i]}</span>`;
  (parent || layer).appendChild(f);
  f.animate([
    { transform: "translate(-50%,-50%) scale(0) rotate(-24deg)", opacity: 0 },
    { transform: "translate(-50%,-50%) scale(1.14) rotate(5deg)", opacity: 1, offset: 0.55 },
    { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1, offset: 0.78 },
    { transform: "translate(-50%,-50%) scale(0.9) rotate(0deg)", opacity: 0 }
  ], { duration: 2500, easing: "ease-out" }).onfinish = () => f.remove();
}
function burst(x, y, parent) {
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = "burst-petal";
    const s = rand(7, 13);
    p.style.cssText = `left:${x}px; top:${y}px; width:${s}px; height:${s}px; background:${pick(PETAL_COLORS)}`;
    (parent || layer).appendChild(p);
    const ang = rand(0, Math.PI * 2), dist = rand(42, 112);
    p.animate([
      { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist - s / 2}px, ${Math.sin(ang) * dist + rand(55, 115)}px) rotate(${rand(160, 420)}deg)`, opacity: 0 }
    ], { duration: rand(850, 1300), easing: "cubic-bezier(.17,.67,.35,1)" }).onfinish = () => p.remove();
  }
}

/* ---------- STEP 1: mở phong bì ---------- */
$("btnOpen").addEventListener("click", () => {
  const env = $("envelope");
  if (env.classList.contains("open")) return;
  env.classList.add("open");
  const r = env.getBoundingClientRect(), sr = stage.getBoundingClientRect();
  burst(r.left - sr.left + r.width / 2, r.top - sr.top + 30);
  setTimeout(() => gotoStep("step-dark"), 1150);
});

/* ---------- STEP 2: bật đèn ---------- */
$("btnSwitch").addEventListener("click", () => {
  const fl = $("flash");
  fl.animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 750, easing: "ease-out" });
  setTimeout(() => { initReveal(); gotoStep("step-reveal"); }, 330);
});

/* ---------- STEP 3: reveal bữa tiệc ---------- */
function initReveal() {
  const box = $("balloons");
  box.innerHTML = "";
  const colors = ["#bc004b", "#f6a8b8", "#ff7d9c", "#ffb59e", "#e58aa5", "#ffd9de", "#ff9d76"];
  for (let i = 0; i < 8; i++) {
    const b = document.createElement("div");
    b.className = "balloon";
    b.style.cssText = `left:${rand(2, 90)}%; background:${colors[i % colors.length]}; animation-delay:${rand(0, 1.4)}s; animation-duration:${rand(6, 8.5)}s`;
    box.appendChild(b);
    setTimeout(() => b.remove(), 11000);
  }
  const kinds = [["local_florist", "c1"], ["filter_vintage", "c2"], ["spa", "c3"], ["favorite", "c2"], ["local_florist", "c1"]];
  $("revealFlowers").innerHTML = kinds.map(([ico, cls], i) =>
    `<span class="cell ${cls}" style="animation-delay:${0.25 + 0.15 * i}s"><span class="msr">${ico}</span></span>`).join("");
}
$("btnToCake").addEventListener("click", () => gotoStep("step-cake"));

/* ---------- STEP 4: thắp nến + nhấn giữ thổi nến ---------- */
const cakeEl = $("cake"), cakeWrap = $("cakeWrap");
let lit = false, blown = false, holding = false, holdP = 0, holdRaf = null;
function flames() { return cakeEl.querySelectorAll(".flame"); }
function applyFlames() {
  flames().forEach(f => {
    f.style.transform = `scale(${1 - 0.8 * holdP}) skewX(${-16 * holdP}deg)`;
    f.style.opacity = String(1 - 0.3 * holdP);
  });
}
function clearFlames() { flames().forEach(f => { f.style.transform = ""; f.style.opacity = ""; }); }
function holdLoop() {
  if (holding && lit && !blown) holdP = Math.min(1, holdP + 1 / 70);
  else if (!holding && lit && !blown) holdP = Math.max(0, holdP - 1 / 38);
  if (lit && !blown) { applyFlames(); holdRaf = requestAnimationFrame(holdLoop); }
  if (holdP >= 1 && !blown) blowOut();
}
function lightCandles() {
  lit = true;
  cakeWrap.classList.add("lit");
  $("cakeTitle").textContent = "Nhắm mắt lại, ước một điều thật lòng nhé";
  $("cakeHint").innerHTML = "Xong rồi thì <b>nhấn giữ vào bánh</b> để thổi nến —<br>giữ đến khi lửa tắt hẳn nha";
  holdLoop();
}
function blowOut() {
  blown = true; holding = false;
  cancelAnimationFrame(holdRaf);
  flames().forEach(f => { f.classList.add("out"); f.style.transform = ""; f.style.opacity = ""; });
  cakeWrap.classList.remove("lit", "blowing");
  cakeWrap.classList.add("dim");
  cakeEl.querySelectorAll(".candle").forEach((c, i) => {
    const sm = document.createElement("i");
    sm.className = "smoke";
    c.appendChild(sm);
    sm.animate([
      { transform: "translateY(0) scale(1)", opacity: 0.8 },
      { transform: `translateY(-${rand(46, 70)}px) translateX(${rand(-9, 9)}px) scale(2.6)`, opacity: 0 }
    ], { duration: rand(1300, 1800), delay: i * 130, easing: "ease-out" }).onfinish = () => sm.remove();
  });
  $("cakeTitle").textContent = "Ngọn nến đã tắt rồi!";
  $("cakeHint").textContent = "Điều ước thầm kín của chị, em đã nghe thấy rồi đó…";
  setTimeout(() => gotoStep("step-wish"), 2100);
}
cakeEl.addEventListener("pointerdown", e => {
  e.preventDefault();
  if (blown) return;
  if (!lit) { lightCandles(); return; }
  holding = true;
  cakeWrap.classList.add("blowing");
});
["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
  window.addEventListener(ev, () => {
    if (!holding) return;
    holding = false;
    cakeWrap.classList.remove("blowing");
    if (lit && !blown) clearFlames();
  }));

/* ---------- STEP 5: chọn điều ước ---------- */
document.querySelectorAll(".wish-tag").forEach(tag => {
  tag.addEventListener("click", () => {
    document.querySelectorAll(".wish-tag").forEach(t => t.classList.remove("selected"));
    tag.classList.add("selected");
    selectedWish = tag.dataset.wish;
    const note = $("wishNote");
    note.textContent = `Điều ước “${selectedWish}” đã được nhận. Mong nó từ từ thành hiện thực nhé chị.`;
    note.classList.add("show");
    $("btnToBoom").classList.add("show");
  });
});
$("btnToBoom").addEventListener("click", () => { gotoStep("step-boom"); startBoom(); });

/* ---------- STEP 6: bùng nổ vườn hoa + pháo hoa ---------- */
let boomStarted = false;
function startBoom() {
  if (boomStarted) return;
  boomStarted = true;
  const title = $("boomTitle");
  title.innerHTML = "";
  "SINH NHẬT".split("").forEach((ch, i) => {
    const s = document.createElement("span");
    s.className = "ch";
    s.textContent = ch === " " ? "\u00A0" : ch;
    s.style.animationDelay = `${0.55 + i * 0.075}s`;
    title.appendChild(s);
  });
  bloomWave();
  setTimeout(bloomWave, 1000);
  startFireworks();
  setTimeout(() => $("boomSub").classList.add("show"), 1900);
  setTimeout(() => $("btnGift").classList.add("show"), 2500);
}
function bloomWave() {
  const wl = $("waveLayer");
  const W = wl.clientWidth, H = wl.clientHeight;
  const cx = W / 2, cy = H * 0.44;
  const cols = 6, rows = 9;
  for (let gx = 0; gx < cols; gx++) for (let gy = 0; gy < rows; gy++) {
    const x = (gx + 0.5) * (W / cols) + rand(-14, 14);
    const y = (gy + 0.5) * (H / rows) + rand(-14, 14);
    const dist = Math.hypot(x - cx, y - cy);
    const i = Math.floor(Math.random() * BLOOM_ICONS.length);
    const o = document.createElement("div");
    o.className = "wave-orb";
    const sz = rand(38, 56);
    o.style.cssText = `left:${x}px; top:${y}px; width:${sz}px; height:${sz}px; background:${BLOOM_BG[i]}; color:${BLOOM_FG[i]}`;
    o.innerHTML = `<span class="msr">${BLOOM_ICONS[i]}</span>`;
    wl.appendChild(o);
    o.animate([
      { transform: "translate(-50%,-50%) scale(0) rotate(-24deg)", opacity: 0 },
      { transform: "translate(-50%,-50%) scale(1.16) rotate(5deg)", opacity: 1, offset: 0.4 },
      { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1, offset: 0.7 },
      { transform: "translate(-50%,-50%) scale(0.85)", opacity: 0 }
    ], { duration: 2100, delay: dist * 2.1, easing: "ease-out" }).onfinish = () => o.remove();
  }
}
let fw = null;
function startFireworks() {
  const cv = $("fwCanvas");
  const sec = $("step-boom");
  cv.width = sec.clientWidth; cv.height = sec.clientHeight;
  const ctx = cv.getContext("2d");
  if (fw && fw.raf) cancelAnimationFrame(fw.raf);
  fw = { parts: [], raf: 0, last: 0 };
  const colors = ["#ffd9de", "#ffdbcc", "#f6a8b8", "#ffffff", "#ffca3a", "#ff7d9c"];
  const loop = t => {
    if (!sec.classList.contains("active")) return;
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (t - fw.last > 800) {
      fw.last = t;
      const cx = rand(40, cv.width - 40), cy = rand(30, cv.height * 0.36);
      const c = pick(colors);
      for (let i = 0; i < 42; i++) {
        const a = Math.PI * 2 * i / 42, sp = rand(1.4, 4);
        fw.parts.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, c });
      }
    }
    fw.parts = fw.parts.filter(p => p.life > 0);
    fw.parts.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.03; p.vx *= 0.985; p.life -= 0.013;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, 6.29); ctx.fill();
    });
    ctx.globalAlpha = 1;
    fw.raf = requestAnimationFrame(loop);
  };
  fw.raf = requestAnimationFrame(loop);
}
$("btnGift").addEventListener("click", () => gotoStep("step-gift"));

/* ---------- STEP 7: món quà ---------- */
(function () {
  let half = "";
  for (let r = 0; r < 3; r++) {
    half += `<span class="shot"><img src="assets/photos/hero.jpg" alt=""></span>`;
    half += `<span class="shot"><img src="assets/photos/bouquet.jpg" alt=""></span>`;
  }
  $("trackPhoto").innerHTML = half + half;
  const items = [
    ["local_florist", "Chúc mừng sinh nhật", 0], ["favorite", "Sức khỏe", 1],
    ["auto_awesome", "Rực rỡ", 0], ["spa", "Bình an", 1],
    ["cake", "Ngọt ngào", 0], ["celebration", "Hạnh phúc", 1],
  ];
  let w = "";
  for (let r = 0; r < 2; r++) items.forEach(([ico, text, alt]) => {
    w += `<span class="witem${alt ? " alt" : ""}"><span class="msr">${ico}</span>${text}</span>`;
  });
  $("trackWord").innerHTML = w + w;
  const kinds = [["local_florist", "c1"], ["filter_vintage", "c2"], ["spa", "c3"], ["favorite", "c2"], ["local_florist", "c1"]];
  $("bloomRow").innerHTML = kinds.map(([ico, cls], i) =>
    `<span class="cell ${cls}" style="animation-delay:${0.15 * i}s"><span class="msr">${ico}</span></span>`).join("");
})();
/* hoa tự nở thỉnh thoảng ở step quà */
setInterval(() => {
  if (!$("step-gift").classList.contains("active")) return;
  const r = stage.getBoundingClientRect();
  bloomAt(rand(36, r.width - 36), rand(30, r.height * 0.5), rand(40, 54));
}, 3800);
/* chạm ở step quà: hoa nở tại điểm chạm */
stage.addEventListener("pointerdown", e => {
  if (!$("step-gift").classList.contains("active")) return;
  if (e.target.closest("button")) return;
  const r = stage.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top + window.scrollY;
  bloomAt(x, e.clientY - r.top, rand(52, 70));
  burst(x, e.clientY - r.top);
});
$("btnSky").addEventListener("click", () => gotoStep("step-sky"));
$("btnReplay").addEventListener("click", () => { resetAll(); gotoStep("step-sealed"); });

/* ---------- STEP 8: gửi điều ước lên trời ---------- */
let wishSent = false;
function initSky() {
  const box = $("stars");
  if (!box.children.length) {
    for (let i = 0; i < 46; i++) {
      const s = document.createElement("span");
      s.className = "star-dot";
      const sz = rand(1.6, 3.4);
      s.style.cssText = `left:${rand(1, 98)}%; top:${rand(1, 96)}%; width:${sz}px; height:${sz}px; animation-delay:${rand(0, 2.6)}s`;
      box.appendChild(s);
    }
  }
  $("wishStarLabel").textContent = selectedWish ? `“${selectedWish}”` : "Một điều ước thật đẹp";
}
$("wishStar").addEventListener("click", () => {
  if (wishSent) return;
  wishSent = true;
  const star = $("wishStar");
  star.animate([
    { transform: "translateY(0) scale(1)", opacity: 1 },
    { transform: "translateY(-36vh) scale(0.22) rotate(24deg)", opacity: 0.15 }
  ], { duration: 1500, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
  const sh = $("shooting");
  sh.classList.remove("go"); void sh.offsetWidth; sh.classList.add("go");
  setTimeout(() => { sh.classList.remove("go"); void sh.offsetWidth; sh.classList.add("go"); }, 1300);
  $("skyText").textContent = "Điều ước của chị đã bay lên trời rồi. Người ta nói, điều ước gửi theo sao thì sớm muộn cũng thành hiện thực — từ đêm nay, sẽ luôn có một ngôi sao giữ điều ước ấy giúp chị.";
  $("btnRestart").classList.add("show");
});
$("btnRestart").addEventListener("click", () => { resetAll(); gotoStep("step-sealed"); });

/* ---------- reset toàn bộ hành trình ---------- */
function resetAll() {
  $("envelope").classList.remove("open");
  lit = false; blown = false; holding = false; holdP = 0;
  cancelAnimationFrame(holdRaf);
  cakeWrap.classList.remove("lit", "dim", "blowing");
  flames().forEach(f => f.classList.remove("out"));
  clearFlames();
  $("cakeTitle").textContent = "Thắp nến cho chị nè";
  $("cakeHint").textContent = "Chạm vào bánh để thắp nến";
  selectedWish = null;
  document.querySelectorAll(".wish-tag").forEach(t => t.classList.remove("selected"));
  $("wishNote").classList.remove("show");
  $("btnToBoom").classList.remove("show");
  boomStarted = false;
  $("boomSub").classList.remove("show");
  $("btnGift").classList.remove("show");
  wishSent = false;
  $("wishStar").getAnimations().forEach(a => a.cancel());
  $("skyText").textContent = "Chạm vào ngôi sao để gửi điều ước của chị đi nhé";
  $("btnRestart").classList.remove("show");
}
