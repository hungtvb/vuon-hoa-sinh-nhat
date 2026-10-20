"use strict";
/* Hành trình sinh nhật v4 — tranh watercolor ở vài chỗ tĩnh,
   hiệu ứng chủ lực vẽ bằng CSS/JS: nhành hoa nở thành bó, lời chúc bay 3D,
   lửa nến vẽ CSS trên tranh bánh, sao trời gửi điều ước. */
const $ = id => document.getElementById(id);
const stage = $("app");
const layer = $("fxLayer");
const PETAL_COLORS = ["#f7c3d0", "#f9d9b8", "#f2aec2", "#e58aa5", "#fdeeda"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
let selectedWish = null;

/* ---------- điều hướng step ---------- */
function gotoStep(id) {
  document.querySelectorAll(".step").forEach(s => s.classList.toggle("active", s.id === id));
  window.scrollTo(0, 0);
  if (id === "step-sky") initSky();
  if (id === "step-cake") $("cakeWrap").classList.add("lit");
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

/* ---------- cánh hoa tung ra tại một điểm ---------- */
function burst(x, y) {
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = "burst-petal";
    const s = rand(7, 13);
    p.style.cssText = `left:${x}px; top:${y}px; width:${s}px; height:${s}px; background:${pick(PETAL_COLORS)}`;
    layer.appendChild(p);
    const ang = rand(0, Math.PI * 2), dist = rand(42, 112);
    p.animate([
      { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist - s / 2}px, ${Math.sin(ang) * dist + rand(55, 115)}px) rotate(${rand(160, 420)}deg)`, opacity: 0 }
    ], { duration: rand(850, 1300), easing: "cubic-bezier(.17,.67,.35,1)" }).onfinish = () => p.remove();
  }
}

/* ---------- hoa vẽ bằng CSS (dùng cho bó hoa + hoa nở khi chạm) ---------- */
const FLOWER_KINDS = ["p1", "p2", "p3", "p4"];
function makeFlower(kind) {
  const f = document.createElement("div");
  f.className = "flower " + kind;
  let html = "";
  for (let i = 0; i < 8; i++) html += `<i class="fpetal" style="--r:${i * 45}deg; --d:${i * 35}ms"></i>`;
  for (let i = 0; i < 6; i++) html += `<i class="fpetal in" style="--r:${i * 60 + 30}deg; --d:${260 + i * 35}ms"></i>`;
  html += `<i class="core"></i>`;
  f.innerHTML = html;
  return f;
}
function makeSprig(h, rot, kind) {
  const s = document.createElement("div");
  s.className = "sprig";
  s.style.cssText = `--h:${h}px; --rot:${rot}deg`;
  s.innerHTML = `<i class="stem"></i><i class="leaf"></i><i class="leaf l"></i>`;
  s.appendChild(makeFlower(kind));
  return s;
}

/* ---------- STEP 1: mở phong bì ---------- */
$("btnOpen").addEventListener("click", e => {
  const r = stage.getBoundingClientRect();
  burst(e.clientX - r.left, e.clientY - r.top);
  setTimeout(() => gotoStep("step-dark"), 450);
});

/* ---------- STEP 2: bật đèn ---------- */
$("btnSwitch").addEventListener("click", () => {
  $("flash").animate([{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 750, easing: "ease-out" });
  setTimeout(() => { initReveal(); gotoStep("step-reveal"); }, 330);
});

/* ---------- STEP 3: nhành hoa nở thành bó ---------- */
let bouquetDone = false, mainSprig = null;
function initReveal() {
  if (mainSprig) return;
  const st = $("bouquetStage");
  mainSprig = makeSprig(238, 0, "p1");
  st.appendChild(mainSprig);
  requestAnimationFrame(() => setTimeout(() => mainSprig.classList.add("grown"), 120));
}
function bloomBouquet() {
  if (bouquetDone) return;
  bouquetDone = true;
  mainSprig.querySelector(".flower").classList.add("bloomed");
  const st = $("bouquetStage");
  const extras = [
    [-30, 172, "p2"], [-20, 196, "p3"], [-10, 214, "p4"], [10, 218, "p2"],
    [20, 198, "p1"], [30, 174, "p4"], [-38, 148, "p3"], [38, 150, "p1"],
  ];
  extras.forEach(([rot, h, kind], i) => {
    setTimeout(() => {
      const s = makeSprig(h, rot, kind);
      st.appendChild(s);
      requestAnimationFrame(() => {
        s.classList.add("grown");
        setTimeout(() => s.querySelector(".flower").classList.add("bloomed"), 420);
      });
    }, 260 + i * 150);
  });
  setTimeout(() => st.classList.add("showwrap"), 260 + extras.length * 150 + 500);
  setTimeout(() => {
    $("revealTitle").classList.add("shown");
    $("revealSub").classList.add("shown");
    $("revealHint").classList.add("gone");
    $("btnToCake").classList.add("show");
  }, 1500);
  const wrap = document.createElement("div");
  wrap.className = "bq-wrap";
  wrap.innerHTML = `<span class="bq-bow"><i class="l"></i><i class="r"></i><b></b></span>`;
  st.appendChild(wrap);
}
$("bouquetStage").addEventListener("pointerdown", bloomBouquet);
$("btnToCake").addEventListener("click", () => gotoStep("step-cake"));

/* ---------- STEP 4: nhấn giữ thổi nến (lửa CSS trên tranh) ---------- */
const cakePhoto = $("cakePhoto"), cakeWrap = $("cakeWrap");
let blown = false, holding = false, holdP = 0, holdRaf = null;
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
  cancelAnimationFrame(holdRaf);
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
  $("cakeTitle").textContent = "Ngọn nến đã tắt rồi!";
  $("cakeHint").textContent = "Điều ước thầm kín của chị, em đã nghe thấy rồi đó…";
  setTimeout(() => gotoStep("step-wish"), 2200);
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
$("btnToBoom").addEventListener("click", () => { gotoStep("step-boom"); startWishes(); });

/* ---------- STEP 6: lời chúc bay 3D phát sáng ---------- */
let wishesStarted = false;
const WISH_TEXTS = ["Sức khỏe dồi dào", "Luôn mỉm cười", "Bình an mỗi ngày", "Hạnh phúc ngập tràn",
  "May mắn mỉm cười", "Xinh đẹp mãi nhé", "Mọi điều như ý", "Tuổi mới rực rỡ",
  "Yêu thương đong đầy", "An yên nhé chị", "Vui vẻ mỗi ngày", "Thành công rực rỡ",
  "Cười thật nhiều", "Mãi là bông hoa đẹp nhất"];
const WISH_COLORS = ["#ffd9de", "#ffe9a8", "#ffffff", "#ffb3c6", "#ffd9b8"];
function startWishes() {
  if (wishesStarted) return;
  wishesStarted = true;
  const box = $("wish3d");
  const items = [];
  for (let r = 0; r < 2; r++) WISH_TEXTS.forEach(t => items.push(t));
  items.forEach((text, i) => {
    const el = document.createElement("span");
    el.className = "flywish";
    el.textContent = text;
    let x = rand(2, 88), y = rand(3, 92);
    if (x > 18 && x < 74 && y > 33 && y < 60) y = pick([rand(4, 26), rand(66, 90)]);
    const z = pick([-430, -320, -210, -110, -30, 50, 110]);
    const t01 = (z + 430) / 540;
    const size = 13 + t01 * 15;
    const blur = z < -260 ? 2.4 : z < -60 ? 1.1 : 0;
    const op = 0.4 + t01 * 0.6;
    const glow = z > -60 ? "text-shadow:0 0 14px rgba(255,170,200,.95),0 0 36px rgba(255,120,160,.55);" : "";
    el.style.cssText = `left:${x}%; top:${y}%; font-size:${size}px; color:${pick(WISH_COLORS)}; opacity:${op}; --blur:${blur}px; transform:translateZ(${z}px); --dur:${rand(5.5, 9.5)}s; --gdur:${rand(2.6, 4.6)}s; animation-delay:${rand(-6, 0)}s, ${rand(-3, 0)}s; ${glow}`;
    box.appendChild(el);
  });
  const sec = $("step-boom");
  sec.addEventListener("pointermove", e => {
    const r = sec.getBoundingClientRect();
    const dx = (e.clientX - r.left) / r.width - 0.5;
    const dy = (e.clientY - r.top) / r.height - 0.5;
    box.style.transform = `rotateY(${dx * 9}deg) rotateX(${-dy * 9}deg)`;
  });
  setTimeout(() => $("boomSub").classList.add("show"), 1500);
  setTimeout(() => $("btnGift").classList.add("show"), 2400);
}
$("btnGift").addEventListener("click", () => gotoStep("step-gift"));

/* ---------- STEP 7: món quà ---------- */
(function () {
  let half = "";
  for (let r = 0; r < 2; r++) {
    half += `<span class="shot"><img src="assets/art/bouquet.webp" alt=""></span>`;
    half += `<span class="shot"><img src="assets/art/cake.webp" alt=""></span>`;
    half += `<span class="shot"><img src="assets/art/envelope.webp" alt=""></span>`;
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
  const kinds = ["p1", "p2", "p3", "p4", "p1"];
  $("bloomRow").innerHTML = kinds.map(k => `<span class="mini-slot"></span>`).join("");
  document.querySelectorAll(".mini-slot").forEach((slot, i) => {
    const f = makeFlower(kinds[i]);
    slot.appendChild(f);
    setTimeout(() => f.classList.add("bloomed"), 350 + i * 160);
  });
})();
/* hoa CSS nở tại điểm chạm ở step quà */
function tapBloom(x, y) {
  const t = document.createElement("div");
  t.className = "tap-flower";
  t.style.cssText = `left:${x}px; top:${y}px`;
  const f = makeFlower(pick(FLOWER_KINDS));
  t.appendChild(f);
  layer.appendChild(t);
  requestAnimationFrame(() => f.classList.add("bloomed"));
  burst(x, y);
  setTimeout(() => {
    f.classList.remove("bloomed");
    setTimeout(() => t.remove(), 500);
  }, 2100);
}
setInterval(() => {
  if (!$("step-gift").classList.contains("active")) return;
  const r = stage.getBoundingClientRect();
  tapBloom(rand(36, r.width - 36), rand(30, r.height * 0.5));
}, 4200);
stage.addEventListener("pointerdown", e => {
  if (!$("step-gift").classList.contains("active")) return;
  if (e.target.closest("button")) return;
  const r = stage.getBoundingClientRect();
  tapBloom(e.clientX - r.left, e.clientY - r.top);
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
  $("wishStar").animate([
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
  bouquetDone = false;
  $("bouquetStage").innerHTML = "";
  mainSprig = null;
  $("revealTitle").classList.remove("shown");
  $("revealSub").classList.remove("shown");
  $("revealHint").classList.remove("gone");
  $("btnToCake").classList.remove("show");
  blown = false; holding = false; holdP = 0; holdRaf = null;
  cakeWrap.classList.remove("dim", "blowing");
  aflames().forEach(f => f.classList.remove("out"));
  clearFlames();
  $("cakeTitle").textContent = "Nến đã thắp sẵn cho chị rồi";
  $("cakeHint").innerHTML = "Nhắm mắt lại, ước một điều thật lòng…<br>rồi <b>nhấn giữ vào bánh</b> để thổi nến nhé";
  selectedWish = null;
  document.querySelectorAll(".wish-tag").forEach(t => t.classList.remove("selected"));
  $("wishNote").classList.remove("show");
  $("btnToBoom").classList.remove("show");
  $("boomSub").classList.remove("show");
  $("btnGift").classList.remove("show");
  wishSent = false;
  $("wishStar").getAnimations().forEach(a => a.cancel());
  $("skyText").textContent = "Chạm vào ngôi sao để gửi điều ước của chị đi nhé";
  $("btnRestart").classList.remove("show");
}
