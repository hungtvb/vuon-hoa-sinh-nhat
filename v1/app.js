"use strict";
/* BẢN 1 — Tiệc sinh nhật trong vườn hoa (tông sáng pastel hồng + kem) */
const $ = id => document.getElementById(id);
const layer = $("fxLayer");
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let selectedWish = null;
document.addEventListener("contextmenu", e => e.preventDefault());

function gotoStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
  if (id === "step-cake") $("cakeWrap").classList.add("lit");
  if (id === "step-rain") startWishes();
}

/* cánh hoa rơi nền sáng */
const PETALS = ["#F7A8C4", "#FFD9A8", "#F49AC1", "#FBC2D5", "#FFF1C9"];
function spawnPetal() {
  if (layer.querySelectorAll(".petal").length > 20) return;
  const p = document.createElement("div");
  p.className = "petal";
  const s = rand(9, 16);
  p.style.cssText = `left:${rand(0, 97)}%; width:${s}px; height:${s}px; background:${pick(PETALS)}; animation-duration:${rand(6.5, 11)}s`;
  layer.appendChild(p);
  setTimeout(() => p.remove(), 11500);
}
for (let i = 0; i < 5; i++) setTimeout(spawnPetal, i * 400);
setInterval(spawnPetal, 800);

/* ---------- MÀN 1 -> 2 ---------- */
$("btnOpen").addEventListener("click", () => { initParty(); gotoStep("step-party"); });

/* ---------- MÀN 2: bóng bay tìm sao ---------- */
let partyBuilt = false, starFound = false;
const BALLOON_COLORS = ["#F78FB3", "#FFB59E", "#FFD66B", "#C3A6E8", "#9AD6C2", "#9CC3E5", "#F49AC1", "#FFC7D6"];
function initParty() {
  if (partyBuilt) return;
  partyBuilt = true;
  const field = $("balloonField");
  const starIdx = Math.floor(rand(0, 12));
  for (let i = 0; i < 12; i++) {
    const b = document.createElement("div");
    b.className = "balloon";
    const c = pick(BALLOON_COLORS);
    b.style.cssText = `left:${rand(1, 86)}%; background:${c}; animation-duration:${rand(11, 19)}s; animation-delay:${-rand(0, 14)}s`;
    if (i === starIdx) { b.dataset.star = "1"; b.innerHTML = '<span class="bstar">★</span>'; }
    b.addEventListener("pointerdown", ev => {
      ev.preventDefault();
      if (b.classList.contains("popped")) return;
      b.classList.add("popped");
      burstBits(b, field);
      if (b.dataset.star) foundStar();
    });
    field.appendChild(b);
  }
}
function burstBits(b, field) {
  const fr = field.getBoundingClientRect(), br = b.getBoundingClientRect();
  const cx = br.left - fr.left + br.width / 2, cy = br.top - fr.top + br.height / 2;
  for (let i = 0; i < 6; i++) {
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    bit.style.cssText = `left:${cx}px; top:${cy}px; background:${pick(BALLOON_COLORS)}`;
    field.appendChild(bit);
    bit.animate([
      { transform: "translate(0,0) rotate(0deg)", opacity: 1 },
      { transform: `translate(${rand(-60, 60)}px, ${rand(30, 110)}px) rotate(${rand(-260, 260)}deg)`, opacity: 0 }
    ], { duration: rand(550, 850), easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => bit.remove();
  }
}
function foundStar() {
  if (starFound) return;
  starFound = true;
  $("partyHint").textContent = "Tìm thấy ngôi sao may mắn rồi! Điều may mắn đầu tiên của tuổi mới đã đến.";
  $("btnToCake").classList.add("show");
  for (let i = 0; i < 12; i++) setTimeout(spawnPetal, i * 80);
}
$("btnToCake").addEventListener("click", () => gotoStep("step-cake"));

/* ---------- MÀN 3: thổi nến ---------- */
const cakeWrap = $("cakeWrap"), cakePhoto = $("cakePhoto");
let blown = false, holding = false, holdP = 0, holdRaf = null;
const aflames = () => cakePhoto.querySelectorAll(".aflame");
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
    const pr = cakePhoto.getBoundingClientRect(), fr = f.getBoundingClientRect();
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
  setTimeout(() => { initGarden(); gotoStep("step-garden"); }, 1600);
}
cakePhoto.addEventListener("pointerdown", e => {
  e.preventDefault();
  if (blown) return;
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

/* ---------- MÀN 4: vườn hoa điều ước ---------- */
const TONES = ["p1", "p2", "p3", "p4"];
function makeLeaf(cls) { const l = document.createElement("div"); l.className = "fleaf " + cls; return l; }
function makeFlower(tone) {
  const f = document.createElement("div");
  f.className = "flower " + tone;
  for (let i = 0; i < 8; i++) {
    const p = document.createElement("i");
    p.className = "fpetal outer";
    p.style.setProperty("--r", (i * 45) + "deg");
    p.style.setProperty("--d", rand(0, 40) + "ms");
    f.appendChild(p);
  }
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("i");
    p.className = "fpetal inner";
    p.style.setProperty("--r", (i * 60 + 24) + "deg");
    p.style.setProperty("--d", (110 + i * 35) + "ms");
    f.appendChild(p);
  }
  const c = document.createElement("i");
  c.className = "fcenter";
  f.appendChild(c);
  return f;
}
function makeSprig(h, rot, tone, fs) {
  const s = document.createElement("div");
  s.className = "sprig";
  s.style.cssText = `--h:${h}px; --rot:${rot}deg; --fs:${fs}px`;
  const stem = document.createElement("div"); stem.className = "fstem";
  s.appendChild(stem); s.appendChild(makeLeaf("l1")); s.appendChild(makeLeaf("l2"));
  const fl = makeFlower(tone); s.appendChild(fl);
  s._flower = fl;
  return s;
}
let gardenBuilt = false, gardenBloomed = false;
function initGarden() {
  if (gardenBuilt) return;
  gardenBuilt = true;
  const stage = $("gardenStage");
  const hero = makeSprig(215, 0, "p1", 96);
  hero.style.left = "50%";
  stage.appendChild(hero);
  requestAnimationFrame(() => setTimeout(() => hero.classList.add("grown"), 80));
  stage._hero = hero;
}
function bloomGarden() {
  if (gardenBloomed || !gardenBuilt) return;
  gardenBloomed = true;
  const stage = $("gardenStage");
  const hero = stage._hero;
  hero._flower.classList.add("bloomed");
  const rots = [-38, -27, -16, -6, 7, 17, 28, 39];
  rots.forEach((rot, i) => {
    setTimeout(() => {
      const sp = makeSprig(rand(150, 205), rot, TONES[i % 4], rand(56, 76));
      sp.style.left = "50%";
      stage.appendChild(sp);
      requestAnimationFrame(() => {
        sp.classList.add("grown");
        setTimeout(() => sp._flower.classList.add("bloomed"), 260);
      });
      if (i === rots.length - 1) setTimeout(showWishChips, 800);
    }, 200 + i * 170);
  });
}
function showWishChips() {
  $("gardenTitle").textContent = "…đã nở thành một bó hoa!";
  $("gardenHint").style.display = "none";
  $("wishChips").classList.add("show");
}
$("gardenStage").addEventListener("pointerdown", bloomGarden);
document.querySelectorAll(".wish-chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".wish-chip").forEach(c => c.classList.remove("selected"));
    chip.classList.add("selected");
    selectedWish = chip.dataset.wish;
    $("btnToRain").classList.add("show");
  });
});
$("btnToRain").addEventListener("click", () => gotoStep("step-rain"));

