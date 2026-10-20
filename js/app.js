"use strict";
/* V5 — bám sát mẫu "Điều ước dưới ánh nến" (lovegift):
   intro -> quẹt diêm thắp nến -> nhấn giữ thổi nến -> màn đen
   -> chọn thẻ ước -> trái tim ảnh -> thư tay -> thiệp -> gửi ước lên trời. */
const $ = id => document.getElementById(id);
const stage = $("app");
const layer = $("fxLayer");
const PETAL_COLORS = ["#eeb9c8", "#f2aec2", "#ffd9a8", "#e58aa5", "#f6e7da"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let selectedWish = null;

/* khóa menu mặc định của trình duyệt khi nhấn giữ (đặc biệt trên ảnh) */
document.addEventListener("contextmenu", e => e.preventDefault());

/* ---------- điều hướng ---------- */
function gotoStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
  if (id === "step-sky") initSky();
}

/* ---------- sao nền + cánh hoa rơi ---------- */
function makeStars(box, n) {
  if (box.children.length) return;
  for (let i = 0; i < n; i++) {
    const s = document.createElement("span");
    s.className = "star-dot";
    const sz = rand(1.6, 3.4);
    s.style.cssText = `left:${rand(1, 98)}%; top:${rand(1, 96)}%; width:${sz}px; height:${sz}px; animation-delay:${rand(0, 2.6)}s`;
    box.appendChild(s);
  }
}
makeStars($("introStars"), 40);
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

/* ---------- MÀN 1: bắt đầu ---------- */
$("btnStart").addEventListener("click", () => gotoStep("step-cake"));

/* ---------- MÀN 2: diêm thắp nến + nhấn giữ thổi nến ---------- */
const cakeWrap = $("cakeWrap"), cakePhoto = $("cakePhoto"), matchEl = $("match");
$("cakeTitle").classList.add("pre-hide");
$("cakeHint").classList.add("pre-hide");
let candleLit = false, blown = false, holding = false, holdP = 0, holdRaf = null;
matchEl.addEventListener("click", () => {
  if (candleLit) return;
  candleLit = true;
  matchEl.classList.add("struck");
  setTimeout(() => {
    cakeWrap.classList.add("lit");
    $("cakePre").textContent = "Nến đã cháy rồi nè";
    $("matchBox").classList.add("gone");
    $("cakeTitle").classList.add("shown");
    $("cakeHint").classList.add("shown");
  }, 680);
});
function aflames() { return cakePhoto.querySelectorAll(".aflame"); }
function applyFlames() {
  aflames().forEach(f => {
    f.style.transform = `translate(-50%,-100%) scale(${1 - 0.8 * holdP}) skewX(${-16 * holdP}deg)`;
    f.style.opacity = String(1 - 0.3 * holdP);
  });
}
function clearFlames() { aflames().forEach(f => { f.style.transform = ""; f.style.opacity = ""; }); }
function holdLoop() {
  if (holding && !blown) holdP = Math.min(1, holdP + 1 / 70);
  else if (!holding && !blown) holdP = Math.max(0, holdP - 1 / 38);
  if (!blown) { applyFlames(); holdRaf = requestAnimationFrame(holdLoop); }
  if (holdP >= 1 && !blown) blowOut();
}
function blowOut() {
  blown = true; holding = false;
  cancelAnimationFrame(holdRaf); holdRaf = null;
  aflames().forEach((f, i) => {
    f.classList.add("out"); f.style.transform = ""; f.style.opacity = "";
    const pr = cakePhoto.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const sm = document.createElement("i");
    sm.className = "smoke";
    sm.style.cssText = `left:${fr.left - pr.left + fr.width / 2}px; top:${fr.top - pr.top}px; bottom:auto`;
    cakePhoto.appendChild(sm);
    sm.animate([
      { transform: "translateY(0) scale(1)", opacity: 0.75 },
      { transform: `translateY(-${rand(44, 64)}px) translateX(${rand(-9, 9)}px) scale(2.6)`, opacity: 0 }
    ], { duration: rand(1300, 1800), delay: i * 130, easing: "ease-out" }).onfinish = () => sm.remove();
  });
  cakeWrap.classList.remove("lit", "blowing");
  cakeWrap.classList.add("dim");
  setTimeout(() => {
    gotoStep("step-black");
    requestAnimationFrame(() => $("blackText").classList.add("shown"));
    setTimeout(() => { $("blackText").classList.remove("shown"); gotoStep("step-wish"); }, 2000);
  }, 1500);
}
cakePhoto.addEventListener("pointerdown", e => {
  e.preventDefault();
  if (!candleLit || blown) return;
  holding = true;
  cakeWrap.classList.add("blowing");
  if (!holdRaf) holdLoop();
});
["pointerup", "pointercancel", "pointerleave"].forEach(ev =>
  window.addEventListener(ev, () => {
    if (!holding) return;
    holding = false;
    cakeWrap.classList.remove("blowing");
    if (!blown) clearFlames();
  }));

