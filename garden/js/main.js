"use strict";
/* VƯỜN NỞ HOA SINH NHẬT — chạm nở 15 bông -> cánh hoa xoáy thành tim ->
   pháo hoa cánh hoa -> bó hoa + thư. Canvas 2D, hạt vật lý mỗi frame.
   Nhạc: file piano kết xuất sẵn phát bằng <audio> (kênh chắc chắn trên iOS);
   tiếng chuông nở hoa = 6 file nốt piano nhỏ phát trực tiếp khi chạm. */
(function () {
  const cv = document.getElementById("cv"), ctx = cv.getContext("2d");
  const hintEl = document.getElementById("hint");
  const countEl = document.getElementById("count");
  const bigTitle = document.getElementById("big-title");
  const letterWrap = document.getElementById("letter-wrap");
  const bgm = document.getElementById("bgm");
  let W = 0, H = 0, DPR = 1;

  const imgBud = new Image(); imgBud.src = "assets/bud.webp";
  const imgOpen = new Image(); imgOpen.src = "assets/open.webp";
  const imgBouquet = new Image(); imgBouquet.src = "assets/bouquet.webp";
  const imgPetal = new Image(); imgPetal.src = "assets/petal.webp";
  const chimes = [];
  for (let i = 0; i < 6; i++) { const a = new Audio(); a.src = "assets/chime" + i + ".mp3"; a.preload = "auto"; chimes.push(a); }

  let phase = "garden";       // garden -> gather -> hold -> burst -> finale -> letter
  let phaseT = 0;
  let plants = [], particles = [], sparks = [], motes = [], clouds = [], flies = [];
  let bloomed = 0, musicStarted = false, muted = false;
  let bouquet = null, letterOpened = false;
  const rand = (a, b) => a + Math.random() * (b - a);
  const TOTAL = 15;

  /* vị trí 15 cây: 3 hàng sâu (xa / giữa / gần) */
  const SPOTS = [
    [0.10, 0.615], [0.30, 0.60], [0.50, 0.618], [0.70, 0.60], [0.90, 0.615],
    [0.16, 0.745], [0.38, 0.73], [0.60, 0.745], [0.82, 0.73], [0.94, 0.75],
    [0.08, 0.905], [0.30, 0.885], [0.55, 0.91], [0.76, 0.885], [0.93, 0.905]
  ];
  function layout() {
    plants = SPOTS.map(([fx, fy], i) => {
      const depth = fy < 0.66 ? 0 : fy < 0.81 ? 1 : 2;
      const h = [66, 108, 168][depth] * (0.92 + (i % 3) * 0.07);
      return { x: fx * W, baseY: fy * H, h, depth, state: 0, t: 0, sway: rand(0, 6.28) };
    });
    motes = [];
    for (let i = 0; i < 42; i++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: rand(1, 2.6), p: rand(0, 6.28), v: rand(3, 9) });
    clouds = [];
    for (let i = 0; i < 5; i++) clouds.push({ x: Math.random() * W, y: rand(0.05, 0.3) * H, s: rand(0.6, 1.3), v: rand(2, 5) });
    flies = [
      { x: W * 0.25, y: H * 0.4, p: rand(0, 6), c: "#F28BB4" },
      { x: W * 0.72, y: H * 0.34, p: rand(0, 6), c: "#FFFFFF" }
    ];
    window.__plants = plants.map(p => ({ hx: p.x, hy: p.baseY - p.h * 0.83, state: p.state }));
  }
  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    layout();
  }

  /* ---------------- nhạc & chuông (thẻ audio) ---------------- */
  function startMusic() {
    if (musicStarted) return; musicStarted = true;
    bgm.muted = muted; bgm.volume = 0.55;
    const p = bgm.play(); if (p) p.catch(() => {});
  }
  function chime(n) {
    const a = chimes[n % chimes.length];
    try { a.currentTime = 0; a.muted = muted; const p = a.play(); if (p) p.catch(() => {}); } catch (e) {}
  }
  document.getElementById("mute").addEventListener("click", e => {
    e.stopPropagation();
    muted = !muted;
    bgm.muted = muted;
    e.currentTarget.classList.toggle("muted", muted);
  });
  window.__music = { playing: () => !bgm.paused, at: () => bgm.currentTime };

  /* ---------------- tương tác ---------------- */
  function headOf(p) { return { x: p.x, y: p.baseY - p.h * 0.83 }; }
  cv.addEventListener("pointerdown", e => {
    startMusic();
    const pt = { x: e.clientX, y: e.clientY };
    if (phase === "garden") {
      let best = null, bd = 1e9;
      for (const p of plants) {
        if (p.state !== 0) continue;
        const hd = headOf(p);
        const d = Math.hypot(pt.x - hd.x, pt.y - hd.y);
        if (d < bd) { bd = d; best = p; }
      }
      if (best && bd < Math.max(52, best.h * 0.36)) bloom(best);
    } else if (phase === "finale" && bouquet) {
      const d = Math.hypot(pt.x - bouquet.x, pt.y - bouquet.y);
      if (d < bouquet.w * 0.62) openLetter();
    }
  });
  cv.addEventListener("contextmenu", e => e.preventDefault());
  document.addEventListener("contextmenu", e => e.preventDefault());
  document.getElementById("replay").addEventListener("click", () => location.reload());

  function bloom(p) {
    p.state = 1; p.t = 0;
    bloomed++;
    countEl.textContent = bloomed;
    chime(bloomed - 1);
    const hd = headOf(p);
    for (let i = 0; i < 12; i++)
      particles.push(newPetal(hd.x + rand(-8, 8), hd.y + rand(-6, 6), "burst"));
    for (let i = 0; i < 8; i++)
      sparks.push({ x: hd.x, y: hd.y, vx: rand(-46, 46), vy: rand(-70, -8), life: 0, max: rand(0.4, 0.8), r: rand(1.2, 2.6) });
    if (bloomed >= TOTAL) {
      hintEl.innerHTML = "Cả vườn đã nở rộ…";
      setTimeout(startClimax, 900);
    } else if (bloomed === 1) {
      hintEl.innerHTML = "Đẹp quá! Chạm tiếp các nụ còn lại — còn <b>" + (TOTAL - bloomed) + " bông</b>";
    } else {
      hintEl.innerHTML = "Còn <b>" + (TOTAL - bloomed) + " nụ</b> nữa…";
    }
    window.__state = { bloomed, phase };
  }
  function newPetal(x, y, kind) {
    return { x, y, vx: rand(-24, 24), vy: rand(-34, -6), rot: rand(0, 6.28), vr: rand(-2, 2),
      s: rand(13, 26), kind, tx: 0, ty: 0, life: 0, hue: Math.random() };
  }
  function heartPoint(t, scale, cx, cy) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: cx + x * scale, y: cy - y * scale };
  }
  function startClimax() {
    phase = "gather"; phaseT = 0;
    const cx = W / 2, cy = H * 0.40, scale = Math.min(W, H) / 34;
    let idx = 0;
    for (const p of plants) {
      const hd = headOf(p);
      for (let i = 0; i < 9; i++) {
        const pt = newPetal(hd.x + rand(-14, 14), hd.y + rand(-10, 10), "gather");
        const hp = heartPoint((idx / 200) * Math.PI * 2 + rand(-0.05, 0.05), scale * rand(0.92, 1.05), cx, cy);
        pt.tx = hp.x; pt.ty = hp.y; pt.delay = rand(0, 0.5);
        particles.push(pt); idx++;
      }
    }
    for (let i = 0; i < 65; i++) {
      const pt = newPetal(rand(0, W), rand(H * 0.4, H), "gather");
      const hp = heartPoint((idx / 200) * Math.PI * 2 + rand(-0.05, 0.05), scale * rand(0.9, 1.06), cx, cy);
      pt.tx = hp.x; pt.ty = hp.y; pt.delay = rand(0, 0.7);
      particles.push(pt); idx++;
    }
    window.__state = { bloomed, phase };
  }
  function openLetter() {
    if (letterOpened) return; letterOpened = true;
    phase = "letter";
    letterWrap.classList.remove("hidden");
    window.__state = { bloomed, phase };
  }

  /* ---------------- cập nhật ---------------- */
  const easeOutBack = x => { const c = 1.70158; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  function update(dt, t) {
    for (const c of clouds) { c.x += c.v * dt; if (c.x - 130 * c.s > W) c.x = -130 * c.s; }
    for (const m of motes) { m.y -= m.v * dt; m.p += dt * 0.8; if (m.y < -6) { m.y = H + 6; m.x = Math.random() * W; } }
    for (const f of flies) {
      f.p += dt;
      f.x += Math.sin(f.p * 0.7) * 14 * dt + 6 * dt;
      f.y += Math.cos(f.p * 1.1) * 9 * dt;
      if (f.x > W + 24) f.x = -24;
      f.y = Math.max(H * 0.2, Math.min(H * 0.55, f.y));
    }
    for (const p of plants) {
      p.sway += dt;
      if (p.state === 1) { p.t += dt / 0.7; if (p.t >= 1) { p.t = 1; p.state = 2; } }
    }
    phaseT += dt;
    if (phase === "gather" && phaseT > 2.3) {
      phase = "hold"; phaseT = 0;
      bigTitle.classList.add("show");
      window.__state = { bloomed, phase };
    } else if (phase === "hold" && phaseT > 1.7) {
      phase = "burst"; phaseT = 0;
      const cx = W / 2, cy = H * 0.40;
      for (const pt of particles) {
        if (pt.kind !== "gather") continue;
        pt.kind = "burst";
        const a = Math.atan2(pt.y - cy, pt.x - cx) + rand(-0.3, 0.3);
        const sp = rand(90, 340);
        pt.vx = Math.cos(a) * sp; pt.vy = Math.sin(a) * sp - 60;
      }
      for (let i = 0; i < 70; i++)
        sparks.push({ x: cx + rand(-70, 70), y: cy + rand(-60, 60), vx: rand(-160, 160), vy: rand(-190, 60), life: 0, max: rand(0.6, 1.4), r: rand(1.2, 3) });
      window.__state = { bloomed, phase };
    } else if (phase === "burst" && phaseT > 2.2) {
      phase = "finale"; phaseT = 0;
      bigTitle.classList.remove("show");
      bouquet = { x: W / 2, y: H * 0.78, w: Math.min(W * 0.62, 300), t: 0 };
      hintEl.innerHTML = "Một bó hoa dành tặng chị — <b>chạm vào bó hoa</b>";
      window.__state = { bloomed, phase };
    }
    if (bouquet && bouquet.t < 1) bouquet.t = Math.min(1, bouquet.t + dt / 0.9);
    // hạt
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i]; pt.life += dt;
      if (pt.kind === "gather") {
        const k = Math.max(0, phaseT - (pt.delay || 0));
        const f = Math.min(1, k / 1.5);
        pt.x += (pt.tx - pt.x) * (0.02 + f * 0.055);
        pt.y += (pt.ty - pt.y) * (0.02 + f * 0.055);
        pt.rot += pt.vr * dt;
        if (phase === "hold") { pt.x += Math.sin(t * 2.4 + pt.ty * 0.05) * 0.3; pt.y += Math.cos(t * 2 + pt.tx * 0.05) * 0.3; }
      } else {
        pt.vy += (pt.kind === "burst" && phase !== "garden" ? 55 : 26) * dt;
        pt.vx *= 0.995; pt.vy *= 0.995;
        pt.x += pt.vx * dt + Math.sin(pt.life * 3 + pt.rot) * 12 * dt;
        pt.y += pt.vy * dt;
        pt.rot += pt.vr * dt;
        if (pt.y > H + 30 || pt.life > 9) particles.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i]; s.life += dt;
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 30 * dt;
      if (s.life > s.max) sparks.splice(i, 1);
    }
    if ((phase === "finale" || phase === "letter") && Math.random() < 0.06)
      particles.push(newPetal(rand(0, W), -20, "drift"));
    window.__plants = plants.map(p => ({ hx: p.x, hy: p.baseY - p.h * 0.83, state: p.state }));
  }

  /* ---------------- vẽ ---------------- */
  function drawPlant(p, t) {
    const swayX = Math.sin(p.sway * 0.9) * (p.depth === 2 ? 2.4 : 1.4);
    const wBud = p.h * (imgBud.naturalWidth / imgBud.naturalHeight || 0.453);
    const wOpen = p.h * (imgOpen.naturalWidth / imgOpen.naturalHeight || 0.443);
    ctx.save();
    ctx.translate(p.x + swayX, p.baseY);
    if (p.state === 0) {
      const pulse = 1 + Math.sin(t * 2 + p.sway) * 0.02;
      ctx.drawImage(imgBud, -wBud / 2 * pulse, -p.h * pulse, wBud * pulse, p.h * pulse);
    } else {
      const et = p.state === 1 ? easeOutBack(Math.min(1, p.t)) : 1;
      if (p.state === 1) {
        ctx.globalAlpha = 1 - p.t;
        ctx.drawImage(imgBud, -wBud / 2, -p.h, wBud, p.h);
        ctx.globalAlpha = 1;
      }
      const s = Math.max(0.05, et);
      ctx.drawImage(imgOpen, -wOpen / 2 * s, -p.h * s, wOpen * s, p.h * s);
    }
    ctx.restore();
  }
  function draw(t) {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#FFD9E8"); sky.addColorStop(0.45, "#FFE9F1"); sky.addColorStop(1, "#FFF6EA");
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // nắng
    const sg = ctx.createRadialGradient(W * 0.14, H * 0.1, 6, W * 0.14, H * 0.1, 190);
    sg.addColorStop(0, "rgba(255,236,170,0.75)"); sg.addColorStop(1, "rgba(255,236,170,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H * 0.55);
    ctx.fillStyle = "#FFEFA8";
    ctx.beginPath(); ctx.arc(W * 0.14, H * 0.1, 24, 0, 6.29); ctx.fill();
    // mây
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    for (const c of clouds) {
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 52 * c.s, 17 * c.s, 0, 0, 6.29);
      ctx.ellipse(c.x + 30 * c.s, c.y + 4 * c.s, 36 * c.s, 13 * c.s, 0, 0, 6.29);
      ctx.ellipse(c.x - 34 * c.s, c.y + 5 * c.s, 30 * c.s, 11 * c.s, 0, 0, 6.29);
      ctx.fill();
    }
    // đồi 3 lớp
    const hills = [
      { y: 0.575, c: "#DFF2DA", a: 26 }, { y: 0.70, c: "#CDEBC4", a: 34 }, { y: 0.845, c: "#B7E2AC", a: 40 }
    ];
    for (const hl of hills) {
      ctx.fillStyle = hl.c;
      ctx.beginPath();
      ctx.moveTo(0, H);
      ctx.lineTo(0, H * hl.y + Math.sin(1.3) * 6);
      ctx.quadraticCurveTo(W * 0.3, H * hl.y - hl.a, W * 0.55, H * hl.y + 4);
      ctx.quadraticCurveTo(W * 0.8, H * hl.y + hl.a * 0.7, W, H * hl.y - 6);
      ctx.lineTo(W, H);
      ctx.closePath(); ctx.fill();
    }
    // đốm hoa li ti trên cỏ
    ctx.fillStyle = "rgba(244,130,175,0.5)";
    for (let i = 0; i < 36; i++) {
      const x = (i * 89) % W, y = H * 0.62 + ((i * 47) % (H * 0.36));
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.29); ctx.fill();
    }
    // hạt phấn bay
    for (const m of motes) {
      ctx.fillStyle = "rgba(255,190,120,0.5)";
      ctx.beginPath(); ctx.arc(m.x + Math.sin(m.p) * 7, m.y, m.r, 0, 6.29); ctx.fill();
    }
    // cây theo hàng xa -> gần
    if (imgBud.complete && imgOpen.complete)
      for (const p of [...plants].sort((a, b) => a.baseY - b.baseY)) drawPlant(p, t);
    // bướm
    for (const f of flies) {
      const flap = Math.abs(Math.sin(t * 11 + f.p));
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(Math.sin(f.p * 0.7) * 0.3);
      ctx.fillStyle = f.c; ctx.globalAlpha = 0.9;
      for (const sgn of [-1, 1]) {
        ctx.save(); ctx.scale(sgn * (0.35 + flap * 0.65), 1);
        ctx.beginPath(); ctx.ellipse(8, 0, 8, 5.4, -0.5, 0, 6.29); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, 5, 6, 4, 0.4, 0, 6.29); ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.fillStyle = "#8A5A72";
      ctx.beginPath(); ctx.ellipse(0, 1, 1.8, 5.4, 0, 0, 6.29); ctx.fill();
      ctx.restore();
    }
    // cánh hoa (hạt)
    if (imgPetal.complete) {
      for (const pt of particles) {
        ctx.save();
        ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot);
        const pw = pt.s, ph = pw * (imgPetal.naturalHeight / imgPetal.naturalWidth || 1);
        ctx.globalAlpha = pt.kind === "burst" && pt.life > 6 ? Math.max(0, 1 - (pt.life - 6) / 3) : 0.95;
        ctx.drawImage(imgPetal, -pw / 2, -ph / 2, pw, ph);
        ctx.restore();
      }
    }
    // tia sáng
    for (const s of sparks) {
      ctx.fillStyle = `rgba(255,${190 + Math.floor(40 * (1 - s.life / s.max))},90,${1 - s.life / s.max})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.29); ctx.fill();
    }
    // bó hoa finale
    if (bouquet && imgBouquet.complete) {
      const et = easeOutBack(Math.min(1, bouquet.t));
      const w = bouquet.w * Math.max(0.05, et);
      const h = w * (imgBouquet.naturalHeight / imgBouquet.naturalWidth || 1.21);
      const bobY = Math.sin(t * 1.3) * 5;
      const gg = ctx.createRadialGradient(bouquet.x, bouquet.y - h * 0.4, 8, bouquet.x, bouquet.y - h * 0.4, w * 0.95);
      gg.addColorStop(0, "rgba(255,170,205,0.5)"); gg.addColorStop(1, "rgba(255,170,205,0)");
      ctx.fillStyle = gg; ctx.fillRect(bouquet.x - w, bouquet.y - h - 60, w * 2, h + 160);
      ctx.drawImage(imgBouquet, bouquet.x - w / 2, bouquet.y - h + bobY, w, h);
      bouquet.wPx = w; bouquet.hPx = h; bouquet.cyPx = bouquet.y - h / 2 + bobY;
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt, now / 1000);
    draw(now / 1000);
    requestAnimationFrame(frame);
  }
  window.addEventListener("resize", resize);
  resize();
  window.__state = { bloomed: 0, phase };
  requestAnimationFrame(frame);
})();