/* ---------- MÀN 5: mưa lời chúc ---------- */
const WISHES = ["Chúc chị luôn khỏe mạnh", "Cười thật nhiều nhé chị", "Tuổi mới rực rỡ hơn", "Mãi xinh đẹp như hôm nay",
  "Mọi điều ước đều thành thật", "Hạnh phúc ngập tràn", "Bình an mỗi ngày", "May mắn luôn mỉm cười",
  "Công việc thuận lợi", "Được thương thật nhiều", "Thêm một tuổi thêm vui", "Luôn là bông hoa đẹp nhất"];
let wishesStarted = false;
function startWishes() {
  if (wishesStarted) return;
  wishesStarted = true;
  const wall = $("wishWall");
  const layers = [
    { n: 10, z: -380, blur: 2.4, size: 14 },
    { n: 10, z: -190, blur: 1.1, size: 18 },
    { n: 8, z: 60, blur: 0, size: 23 }
  ];
  let k = 0;
  layers.forEach((L) => {
    for (let i = 0; i < L.n; i++) {
      const s = document.createElement("span");
      s.className = "wish3d";
      const txt = WISHES[k % WISHES.length]; k++;
      s.textContent = txt;
      let topPos = rand(3, 88);
      if (L.z > 0) { /* lớp gần: né vùng tiêu đề ở giữa màn */
        topPos = Math.random() < 0.5 ? rand(3, 24) : rand(64, 88);
      }
      s.style.cssText = `left:${rand(2, 52)}%; top:${topPos}%; --z:${L.z + rand(-36, 36)}px; --blur:${L.blur}px; font-size:${L.size}px; animation-duration:${rand(6, 10)}s,${rand(2.6, 4)}s; animation-delay:${-rand(0, 6)}s`;
      wall.appendChild(s);
    }
  });
  wall.addEventListener("pointermove", e => {
    const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
    wall.style.transform = `rotateY(${nx * 9}deg) rotateX(${-ny * 7}deg)`;
  });
  setTimeout(() => $("btnToFinal").classList.add("show"), 2200);
}
$("btnToFinal").addEventListener("click", () => { buildFinal(); gotoStep("step-final"); });

/* ---------- MÀN 6: thiệp ---------- */
let finalBuilt = false;
function buildFinal() {
  if (finalBuilt) return;
  finalBuilt = true;
  const row = $("miniRow");
  for (let i = 0; i < 5; i++) {
    const holder = document.createElement("div");
    holder.className = "mini-flower";
    const f = makeFlower(TONES[i % 4]);
    holder.appendChild(f);
    row.appendChild(holder);
    setTimeout(() => f.classList.add("bloomed"), 350 + i * 260);
  }
}
$("btnAgain").addEventListener("click", () => location.reload());