/* ---------- MÀN 4: chọn điều ước ---------- */
document.querySelectorAll(".wish-tag").forEach(tag => {
  tag.addEventListener("click", () => {
    document.querySelectorAll(".wish-tag").forEach(t => t.classList.remove("selected"));
    tag.classList.add("selected");
    selectedWish = tag.dataset.wish;
    const note = $("wishNote");
    note.textContent = "Điều ước đã được nhận. Mong nó từ từ thành hiện thực.";
    note.classList.add("show");
    $("btnToHeart").classList.add("show");
  });
});
$("btnToHeart").addEventListener("click", () => { initHeart(); gotoStep("step-heart"); });

/* ---------- MÀN 5: trái tim kết từ ảnh ---------- */
let heartBuilt = false, heartCelebrated = false;
function initHeart() {
  if (heartBuilt) return;
  heartBuilt = true;
  const grid = $("heartGrid");
  const arts = ["assets/art/bouquet.webp", "assets/art/cake.webp", "assets/art/envelope.webp"];
  const cols = 13, rows = 12;
  let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cell = document.createElement("div");
    cell.className = "hcell";
    const gx = (c / (cols - 1)) * 2.7 - 1.35;
    const gy = 1.25 - (r / (rows - 1)) * 2.5;
    const inside = Math.pow(gx * gx + gy * gy - 1, 3) - gx * gx * Math.pow(gy, 3) <= 0.02;
    if (!inside) { cell.classList.add("void"); grid.appendChild(cell); continue; }
    const dist = Math.hypot(c - 6, r - 5);
    cell.style.transitionDelay = `${dist * 55}ms`;
    if (k % 7 === 3) cell.classList.add("hsolid");
    else cell.innerHTML = `<img src="${arts[k % 3]}" alt="">`;
    k++;
    grid.appendChild(cell);
    requestAnimationFrame(() => setTimeout(() => cell.classList.add("in"), 30));
  }
}
function celebrateHeart() {
  if (heartCelebrated) return;
  heartCelebrated = true;
  const grid = $("heartGrid");
  grid.querySelectorAll(".hcell.in").forEach((cell, i) => {
    cell.style.animationDelay = `${(i % 9) * 45}ms`;
  });
  grid.classList.add("celebrate");
  for (let i = 0; i < 16; i++) setTimeout(spawnPetal, i * 90);
  $("heartHint").classList.add("gone");
  $("btnToLetter").classList.add("show");
  setTimeout(() => grid.classList.remove("celebrate"), 1600);
}
$("heartGrid").addEventListener("pointerdown", celebrateHeart);
$("btnToLetter").addEventListener("click", () => gotoStep("step-letter"));

/* ---------- MÀN 6 -> 7 ---------- */
$("btnToCard").addEventListener("click", () => gotoStep("step-card"));
$("btnSky").addEventListener("click", () => gotoStep("step-sky"));
$("btnReplay").addEventListener("click", () => { resetAll(); gotoStep("step-intro"); });

/* ---------- MÀN 8: gửi điều ước lên trời ---------- */
let wishSent = false;
function initSky() {
  makeStars($("stars"), 46);
  $("wishStarLabel").textContent = selectedWish ? `“${selectedWish}”` : "Một điều ước thật đẹp";
}
$("wishStar").addEventListener("click", () => {
  if (wishSent) return;
  wishSent = true;
  $("wishStar").animate([
    { transform: "translateY(0) scale(1)", opacity: 1 },
    { transform: "translateY(-36vh) scale(0.22) rotate(24deg)", opacity: 0.15 }
  ], { duration: 1500, easing: "cubic-bezier(.5,0,.8,.4)", fill: "forwards" });
  const sh = $("shooting");
  sh.classList.remove("go"); void sh.offsetWidth; sh.classList.add("go");
  setTimeout(() => { sh.classList.remove("go"); void sh.offsetWidth; sh.classList.add("go"); }, 1300);
  $("skyText").textContent = "Điều ước đã được gửi đi. Người ta nói điều ước theo sao băng sớm muộn cũng thành hiện thực. Từ đêm nay, sẽ luôn có một ngôi sao giữ lời ước ấy giúp chị.";
  $("btnRestart").classList.add("show");
});
$("btnRestart").addEventListener("click", () => { resetAll(); gotoStep("step-intro"); });

/* ---------- reset ---------- */
function resetAll() {
  candleLit = false; blown = false; holding = false; holdP = 0; holdRaf = null;
  cakeWrap.classList.remove("lit", "dim", "blowing");
  matchEl.classList.remove("struck");
  $("matchBox").classList.remove("gone");
  $("cakePre").textContent = "Đang thắp nến cho chị…";
  $("cakeTitle").classList.remove("shown");
  $("cakeHint").classList.remove("shown");
  aflames().forEach(f => f.classList.remove("out"));
  clearFlames();
  selectedWish = null;
  document.querySelectorAll(".wish-tag").forEach(t => t.classList.remove("selected"));
  $("wishNote").classList.remove("show");
  $("btnToHeart").classList.remove("show");
  heartCelebrated = false;
  $("heartGrid").classList.remove("celebrate");
  $("heartHint").classList.remove("gone");
  $("btnToLetter").classList.remove("show");
  wishSent = false;
  $("wishStar").getAnimations().forEach(a => a.cancel());
  $("skyText").textContent = "Chạm vào ngôi sao để gửi điều ước của chị đi nhé";
  $("btnRestart").classList.remove("show");
}
