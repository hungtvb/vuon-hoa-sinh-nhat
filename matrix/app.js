"use strict";
/* MATRIX — Happy Birthday My Love
   One world only: code rain -> pink decoded words -> 3D code heart -> decoded card.
   All phase timing is absolute-time based (headless-safe). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), rainCv = $("rain"), glCv = $("gl");
  var introEl = $("intro"), wordsEl = $("words"), statusEl = $("status"), statusText = $("statusText");
  var dragIndEl = $("dragInd"), cardEl = $("card"), cardBody = $("cardBody");
  var music = $("music"), muteBtn = $("mute");

  var GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFXYZ<>/=+*#$";
  function rndGlyph() { return GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }

  /* ============================== RAIN ============================== */
  var rctx = rainCv.getContext("2d");
  var W = 0, H = 0, DPR = 1, cols = [], FONT = 16;
  var rainSpeed = 1, rainSpeedTarget = 1, rainAlpha = 1, rainAlphaTarget = 1;
  function sizeRain() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    rainCv.width = W * DPR; rainCv.height = H * DPR;
    rainCv.style.width = W + "px"; rainCv.style.height = H + "px";
    rctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    rctx.fillStyle = "#000"; rctx.fillRect(0, 0, W, H);
    var n = Math.ceil(W / FONT);
    cols = [];
    for (var i = 0; i < n; i++) {
      var near = Math.random() < 0.42;
      cols.push({
        x: i * FONT + 2,
        y: Math.random() * (H / FONT),
        speed: near ? 13 + Math.random() * 11 : 5 + Math.random() * 6,
        alpha: near ? 0.95 : 0.34,
        size: near ? 16 : 13
      });
    }
  }
  var lastRainDraw = 0;
  function drawRain(now, dt) {
    rainSpeed += (rainSpeedTarget - rainSpeed) * Math.min(1, dt * 2.2);
    rainAlpha += (rainAlphaTarget - rainAlpha) * Math.min(1, dt * 2.2);
    if (now - lastRainDraw < 0.033) return; // ~30fps rain is authentic + cheap
    var step = now - lastRainDraw; lastRainDraw = now;
    rctx.fillStyle = "rgba(0,0,0,0.085)";
    rctx.fillRect(0, 0, W, H);
    for (var i = 0; i < cols.length; i++) {
      var c = cols[i];
      rctx.font = c.size + "px monospace";
      var head = Math.random() < 0.06;
      rctx.fillStyle = head ? "rgba(190,255,205," + (c.alpha * rainAlpha) + ")"
                           : "rgba(32,235,90," + (c.alpha * rainAlpha) + ")";
      rctx.fillText(rndGlyph(), c.x, c.y * FONT);
      c.y += c.speed * rainSpeed * step;
      if (c.y * FONT > H && Math.random() < 0.02) { c.y = 0; c.speed = 5 + Math.random() * 19; }
    }
  }

  /* ============================== WORDS ============================== */
  var WORDS = ["HAPPY", "BIRTHDAY", "MY LOVE"];
  var letters = []; // {el, ch, start, lock}
  var STAGGER = 0.24, SCRAMBLE = 0.42, T0 = 0.5;
  (function buildWords() {
    var idx = 0;
    WORDS.forEach(function (w, wi) {
      var wEl = $("w" + wi);
      if (w === "BIRTHDAY") wEl.classList.add("small");
      for (var i = 0; i < w.length; i++) {
        var s = document.createElement("span");
        s.className = "ch" + (w[i] === " " ? " space" : "");
        s.textContent = w[i] === " " ? " " : rndGlyph();
        wEl.appendChild(s);
        var start = T0 + idx * STAGGER;
        letters.push({ el: s, ch: w[i], start: start, lock: start + SCRAMBLE, done: false });
        idx++;
      }
    });
  })();
  var textTotal = T0 + (letters.length - 1) * STAGGER + SCRAMBLE; // last lock time
  function updateWords(t) {
    var allLocked = true;
    for (var i = 0; i < letters.length; i++) {
      var L = letters[i];
      if (L.ch === " ") { L.done = true; continue; }
      if (t < L.start) { L.el.className = "ch"; allLocked = false; }
      else if (t < L.lock) {
        L.el.className = "ch scramble"; L.el.textContent = rndGlyph(); allLocked = false;
      } else {
        if (!L.done) { L.el.textContent = L.ch; L.el.className = "ch locked"; L.done = true; }
      }
    }
    return allLocked;
  }
  function lettersLockedCount() { var n = 0; letters.forEach(function (L) { if (L.done) n++; }); return n; }

  /* ============================== HEART 3D ============================== */
  var renderer = null, scene = null, camera = null, heartPts = null, heartHome = null, heartDir = null;
  var heartGroup = null, heartReady = false;
  function glowTexture() {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,.75)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  function taubin(x, y, z) {
    var a = x * x + 2.25 * z * z + y * y - 1;
    return a * a * a - x * x * y * y * y - 0.1125 * z * z * y * y * y;
  }
  function buildHeart() {
    renderer = new THREE.WebGLRenderer({ canvas: glCv, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 400);
    camera.position.set(0, 0.5, 43);
    fitCamera();
    heartGroup = new THREE.Group(); scene.add(heartGroup);

    var pos = [], col = [];
    var S = 11.5, tries = 0;
    var pink = new THREE.Color("#ff5c9e"), pinkLight = new THREE.Color("#ffb3d1"), green = new THREE.Color("#39ff6a");
    while (pos.length / 3 < 2600 && tries < 220000) {
      tries++;
      var x = (Math.random() * 2 - 1) * 1.32, y = (Math.random() * 2 - 1) * 1.32, z = (Math.random() * 2 - 1) * 1.32;
      var f = taubin(x, y, z);
      var shell = Math.abs(f) < 0.055;
      var inner = f < -0.03 && Math.random() < 0.16;
      if (!shell && !inner) continue;
      pos.push(x * S, y * S - 0.6, z * S);
      var c = Math.random() < 0.1 ? green : (Math.random() < 0.5 ? pink : pinkLight);
      col.push(c.r, c.g, c.b);
    }
    var geo = new THREE.BufferGeometry();
    heartHome = new Float32Array(pos);
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    heartDir = new Float32Array(pos.length);
    for (var i = 0; i < pos.length; i += 3) {
      var vx = pos[i], vy = pos[i + 1], vz = pos[i + 2];
      var len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
      heartDir[i] = vx / len; heartDir[i + 1] = vy / len; heartDir[i + 2] = vz / len;
    }
    var mat = new THREE.PointsMaterial({
      size: 0.85, map: glowTexture(), vertexColors: true, transparent: true,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    heartPts = new THREE.Points(geo, mat);
    heartPts.frustumCulled = false;
    heartGroup.add(heartPts);
    heartReady = true;
    onResize();
  }
  function fitCamera() {
    if (!camera) return;
    var tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    var fitH = 15.0 / tanH;              // heart half-height ~13.2 + margin
    var fitW = 16.6 / (tanH * camera.aspect); // heart half-width ~15.2 + margin (portrait!)
    camera.position.z = Math.max(fitH, fitW);
  }
  function beatPulse(t) {
    var cyc = t % 1.15, p = 0;
    if (cyc < 0.14) p = Math.sin(cyc / 0.14 * Math.PI);
    else if (cyc > 0.24 && cyc < 0.36) p = 0.65 * Math.sin((cyc - 0.24) / 0.12 * Math.PI);
    return p;
  }
  /* drag orbit */
  var dragging = false, lastPX = 0, lastPY = 0, tRotX = 0.08, tRotY = 0, cRotX = 0.08, cRotY = 0, lastDragAt = -9;
  var userDragged = false, prevCyc = -1;
  function hideDragInd() {
    if (dragIndEl.classList.contains("hidden")) return;
    dragIndEl.classList.add("fade");
    setTimeout(function () { dragIndEl.classList.add("hidden"); dragIndEl.classList.remove("fade"); }, 950);
  }
  function spawnRipple() {
    if (phase !== "heart") return;
    var d = document.createElement("div");
    d.className = "beat-ripple";
    stage.appendChild(d);
    setTimeout(function () { d.remove(); }, 1600);
  }
  glCv.addEventListener("pointerdown", function (e) {
    if (phase !== "heart") return;
    dragging = true; lastPX = e.clientX; lastPY = e.clientY;
  });
  window.addEventListener("pointermove", function (e) {
    if (!dragging || phase !== "heart") return;
    if (!userDragged && (Math.abs(e.clientX - lastPX) > 3 || Math.abs(e.clientY - lastPY) > 3)) {
      userDragged = true; hideDragInd();
    }
    tRotY += (e.clientX - lastPX) * 0.008; tRotX += (e.clientY - lastPY) * 0.005;
    tRotX = Math.max(-0.7, Math.min(0.7, tRotX));
    lastPX = e.clientX; lastPY = e.clientY; lastDragAt = perfNow();
  });
  window.addEventListener("pointerup", function () { dragging = false; });
  glCv.addEventListener("click", function () {
    if (phase === "heart" && perfNow() - phaseStart > 1.0 && !dragging) openCard();
  });

  /* ============================== CARD ============================== */
  var CARD_TEXT = "In a world of endless code,\nyou are the one message\nI never want to skip.\n\nHappy birthday, my love.\nMay this year give you\neverything you quietly wish for,\nand one more reason to smile\nevery single day.";
  var cardDoneShown = false;
  function updateCard(t) {
    var n = Math.min(CARD_TEXT.length, Math.floor(t * 26));
    cardBody.innerHTML = "";
    cardBody.appendChild(document.createTextNode(CARD_TEXT.slice(0, n)));
    var caret = document.createElement("span"); caret.className = "caret"; caret.textContent = "▌";
    cardBody.appendChild(caret);
    if (n >= CARD_TEXT.length && !cardDoneShown) {
      cardDoneShown = true; cardEl.classList.add("typed");
    }
  }

  /* ============================== PHASES ============================== */
  var phase = "intro", phaseStart = 0;
  function perfNow() { return performance.now() / 1000; }
  function setStatus(txt) { statusText.textContent = txt; }
  function enterPhase(p) {
    phase = p; phaseStart = perfNow();
    if (p === "text") {
      introEl.classList.add("hidden"); wordsEl.classList.remove("hidden");
      statusEl.classList.remove("hidden");
      setStatus("> decoding message_");
      rainSpeedTarget = 1.15; rainAlphaTarget = 0.95;
    } else if (p === "heart") {
      wordsEl.classList.add("done");
      setStatus("> signal found: one heartbeat_");
      rainSpeedTarget = 0.45; rainAlphaTarget = 0.5;
      if (!heartReady) buildHeart();
      glCv.classList.remove("hidden-gl");
      setTimeout(function () { if (phase === "heart") wordsEl.classList.add("hidden"); }, 650);
      setTimeout(function () { if (phase === "heart" && !userDragged) dragIndEl.classList.remove("hidden"); }, 900);
      setTimeout(function () { hideDragInd(); }, 7500);
    } else if (p === "burst") {
      hideDragInd();
      setStatus("> opening_");
    } else if (p === "card") {
      glCv.classList.add("hidden-gl");
      cardEl.classList.remove("hidden");
      setStatus("> message delivered_");
      rainSpeedTarget = 0.28; rainAlphaTarget = 0.3;
      if (navigator.vibrate) navigator.vibrate(25);
    }
  }
  function start() {
    if (phase !== "intro") return;
    music.volume = 0.55;
    var pr = music.play(); if (pr && pr.catch) pr.catch(function () {});
    muteBtn.classList.remove("hidden");
    if (navigator.vibrate) navigator.vibrate(30);
    enterPhase("text");
  }
  function openCard() { if (phase === "heart") enterPhase("burst"); }
  introEl.addEventListener("pointerdown", function (e) { e.preventDefault(); start(); });
  $("replay").addEventListener("click", function () { location.reload(); });
  muteBtn.addEventListener("click", function () {
    music.muted = !music.muted; muteBtn.classList.toggle("off", music.muted);
  });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  function onResize() {
    sizeRain();
    if (renderer) {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      fitCamera();
    }
  }
  window.addEventListener("resize", onResize);
  sizeRain();

  /* ============================== MAIN LOOP ============================== */
  var lastFrame = perfNow();
  function loop() {
    requestAnimationFrame(loop);
    var now = perfNow(), dt = Math.min(0.05, now - lastFrame); lastFrame = now;
    drawRain(now, dt);
    var t = now - phaseStart;
    if (phase === "text") {
      var locked = updateWords(t);
      if (locked && t > textTotal + 1.5) enterPhase("heart");
    } else if (phase === "heart" || phase === "burst") {
      if (heartReady) {
        if (!dragging && now - lastDragAt > 2.5) tRotY += dt * 0.3;
        cRotY += (tRotY - cRotY) * Math.min(1, dt * 7);
        cRotX += (tRotX - cRotX) * Math.min(1, dt * 7);
        heartGroup.rotation.y = cRotY; heartGroup.rotation.x = cRotX;
        var beat = 1 + 0.085 * beatPulse(now);
        heartGroup.scale.set(beat, beat, beat);
        if (phase === "heart") {
          var cyc = now % 1.15;
          if (prevCyc >= 0) {
            if (cyc < prevCyc) spawnRipple();                    // lub
            else if (prevCyc < 0.24 && cyc >= 0.24) spawnRipple(); // dub
          }
          prevCyc = cyc;
        }
        if (phase === "burst") {
          var k = Math.min(1, t / 0.9), e = 1 - Math.pow(1 - k, 3);
          var arr = heartPts.geometry.attributes.position.array;
          for (var i = 0; i < arr.length; i += 3) {
            var d = e * 26;
            arr[i] = heartHome[i] + heartDir[i] * d;
            arr[i + 1] = heartHome[i + 1] + heartDir[i + 1] * d;
            arr[i + 2] = heartHome[i + 2] + heartDir[i + 2] * d;
          }
          heartPts.geometry.attributes.position.needsUpdate = true;
          heartPts.material.opacity = 1 - e;
          if (k >= 1) enterPhase("card");
        }
        renderer.render(scene, camera);
      }
      if (phase === "heart" && t > 9) openCard();
    } else if (phase === "card") {
      updateCard(t);
    }
  }
  requestAnimationFrame(loop);

  window.__matrix = {
    get phase() { return phase; },
    start: start,
    openCard: openCard,
    lettersLocked: lettersLockedCount,
    lettersTotal: letters.length,
    heartReady: function () { return heartReady; },
    cardVisible: function () { return !cardEl.classList.contains("hidden"); },
    dragIndVisible: function () { return !dragIndEl.classList.contains("hidden"); },
    rippleCount: function () { return document.querySelectorAll(".beat-ripple").length; },
    musicPlaying: function () { return !music.paused; }
  };
})();
