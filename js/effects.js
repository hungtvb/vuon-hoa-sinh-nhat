"use strict";
/* ===== Hiệu ứng sinh nhật: hoa nở, chữ chạy, cánh hoa tung bay, chạm là nở hoa ===== */
const $ = id => document.getElementById(id);
const stage = $("app");
const layer = $("fxLayer");
const PETAL_COLORS = ["#D94F7A", "#F06292", "#F8BBD0", "#9C1C4C", "#FF9EBB"];
const FLOWERS = ["rose", "bloom2", "goldflower", "bloomX", "daisy", "bloom1", "tulip", "bloomXX"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

/* --- mây + lấp lánh trang trí --- */
[["6%", "4%", 110, 34], ["13%", "58%", 130, 40], ["3%", "74%", 84, 28]].forEach(([t, l, w, h]) => {
  const c = document.createElement("div");
  c.className = "cloud";
  c.style.cssText = `top:${t}; left:${l}; width:${w}px; height:${h}px`;
  stage.appendChild(c);
});
for (let i = 0; i < 7; i++) {
  const s = document.createElement("div");
  s.className = "sparkle";
  const sz = rand(16, 30);
  s.style.cssText = `top:${rand(2, 55)}%; left:${rand(2, 92)}%; width:${sz}px; animation-delay:${rand(0, 2)}s`;
  s.innerHTML = SPR.sparkle();
  stage.appendChild(s);
}
/* --- bướm + ong bay --- */
[["butterflyFly", "9%", "6%", 46, 0], ["beeFly", "17%", "84%", 38, 1.2]].forEach(([k, t, l, w, d]) => {
  const f = document.createElement("div");
  f.className = "fx-fly";
  f.style.cssText = `top:${t}; left:${l}; width:${w}px; animation-delay:${d}s`;
  f.innerHTML = SPR[k]();
  stage.appendChild(f);
});

/* --- vườn hoa nở ở đầu + cuối trang --- */
function fillGarden(el, kinds) {
  el.innerHTML = kinds.map((k, i) =>
    `<span class="bf sway${i % 2 ? " small" : ""}" style="animation-delay:${0.18 * i}s,${1 + 0.18 * i}s">${SPR[k]()}</span>`).join("");
}
fillGarden($("gardenTop"), ["bloom1", "rose", "bloomX", "goldflower", "bloom2"]);
fillGarden($("gardenBottom"), ["tulip", "daisy", "bloom2", "rose", "bloomX", "goldflower", "bloom1"]);

/* thỉnh thoảng một bông trong vườn nở lại */
setInterval(() => {
  const all = stage.querySelectorAll(".fx-garden .bf");
  if (!all.length) return;
  const b = pick(all);
  const old = b.style.animationDelay;
  b.style.animation = "none";
  void b.offsetWidth;
  b.style.animation = "";
  b.style.animationDelay = old;
}, 3800);

/* --- hình + chữ chạy 2 dải ngược chiều --- */
function fillTrack(el, items) {
  let half = "";
  for (let r = 0; r < 2; r++) items.forEach(([icon, text]) => {
    half += `<span class="fx-item">${SPR[icon]()}<i${text === "Chúc mừng sinh nhật" ? ' class="fx-shimmer"' : ""}>${text}</i></span>`;
  });
  el.innerHTML = half + half;
}
fillTrack($("trackA"), [["rose", "Chúc mừng sinh nhật"], ["sparkle", "Chúc mừng sinh nhật"], ["goldflower", "Chúc mừng sinh nhật"], ["heart", "Chúc mừng sinh nhật"]]);
fillTrack($("trackB"), [["daisy", "Sức khỏe"], ["candy", "Ngọt ngào"], ["tulip", "Xinh đẹp"], ["bell", "May mắn"], ["bow", "Hạnh phúc"], ["sun", "Bình an"]]);

/* --- cánh hoa tung bay rơi liên tục --- */
function spawnPetal() {
  if (layer.querySelectorAll(".fx-petal").length > 24) return;
  const p = document.createElement("div");
  p.className = "fx-petal";
  const s = rand(8, 18);
  p.style.cssText = `left:${rand(0, 98)}%; width:${s}px; height:${s}px; background:${pick(PETAL_COLORS)}; animation-duration:${rand(6, 11)}s`;
  layer.appendChild(p);
  setTimeout(() => p.remove(), 11500);
}
for (let i = 0; i < 8; i++) setTimeout(spawnPetal, i * 350);
setInterval(spawnPetal, 650);

/* --- hoa nở ngẫu nhiên trên nền (không cần chạm) --- */
function bloomAt(x, y, size) {
  const f = document.createElement("div");
  f.className = "fx-tap-flower";
  f.style.cssText = `left:${x}px; top:${y}px; width:${size}px; height:${size}px`;
  f.innerHTML = SPR[pick(FLOWERS)]();
  layer.appendChild(f);
  f.animate([
    { transform: "translate(-50%,-50%) scale(0) rotate(-18deg)", opacity: 0 },
    { transform: "translate(-50%,-50%) scale(1.15) rotate(4deg)", opacity: 1, offset: 0.55 },
    { transform: "translate(-50%,-50%) scale(1) rotate(0deg)", opacity: 1, offset: 0.75 },
    { transform: "translate(-50%,-50%) scale(0.92) rotate(0deg)", opacity: 0 }
  ], { duration: 2600, easing: "ease-out" }).onfinish = () => f.remove();
}
setInterval(() => {
  const r = stage.getBoundingClientRect();
  bloomAt(rand(30, r.width - 30), rand(20, r.height * 0.6), rand(34, 58));
}, 3400);

/* --- chạm vào màn hình: hoa nở + cánh hoa tung ra --- */
function burst(x, y) {
  for (let i = 0; i < 10; i++) {
    const p = document.createElement("div");
    p.className = "fx-burst";
    const s = rand(7, 13);
    p.style.cssText = `left:${x}px; top:${y}px; width:${s}px; height:${s}px; background:${pick(PETAL_COLORS)}`;
    layer.appendChild(p);
    const ang = rand(0, Math.PI * 2), dist = rand(40, 110);
    p.animate([
      { transform: "translate(-50%,-50%) rotate(0deg)", opacity: 1 },
      { transform: `translate(${Math.cos(ang) * dist - s / 2}px, ${Math.sin(ang) * dist + rand(50, 110)}px) rotate(${rand(160, 420)}deg)`, opacity: 0 }
    ], { duration: rand(850, 1300), easing: "cubic-bezier(.17,.67,.35,1)" }).onfinish = () => p.remove();
  }
}
let musicStarted = false;
stage.addEventListener("pointerdown", e => {
  if (e.target.closest("#btnMusic")) return;
  const r = stage.getBoundingClientRect();
  const x = e.clientX - r.left, y = e.clientY - r.top;
  bloomAt(x, y, rand(52, 76));
  burst(x, y);
  if (!musicStarted) { musicStarted = true; startMusic(); }
});

/* --- nhạc nền --- */
const bgm = $("bgm");
bgm.volume = 0.5;
let musicOn = true;
function startMusic() { if (musicOn) bgm.play().catch(() => {}); }
$("btnMusic").addEventListener("click", e => {
  e.stopPropagation();
  musicOn = !musicOn;
  $("icoMusicOn").style.display = musicOn ? "" : "none";
  $("icoMusicOff").style.display = musicOn ? "none" : "";
  if (musicOn) { musicStarted = true; startMusic(); } else bgm.pause();
});
