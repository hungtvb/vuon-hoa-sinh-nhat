"use strict";
/* ĐÊM THẢ ĐÈN ƯỚC — canvas 2D, hành trình đi LÊN:
   giữ thắp lửa -> viết điều ước -> vuốt thả đèn -> đèn thành sao -> thư rơi xuống.
   Áp skill local-interactive-gift-web: vật anh hùng = ảnh AI tách nền, hạt nhiều
   lớp chạy mỗi frame, cao trào 3 lớp (hạt + sáng + nhạc), nhạc theo gesture đầu. */
(function () {
  const cv = document.getElementById("sky"), ctx = cv.getContext("2d");
  const hintEl = document.getElementById("hint");
  const wishPanel = document.getElementById("wish-panel");
  const wishInput = document.getElementById("wish-input");
  const releaseBtn = document.getElementById("release-btn");
  const letterWrap = document.getElementById("letter-wrap");
  const bgm = document.getElementById("bgm");
  let W = 0, H = 0, DPR = 1;

  const imgUnlit = new Image(); imgUnlit.src = "assets/lantern-unlit.webp";
  const imgLit = new Image(); imgLit.src = "assets/lantern-lit.webp";
  const imgPetal = new Image(); imgPetal.src = "assets/petal.webp";

  let phase = "light";           // light -> wish -> release -> rising -> star -> fall -> letter
  let glow = 0;                   // 0..1 mức lửa của đèn chính
  let holding = false, holdPt = null;
  let wish = "";
  let hero = null;                // đèn chính
  let ambient = [];               // đèn nền nhiều lớp
  let stars = [], sparks = [], motes = [];
  let scrollY = 0, scrollV = 0;   // thế giới trôi xuống khi đèn bay lên
  let starT = 0, starPt = null, flash = 0, streak = null;
  let petal = null, letterOpened = false;
  let musicStarted = false;
  const rand = (a, b) => a + Math.random() * (b - a);

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
  }
  function layout() {
    const lh = Math.min(H * 0.46, 430);
    if (!hero) hero = { x: W / 2, y: H * 0.56, h: lh, vy: 0, sway: rand(0, 6) };
    hero.h = lh;
    if (phase === "light" || phase === "wish" || phase === "release") { hero.x = W / 2; hero.y = H * 0.56; }
    stars = [];
    for (let i = 0; i < 150; i++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.75, r: rand(0.5, 1.7), p: rand(0, 6.28), s: rand(0.4, 1.4) });
    if (!ambient.length) for (let i = 0; i < 14; i++) ambient.push(newAmbient(true));
    motes = [];
    for (let i = 0; i < 46; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: rand(0.8, 2.2), p: rand(0, 6.28), v: rand(2, 7) });
  }
  function newAmbient(anywhere) {
    const layer = Math.random();          // 0 xa .. 1 gần
    return {
      x: Math.random() * W, y: anywhere ? Math.random() * H : H + 60,
      h: 16 + layer * 52, v: 5 + layer * 13, a: 0.25 + layer * 0.55,
      sway: rand(0, 6.28), swayAmp: rand(2, 9)
    };
  }

  /* ---------------- nhạc ---------------- */
  function startMusic() {
    if (musicStarted) return; musicStarted = true;
    bgm.volume = 0.5;
    bgm.play().catch(() => {});
  }
  document.getElementById("mute").addEventListener("click", e => {
    e.stopPropagation();
    bgm.muted = !bgm.muted;
    e.currentTarget.classList.toggle("muted", bgm.muted);
  });

  /* ---------------- nhập liệu ---------------- */
  let downAt = null, dragDy = 0;
  function ptOf(e) { return { x: e.clientX, y: e.clientY }; }
  cv.addEventListener("pointerdown", e => {
    startMusic();
    const p = ptOf(e); downAt = p; dragDy = 0;
    if (phase === "light") { holding = true; holdPt = p; }
    if (phase === "fall" && petal) {
      const d = Math.hypot(p.x - petal.x, p.y - petal.y);
      if (d < 74) openLetter();
    }
  });
  window.addEventListener("pointermove", e => {
    if (!downAt) return;
    dragDy = e.clientY - downAt.y;
    if (phase === "release") hero.y = H * 0.56 + Math.max(-46, Math.min(10, dragDy * 0.4));
  });
  window.addEventListener("pointerup", e => {
    if (phase === "light") holding = false;
    if (phase === "release" && dragDy < -80) launch();
    else if (phase === "release") hero.y = H * 0.56;
    downAt = null; dragDy = 0;
  });
  cv.addEventListener("contextmenu", e => e.preventDefault());

  document.querySelectorAll(".chip").forEach(ch => ch.addEventListener("click", () => {
    wishInput.value = ch.textContent.trim(); wishInput.focus();
  }));
  document.getElementById("wish-done").addEventListener("click", () => {
    wish = wishInput.value.trim();
    wishPanel.classList.add("hidden");
    phase = "release";
    hintEl.innerHTML = "Giờ <b>vuốt lên</b> để thả đèn bay lên trời";
    releaseBtn.classList.remove("hidden");
    window.__phase = phase;
  });
  releaseBtn.addEventListener("click", launch);
  document.getElementById("replay").addEventListener("click", () => location.reload());

  function launch() {
    if (phase !== "release") return;
    phase = "rising";
    releaseBtn.classList.add("hidden");
    hintEl.innerHTML = "";
    for (let i = 0; i < 26; i++) ambient.push(newAmbient(false));
    window.__phase = phase;
  }
  function openLetter() {
    if (letterOpened) return; letterOpened = true;
    phase = "letter";
    letterWrap.classList.remove("hidden");
    window.__phase = phase;
  }

  /* ---------------- cập nhật ---------------- */
  function update(dt, t) {
    for (const s of stars) s.p += dt * s.s;
    for (const m of motes) { m.y -= m.v * dt; m.p += dt; if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; } }
    // đèn nền: bay lên chậm; khi rising thì thế giới trôi xuống nhanh hơn
    const worldV = phase === "rising" || phase === "star" || phase === "fall" || phase === "letter" ? scrollV : 0;
    for (const a of ambient) {
      a.y -= a.v * dt; a.y += worldV * dt * (0.35 + a.h / 90);
      a.sway += dt * 0.7;
      if (a.y < -80) Object.assign(a, newAmbient(false));
      if (a.y > H + 90) { a.y = -70; }
    }
    // lửa đèn chính
    if (phase === "light") {
      if (holding) {
        glow = Math.min(1, glow + dt / 1.4);
        if (Math.random() < 0.5) sparks.push({ x: hero.x + rand(-14, 14), y: hero.y + hero.h * 0.42, vx: rand(-6, 6), vy: rand(-46, -22), life: 0, max: rand(0.5, 1.1), r: rand(1, 2.4) });
        if (glow >= 1) {
          phase = "wish";
          hintEl.innerHTML = "Lửa đã bén rồi. Hãy viết điều ước lên đèn";
          wishPanel.classList.remove("hidden");
          setTimeout(() => wishInput.focus(), 350);
          window.__phase = phase;
        }
      } else glow = Math.max(0, glow - dt / 2.2);
    }
    hero.sway += dt;
    if (phase === "rising") {
      hero.vy = Math.min(150, hero.vy + dt * 130);
      hero.y -= hero.vy * dt;
      scrollV = Math.min(120, scrollV + dt * 90);
      hero.h = Math.max(54, hero.h - dt * 26);
      if (Math.random() < 0.6) sparks.push({ x: hero.x + rand(-8, 8), y: hero.y + hero.h * 0.5, vx: rand(-10, 10), vy: rand(16, 44), life: 0, max: rand(0.4, 0.9), r: rand(1, 2.2) });
      if (hero.y < H * 0.2 || hero.h <= 56) {
        phase = "star"; starT = 0; flash = 1;
        starPt = { x: hero.x, y: Math.max(70, hero.y) };
        streak = { x: starPt.x, y: starPt.y, vx: -260, vy: 120, life: 0 };
        window.__phase = phase;
      }
    } else if (phase === "star" || phase === "fall" || phase === "letter") {
      starT += dt;
      flash = Math.max(0, flash - dt * 0.7);
      scrollV = Math.max(0, scrollV - dt * 30);
      if (streak) { streak.life += dt; streak.x += streak.vx * dt; streak.y += streak.vy * dt; if (streak.life > 1.1) streak = null; }
      if (phase === "star" && starT > 1.15 && !petal) {
        petal = { x: W * rand(0.35, 0.6), y: -50, vy: 26, sway: rand(0, 6), rot: 0 };
        phase = "fall";
        hintEl.innerHTML = "Có một lá thư đang rơi xuống… <b>chạm vào nó</b>";
        window.__phase = phase;
      }
    }
    if (petal && phase === "fall") {
      petal.sway += dt * 2.1;
      petal.x += Math.sin(petal.sway) * 34 * dt;
      petal.y += petal.vy * dt;
      petal.rot = Math.sin(petal.sway * 0.8) * 0.55;
      if (petal.y > H * 0.52) petal.vy = Math.max(0, petal.vy - dt * 30); // hãm lại, lơ lửng chờ chạm
      window.__petalPos = { x: petal.x, y: petal.y };
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life += dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.life > s.max) sparks.splice(i, 1);
    }
  }

  /* ---------------- vẽ ---------------- */
  function drawLantern(img, x, y, h, alpha) {
    const w = h * (img.naturalWidth / img.naturalHeight || 0.57);
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
    ctx.globalAlpha = 1;
    return w;
  }
  function draw(t) {
    // trời
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#070A24"); sky.addColorStop(0.55, "#141238"); sky.addColorStop(1, "#241A4E");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // trăng
    const mx = W * 0.82, my = H * 0.13, mr = 30;
    const mg = ctx.createRadialGradient(mx, my, 4, mx, my, 130);
    mg.addColorStop(0, "rgba(250,240,200,0.5)"); mg.addColorStop(1, "rgba(250,240,200,0)");
    ctx.fillStyle = mg; ctx.fillRect(mx - 140, my - 140, 280, 280);
    ctx.fillStyle = "#F7ECD0";
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, 6.29); ctx.fill();
    ctx.fillStyle = "rgba(214,198,150,0.5)";
    ctx.beginPath(); ctx.arc(mx - 10, my - 6, 6, 0, 6.29); ctx.arc(mx + 9, my + 11, 4.4, 0, 6.29); ctx.fill();
    // sao
    for (const s of stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(s.p));
      ctx.fillStyle = `rgba(255,246,220,${0.75 * tw})`;
      ctx.beginPath(); ctx.arc(s.x, (s.y + scrollY * 0.3) % (H * 0.8), s.r, 0, 6.29); ctx.fill();
    }
    // hạt bụi sáng trôi
    for (const m of motes) {
      ctx.fillStyle = "rgba(255,220,150,0.35)";
      ctx.beginPath(); ctx.arc(m.x + Math.sin(m.p) * 6, m.y, m.r, 0, 6.29); ctx.fill();
    }
    // hồ
    const lakeY = H * 0.8 + Math.min(H * 0.22, scrollY);
    if (lakeY < H) {
      const lk = ctx.createLinearGradient(0, lakeY, 0, H);
      lk.addColorStop(0, "#131038"); lk.addColorStop(1, "#080A22");
      ctx.fillStyle = lk; ctx.fillRect(0, lakeY, W, H - lakeY);
      ctx.strokeStyle = "rgba(240,210,140,0.16)"; ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const yy = lakeY + 6 + ((i * 53 + Math.sin(t * 0.7 + i) * 3) % Math.max(10, H - lakeY - 8));
        const xx = (i * 97 + Math.sin(t * 0.4 + i * 2.2) * 14) % W;
        const len = 12 + (i % 5) * 7;
        ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx + len, yy); ctx.stroke();
      }
    }
    // đèn nền
    for (const a of ambient) {
      if (!imgLit.complete) break;
      ctx.save();
      ctx.translate(Math.sin(a.sway) * a.swayAmp, 0);
      drawLantern(imgLit, a.x, a.y, a.h, a.a);
      ctx.restore();
    }
    // phản chiếu đèn chính trên hồ
    if (imgUnlit.complete && (phase === "light" || phase === "wish" || phase === "release")) {
      const baseY = hero.y + hero.h / 2;
      if (baseY > lakeY - hero.h * 0.4) {
        // bóng nước: chỉ lấy dải nông ngay dưới mặt hồ, mờ nhanh theo chiều sâu
        const bandH = Math.min(hero.h * 0.34, H - lakeY - 4);
        ctx.save();
        ctx.beginPath(); ctx.rect(0, lakeY, W, bandH); ctx.clip();
        ctx.globalAlpha = 0.13 + glow * 0.1;
        ctx.translate(0, 2 * lakeY + 4);
        ctx.scale(1, -1);
        drawLantern(glow > 0.4 ? imgLit : imgUnlit, hero.x, hero.y, hero.h, 1);
        ctx.restore();
        const rg = ctx.createLinearGradient(0, lakeY, 0, lakeY + bandH);
        rg.addColorStop(0, "rgba(19,16,56,0.05)"); rg.addColorStop(1, "rgba(19,16,56,0.92)");
        ctx.fillStyle = rg; ctx.fillRect(0, lakeY, W, bandH);
      }
    }
    // đèn chính
    if (phase !== "star" && phase !== "fall" && phase !== "letter" && imgUnlit.complete) {
      const bobY = (phase === "rising") ? 0 : Math.sin(hero.sway * 0.9) * 5;
      const tilt = Math.sin(hero.sway * 0.6) * 0.02;
      ctx.save();
      ctx.translate(hero.x, hero.y + bobY); ctx.rotate(tilt); ctx.translate(-hero.x, -(hero.y + bobY));
      if (glow > 0.02) {
        const gg = ctx.createRadialGradient(hero.x, hero.y + bobY + hero.h * 0.2, 8, hero.x, hero.y + bobY + hero.h * 0.2, hero.h * 0.95);
        gg.addColorStop(0, `rgba(255,170,80,${0.5 * glow})`); gg.addColorStop(1, "rgba(255,170,80,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = gg; ctx.fillRect(hero.x - hero.h, hero.y + bobY - hero.h, hero.h * 2, hero.h * 2);
        ctx.globalCompositeOperation = "source-over";
      }
      drawLantern(imgUnlit, hero.x, hero.y + bobY, hero.h, 1);
      if (glow > 0.01) drawLantern(imgLit, hero.x, hero.y + bobY, hero.h, glow);
      // chữ điều ước trên thân đèn
      if (wish && glow > 0.5) {
        ctx.fillStyle = "rgba(122,74,34,0.92)";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        const fs = Math.max(15, hero.h * 0.075);
        ctx.font = `${fs}px 'Dancing Script', cursive`;
        const words = wish.split(" ");
        let lines = [""];
        for (const wd of words) {
          const test = lines[lines.length - 1] ? lines[lines.length - 1] + " " + wd : wd;
          if (ctx.measureText(test).width > hero.h * 0.34 && lines.length < 3) lines.push(wd);
          else lines[lines.length - 1] = test;
        }
        lines.forEach((ln, i) => ctx.fillText(ln, hero.x, hero.y + bobY - hero.h * 0.06 + (i - (lines.length - 1) / 2) * fs * 1.25));
      }
      ctx.restore();
    }
    // sao từ đèn + chớp sáng + sao băng
    if (starPt) {
      const tw = 0.7 + 0.3 * Math.sin(starT * 6);
      const sg = ctx.createRadialGradient(starPt.x, starPt.y, 1, starPt.x, starPt.y, 44 * tw + flash * 120);
      sg.addColorStop(0, `rgba(255,240,200,${0.9})`); sg.addColorStop(0.25, `rgba(255,205,120,${0.5 * tw + flash * 0.4})`); sg.addColorStop(1, "rgba(255,205,120,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(starPt.x - 170, starPt.y - 170, 340, 340);
      ctx.fillStyle = "#FFF6DC";
      ctx.beginPath(); ctx.arc(starPt.x, starPt.y, 3.2 + flash * 3, 0, 6.29); ctx.fill();
      if (streak) {
        ctx.strokeStyle = "rgba(255,244,210,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(streak.x, streak.y); ctx.lineTo(streak.x - streak.vx * 0.35, streak.y - streak.vy * 0.35); ctx.stroke();
      }
      if (flash > 0.02) { ctx.fillStyle = `rgba(255,246,220,${flash * 0.35})`; ctx.fillRect(0, 0, W, H); }
    }
    // tia lửa
    for (const s of sparks) {
      ctx.fillStyle = `rgba(255,${170 + Math.floor(60 * (1 - s.life / s.max))},60,${1 - s.life / s.max})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill();
    }
    // vòng tiến trình khi giữ thắp đèn
    if (phase === "light" && holding && holdPt) {
      ctx.strokeStyle = "rgba(255,217,138,0.9)"; ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.arc(holdPt.x, holdPt.y, 30, -Math.PI / 2, -Math.PI / 2 + glow * Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(255,217,138,0.25)";
      ctx.beginPath(); ctx.arc(holdPt.x, holdPt.y, 30, 0, 6.29); ctx.stroke();
    }
    // cánh hoa mang thư rơi
    if (petal && imgPetal.complete) {
      ctx.save();
      ctx.translate(petal.x, petal.y); ctx.rotate(petal.rot);
      const pw = 86, ph = pw * (imgPetal.naturalHeight / imgPetal.naturalWidth || 1);
      const pg = ctx.createRadialGradient(0, 0, 2, 0, 0, 74);
      pg.addColorStop(0, "rgba(255,190,110,0.4)"); pg.addColorStop(1, "rgba(255,190,110,0)");
      ctx.fillStyle = pg; ctx.fillRect(-80, -80, 160, 160);
      ctx.drawImage(imgPetal, -pw / 2, -ph / 2, pw, ph);
      ctx.restore();
      if (phase === "fall") {
        ctx.fillStyle = `rgba(255,233,184,${0.65 + 0.35 * Math.sin(t * 3)})`;
        ctx.font = "600 14px 'Roboto Flex', sans-serif"; ctx.textAlign = "center";
      }
    }
    if (phase === "rising") scrollY += scrollV * 0.016;
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt, now / 1000);
    draw(now / 1000);
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  document.addEventListener("contextmenu", e => e.preventDefault());
  resize();
  window.__phase = phase;
  requestAnimationFrame(frame);
})();
