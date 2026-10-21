"use strict";
/* MÀN KẾT — TRÁI TIM NGÂN HÀ.
   Thẻ lời chúc + ảnh bay quanh trái tim theo quỹ đạo ellipse (chu kỳ 52s,
   surge tăng tốc nhẹ mỗi 11s, phanh mềm khi chạm tim — theo nhịp điệu của mẫu).
   Chạm tim đủ 3 nhịp -> trái tim bùng nổ (Rain.burstHeart) -> mở lá thư. */
window.Finale = (function () {
  const CARDS = [
    { img: "../assets/art/cake.webp", cap: "Bánh cho chị nè" },
    { text: "Chúc mừng sinh nhật chị" },
    { img: "../assets/art/bouquet.webp", cap: "Hoa tươi nhất vườn" },
    { text: "Chúc chị luôn khỏe mạnh" },
    { img: "../assets/art/envelope.webp", cap: "Thư em viết tay" },
    { text: "Hạnh phúc ngập tràn" },
    { text: "Thương chị nhiều" }
  ];
  const PERIOD = 52, SURGE_EVERY = 11, SURGE_DUR = 0.75;
  let started = false, angle = 0, elapsed = 0;
  let brakeM = 1, pulseKick = 1;
  let beats = 0, burstDone = false;
  let focusedIdx = -1;
  let cardEls = [];
  let projectFn = null;
  const api = { onBeat: null, onBurst: null };

  function buildCards() {
    const wrap = document.getElementById("orbit-cards");
    wrap.innerHTML = "";
    cardEls = CARDS.map((c, i) => {
      const d = document.createElement("div");
      if (c.img) { d.className = "ocard"; d.innerHTML = `<img src="${c.img}" alt=""><div class="cap">${c.cap}</div>`; }
      else { d.className = "ocard txt"; d.innerHTML = `<div class="cap">${c.text}</div>`; }
      d.addEventListener("pointerdown", e => {
        e.stopPropagation();
        focusedIdx = (focusedIdx === i) ? -1 : i;
      });
      wrap.appendChild(d);
      return d;
    });
  }

  function start(projector) {
    if (started) return;
    started = true; projectFn = projector;
    buildCards();
  }

  function beat() {
    if (!started || burstDone) return false;
    beats = Math.min(3, beats + 1);
    brakeM = 0.22; pulseKick = 1.3;
    miniPetals();
    if (api.onBeat) api.onBeat(beats);
    if (beats >= 3) doBurst();
    return true;
  }

  function miniPetals() {
    const c = projectFn ? projectFn() : { x: innerWidth / 2, y: innerHeight / 2 };
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("div");
      const sz = 8 + Math.random() * 8;
      s.style.cssText = `position:fixed;left:${c.x}px;top:${c.y}px;width:${sz}px;height:${sz}px;z-index:8;pointer-events:none;border-radius:62% 38% 60% 40%/55% 45% 55% 45%;background:${["#F7A8C4", "#FFD9A8", "#DCC9F5"][i % 3]}`;
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 90;
      s.animate([
        { transform: "translate(-50%,-50%) rotate(0)", opacity: 1 },
        { transform: `translate(${Math.cos(a) * d - 0}px, ${Math.sin(a) * d - 20}px) rotate(${Math.random() * 260 - 130}deg)`, opacity: 0 }
      ], { duration: 850 + Math.random() * 400, easing: "cubic-bezier(.17,.67,.35,1)" }).onfinish = () => s.remove();
    }
  }

  function doBurst() {
    burstDone = true;
    const fw = document.getElementById("fade-white");
    setTimeout(() => { fw.style.opacity = "0.85"; }, 350);
    setTimeout(() => { fw.style.opacity = "0"; }, 800);
    if (window.Rain) Rain.burstHeart();
    confettiPetals();
    if (api.onBurst) api.onBurst();
    setTimeout(() => {
      document.getElementById("orbit-cards").style.display = "none";
      document.getElementById("letter").classList.add("show");
    }, 1500);
  }

  function confettiPetals() {
    for (let i = 0; i < 26; i++) {
      const s = document.createElement("div");
      const sz = 9 + Math.random() * 10;
      s.style.cssText = `position:fixed;left:${Math.random() * 100}vw;top:-30px;width:${sz}px;height:${sz}px;z-index:13;pointer-events:none;border-radius:62% 38% 60% 40%/55% 45% 55% 45%;background:${["#F7A8C4", "#FFD9A8", "#F49AC1", "#DCC9F5"][i % 4]}`;
      document.body.appendChild(s);
      s.animate([
        { transform: "translateY(0) rotate(0)", opacity: 1 },
        { transform: `translate(${(Math.random() - 0.5) * 120}px, 108vh) rotate(${Math.random() * 520 - 260}deg)`, opacity: 0.85 }
      ], { duration: 2500 + Math.random() * 1400, delay: Math.random() * 500, easing: "cubic-bezier(.3,.6,.6,1)" }).onfinish = () => s.remove();
    }
  }

  function update(dt) {
    if (!started || burstDone) return;
    elapsed += dt;
    brakeM += (1 - brakeM) * Math.min(1, dt * 1.4);
    pulseKick += (1 - pulseKick) * Math.min(1, dt * 2.6);
    if (window.Rain) Rain.setPulse(pulseKick * (1 + 0.035 * Math.sin(elapsed * 2.2)));
    // surge: cửa sổ 0,75s mỗi 11s, hệ số tiến tới 4 rồi lắng
    const cyc = elapsed % SURGE_EVERY;
    let surgeM = 1;
    if (cyc < SURGE_DUR) { const p = cyc / SURGE_DUR; surgeM = 1 + 3 * Math.sin(p * Math.PI); }
    if (focusedIdx < 0) angle += dt * (Math.PI * 2 / PERIOD) * brakeM * surgeM;
    const c = projectFn ? projectFn() : { x: innerWidth / 2, y: innerHeight / 2 };
    const rx = Math.min(innerWidth * 0.46, 360), ry = rx * 0.34;
    cardEls.forEach((el, i) => {
      if (i === focusedIdx) {
        el.style.transform = `translate(${c.x}px, ${c.y - 190}px) translate(-50%,-50%) scale(1.3)`;
        el.style.opacity = "1"; el.style.zIndex = "30";
        return;
      }
      const a = angle + (i / cardEls.length) * Math.PI * 2;
      const x = c.x + Math.cos(a) * rx, y = c.y + Math.sin(a) * ry;
      const depth = (Math.sin(a) + 1) / 2;
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${0.58 + 0.4 * depth})`;
      el.style.opacity = String(0.32 + 0.68 * depth);
      el.style.zIndex = String(4 + Math.round(depth * 10));
    });
  }

  /* thư: chọn điều ước -> sao bay lên trời */
  function initLetter() {
    const line = document.getElementById("wish-line");
    document.querySelectorAll("#chips .chip").forEach(chip => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("#chips .chip").forEach(x => x.classList.remove("sel"));
        chip.classList.add("sel");
        line.textContent = "Điều ước “" + chip.textContent + "” đang bay lên trời cho chị…";
        flyStar(chip);
      });
    });
    document.getElementById("btn-again").addEventListener("click", () => location.reload());
  }
  function flyStar(fromEl) {
    const r = fromEl.getBoundingClientRect();
    const star = document.createElement("div");
    star.className = "wish-star";
    star.innerHTML = '<svg viewBox="0 0 24 24" fill="#FFC93A"><path d="M12 1.8l3.1 6.9 7.5.7-5.6 5 1.6 7.4L12 18l-6.6 3.8L7 14.4 1.4 9.4l7.5-.7z"/></svg>';
    star.style.left = (r.left + r.width / 2 - 15) + "px";
    star.style.top = (r.top - 8) + "px";
    document.body.appendChild(star);
    const tx = 8 + Math.random() * 74, ty = 6 + Math.random() * 10;
    star.animate([
      { transform: "translate(0,0) scale(.6)", opacity: 0.6 },
      { transform: `translate(${tx * innerWidth / 100 - r.left}px, ${-(r.top - ty * innerHeight / 100)}px) scale(1.15)`, opacity: 1 }
    ], { duration: 1700, easing: "cubic-bezier(.3,.7,.3,1)", fill: "forwards" });
    star.animate([
      { filter: "drop-shadow(0 0 6px rgba(255,190,60,.7))" },
      { filter: "drop-shadow(0 0 16px rgba(255,190,60,1))" }
    ], { duration: 900, delay: 1700, iterations: Infinity, direction: "alternate" });
    setTimeout(() => { document.getElementById("wish-line").textContent = "Ngôi sao sáng nhất trên trời lúc này là điều ước của chị."; }, 1800);
  }

  api.start = start; api.update = update; api.beat = beat; api.initLetter = initLetter;
  api.getBeats = () => beats;
  return api;
})();
