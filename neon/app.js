"use strict";
/* GALAXY NEON v2 — Happy Birthday My Love
   No title card: the film opens on bare starfield with one pulsing pink star;
   tapping it ignites it into the writing streak. All timing absolute:
   star ignites -> streak handwrites HAPPY / BIRTHDAY / MY LOVE in neon script ->
   pink dots gather from deep space into a classic heart -> beats -> bursts
   across the screen -> 3D rain of loving words (finale, no card). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var stage = $("stage"), glCv = $("gl"), flashEl = $("flash");
  var muteBtn = $("mute");
  // One continuous score for the whole film — MusicEngine + Neon Theme sheet.
  var player = new MusicEngine.Player({ samplesBase: "assets/piano/", volume: 0.9 });
  var sheetReady = player.load(window.NEON_SHEET);

  function perfNow() { return performance.now() / 1000; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
  function easeOut(v) { v = clamp01(v); return 1 - Math.pow(1 - v, 3); }

  /* ================= timeline (seconds from film start) ================= */
  var IGNITE = 0.75;
  var T_WRITE_END = 8.0 + IGNITE;   // incl. hold after last letter
  var T_GATHER_END = T_WRITE_END + 3.4;
  var T_BEAT_END = T_GATHER_END + 3.45;
  var T_BURST_END = T_BEAT_END + 1.15;
  var PHASE_START = { ignite: 0, write: IGNITE, gather: T_WRITE_END, beat: T_GATHER_END, burst: T_BEAT_END, rain: T_BURST_END };

  /* ================= three setup ================= */
  var renderer = new THREE.WebGLRenderer({ canvas: glCv, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x01020a, 1);
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
  camera.position.set(0, 0, 58);
  var composer = null, bloomPass = null;
  try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.55, 0.12);
    composer.addPass(bloomPass);
  } catch (e) { composer = null; }

  var world = new THREE.Group(); scene.add(world);

  function glowTexture(inner, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d");
    var grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner); grad.addColorStop(0.35, outer); grad.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  }
  var dotTex = glowTexture("rgba(255,255,255,1)", "rgba(255,255,255,.4)");

  /* ================= starfield ================= */
  var starLayers = [];
  (function buildStars() {
    var defs = [
      { n: 900, size: 0.55, op: 0.75, sp: 0.9 },
      { n: 650, size: 0.85, op: 0.9, sp: 1.4 },
      { n: 260, size: 1.35, op: 1.0, sp: 2.1 }
    ];
    defs.forEach(function (d, li) {
      var pos = new Float32Array(d.n * 3), col = new Float32Array(d.n * 3);
      for (var i = 0; i < d.n; i++) {
        pos[i * 3] = (Math.random() * 2 - 1) * 95;
        pos[i * 3 + 1] = (Math.random() * 2 - 1) * 72;
        pos[i * 3 + 2] = -120 + Math.random() * 140;
        var t = Math.random();
        var c = t < 0.82 ? [1, 1, 1] : (t < 0.92 ? [0.78, 0.84, 1] : [1, 0.85, 0.92]);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
      var mat = new THREE.PointsMaterial({
        size: d.size, map: dotTex, vertexColors: true, transparent: true, opacity: d.op,
        depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
      });
      var pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      scene.add(pts);
      starLayers.push({ pts: pts, mat: mat, baseOp: d.op, sp: d.sp, ph: li * 2.1 });
    });
  })();

  /* ================= the opening star (in-world tap indicator) ================= */
  var starSprite = null, starRings = [];
  (function buildStar() {
    var tex = glowTexture("rgba(255,255,255,1)", "rgba(255,111,165,.55)");
    starSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: 0xffd7ea, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    starSprite.position.set(0, 1.2, 1);
    starSprite.scale.set(6, 6, 1);
    world.add(starSprite);
    // soft expanding rings around the star
    var rc = document.createElement("canvas"); rc.width = rc.height = 256;
    var rg = rc.getContext("2d");
    rg.strokeStyle = "rgba(255,158,196,.95)"; rg.lineWidth = 4;
    rg.shadowColor = "rgba(255,111,165,.9)"; rg.shadowBlur = 10;
    rg.beginPath(); rg.arc(128, 128, 112, 0, Math.PI * 2); rg.stroke();
    var ringTex = new THREE.CanvasTexture(rc);
    for (var i = 0; i < 2; i++) {
      var rm = new THREE.SpriteMaterial({ map: ringTex, color: 0xff9ec4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
      var rs = new THREE.Sprite(rm);
      rs.position.copy(starSprite.position);
      world.add(rs); starRings.push(rs);
    }
  })();

  /* ================= neon handwriting (sampled script, shader reveal) ================= */
  var LINES = ["Happy", "Birthday", "My Love"];
  var LINE_Y = [11.2, 0.4, -10.4];
  var LINE_W = [25, 32.5, 26.5];
  var LINE_START = [0.3, 2.35, 4.6];
  var textPts = null, textUniforms = null, textPositions = [], textReveals = [];
  var comet = null, cometTrail1 = null, cometTrail2 = null, lastReveal = 0;
  function buildText() {
    var CW = 1200, CH = 300;
    var allPos = [], allRev = [], allSize = [];
    textPositions = []; textReveals = [];
    LINES.forEach(function (line, li) {
      var cv = document.createElement("canvas"); cv.width = CW; cv.height = CH;
      var g = cv.getContext("2d");
      g.font = "132px 'Great Vibes', cursive";
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillStyle = "#fff"; g.fillText(line, CW / 2, CH / 2);
      g.strokeStyle = "#fff"; g.lineWidth = 2.5; // fatten hairlines so sampling merges into one stroke
      g.strokeText(line, CW / 2, CH / 2);
      var data = g.getImageData(0, 0, CW, CH).data;
      var raw = [];
      for (var y = 0; y < CH; y += 2) {
        for (var x = 0; x < CW; x += 2) {
          if (data[(y * CW + x) * 4 + 3] > 100) raw.push([x, y]);
        }
      }
      if (!raw.length) return;
      var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
      raw.forEach(function (p) {
        if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
      });
      // writing order: columns left->right, top->bottom within a column
      raw.sort(function (a, b) {
        var ca = Math.floor(a[0] / 6), cb = Math.floor(b[0] / 6);
        return ca !== cb ? ca - cb : a[1] - b[1];
      });
      var K = LINE_W[li] / Math.max(1, (maxX - minX));
      var cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      var dur = li === 1 ? 2.1 : 1.9;
      raw.forEach(function (p, i) {
        var wx = (p[0] - cx) * K, wy = (cy - p[1]) * K + LINE_Y[li];
        allPos.push(wx, wy, 0);
        allRev.push(LINE_START[li] + (i / Math.max(1, raw.length)) * dur);
        allSize.push(0.21 + Math.random() * 0.12);
        textPositions.push(wx, wy, 0);
        textReveals.push(LINE_START[li] + (i / Math.max(1, raw.length)) * dur);
      });
    });
    lastReveal = 0;
    textReveals.forEach(function (r) { if (r > lastReveal) lastReveal = r; });
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(allPos, 3));
    geo.setAttribute("aReveal", new THREE.Float32BufferAttribute(allRev, 1));
    geo.setAttribute("aSize", new THREE.Float32BufferAttribute(allSize, 1));
    textUniforms = {
      uT: { value: -10 }, uFade: { value: 1 },
      uScale: { value: 1000 }, uGroup: { value: 1 }
    };
    var mat = new THREE.ShaderMaterial({
      uniforms: textUniforms,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: [
        "attribute float aReveal; attribute float aSize;",
        "uniform float uT; uniform float uScale; uniform float uGroup;",
        "varying float vOn; varying float vAge;",
        "void main(){",
        "  vOn = smoothstep(aReveal, aReveal + 0.28, uT);",
        "  vAge = clamp(uT - aReveal, 0.0, 10.0);",
        "  vec4 mv = modelViewMatrix * vec4(position, 1.0);",
        "  gl_PointSize = aSize * uGroup * uScale * (0.55 + 0.45 * vOn) / max(1.0, -mv.z);",
        "  gl_Position = projectionMatrix * mv;",
        "}"
      ].join("\n"),
      fragmentShader: [
        "uniform float uFade; uniform float uT;",
        "varying float vOn; varying float vAge;",
        "void main(){",
        "  float d = length(gl_PointCoord - vec2(0.5));",
        "  float m = smoothstep(0.5, 0.1, d);",
        "  vec3 hot = vec3(1.0, 0.97, 1.0);",
        "  vec3 pink = vec3(1.0, 0.38, 0.64);",
        "  vec3 col = mix(hot, pink, clamp(vAge / 1.15, 0.0, 1.0));",
        "  col *= 0.92 + 0.13 * sin(uT * 2.2 + vAge * 2.0);",
        "  gl_FragColor = vec4(col, m * vOn * uFade);",
        "}"
      ].join("\n")
    });
    textPts = new THREE.Points(geo, mat);
    textPts.frustumCulled = false; textPts.visible = false;
    world.add(textPts);

    var cometTex = glowTexture("rgba(255,255,255,1)", "rgba(255,111,165,.55)");
    function mkComet(scale, op) {
      var sm = new THREE.SpriteMaterial({ map: cometTex, color: 0xffe3f0, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending });
      var s = new THREE.Sprite(sm); s.scale.set(scale, scale, 1); s.visible = false; world.add(s); return s;
    }
    comet = mkComet(6.8, 0.95); cometTrail1 = mkComet(4.6, 0.5); cometTrail2 = mkComet(3.1, 0.3);
    fitWorld();
  }
  if (document.fonts && document.fonts.load) {
    var raced = Promise.race([
      document.fonts.load("132px 'Great Vibes'"),
      new Promise(function (r) { setTimeout(r, 2000); })
    ]);
    raced.then(function () { buildText(); });
    setTimeout(function () { if (!textPts) buildText(); }, 2600); // hard fallback
  } else buildText();
  function frontierIndex(t) {
    var lo = 0, hi = textReveals.length - 1, ans = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (textReveals[mid] <= t) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans;
  }

  /* ================= heart — classic heart curve, puffy volume ================= */
  var heartPts = null, heartHome = null, heartStart = null, heartStag = null, heartVel = null;
  (function buildHeart() {
    // parametric heart outline: deep top cleft, sharp bottom tip — reads as a heart from any angle
    var SEG = 240, poly = [];
    for (var si = 0; si < SEG; si++) {
      var t = si / SEG * Math.PI * 2, s3 = Math.sin(t);
      poly.push([
        16 * s3 * s3 * s3,
        13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      ]);
    }
    function inPoly(x, y) {
      var inside = false;
      for (var i = 0, j = SEG - 1; i < SEG; j = i++) {
        var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
      }
      return inside;
    }
    function distEdge(x, y) {
      var best = 1e9;
      for (var i = 0, j = SEG - 1; i < SEG; j = i++) {
        var ax = poly[j][0], ay = poly[j][1], bx = poly[i][0], by = poly[i][1];
        var dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1;
        var u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2));
        var ex = ax + u * dx - x, ey = ay + u * dy - y, d2 = ex * ex + ey * ey;
        if (d2 < best) best = d2;
      }
      return Math.sqrt(best);
    }
    var HS = 0.8, YOFF = 2.55;
    var pos = [], col = [];
    var pink = new THREE.Color("#ff5c9e"), light = new THREE.Color("#ffc4dd"), white = new THREE.Color("#fff0f6");
    var guard = 0;
    while (pos.length / 3 < 2400 && guard < 300000) {
      guard++;
      var x = (Math.random() * 2 - 1) * 16.5, y = -17.5 + Math.random() * 30;
      if (!inPoly(x, y)) continue;
      var d = distEdge(x, y);
      if (d > 0.85 && Math.random() < 0.45) continue; // denser rim = crisp silhouette
      var zHalf = 2.7 * Math.sqrt(Math.min(1, d / 6.0));
      var z = (Math.random() * 2 - 1) * zHalf;
      pos.push(x * HS, (y + YOFF) * HS, z);
      var c = Math.random() < 0.12 ? white : (Math.random() < 0.55 ? pink : light);
      col.push(c.r, c.g, c.b);
    }
    var n = pos.length / 3;
    heartHome = new Float32Array(pos);
    heartStart = new Float32Array(n * 3);
    heartStag = new Float32Array(n);
    heartVel = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      var th = Math.random() * Math.PI * 2, ph = Math.acos(Math.random() * 2 - 1), R = 75 + Math.random() * 85;
      heartStart[i * 3] = R * Math.sin(ph) * Math.cos(th);
      heartStart[i * 3 + 1] = R * Math.cos(ph) * 0.8;
      heartStart[i * 3 + 2] = R * Math.sin(ph) * Math.sin(th) - 55;
      heartStag[i] = Math.random() * 0.9;
      var vx = heartHome[i * 3], vy = heartHome[i * 3 + 1], vz = heartHome[i * 3 + 2] + 5;
      var len = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1, sp = 22 + Math.random() * 24;
      heartVel[i * 3] = vx / len * sp; heartVel[i * 3 + 1] = vy / len * sp; heartVel[i * 3 + 2] = vz / len * sp * 0.4 + 6;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos.slice(), 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.8, map: dotTex, vertexColors: true, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    heartPts = new THREE.Points(geo, mat);
    heartPts.frustumCulled = false; heartPts.visible = false;
    world.add(heartPts);
  })();
  function beatPulse(t) {
    var cyc = t % 1.15, p = 0;
    if (cyc < 0.14) p = Math.sin(cyc / 0.14 * Math.PI);
    else if (cyc > 0.24 && cyc < 0.36) p = 0.65 * Math.sin((cyc - 0.24) / 0.12 * Math.PI);
    return p;
  }
  function setHeartPos(fn) {
    var arr = heartPts.geometry.attributes.position.array;
    for (var i = 0; i < arr.length; i += 3) fn(i, arr);
    heartPts.geometry.attributes.position.needsUpdate = true;
  }

  /* ================= pink dust (appears with the burst) ================= */
  var dustPts = null;
  (function buildDust() {
    var n = 320, pos = new Float32Array(n * 3);
    for (var i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() * 2 - 1) * 30;
      pos[i * 3 + 1] = (Math.random() * 2 - 1) * 30;
      pos[i * 3 + 2] = -30 + Math.random() * 40;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      size: 0.5, map: dotTex, color: 0xff9ec4, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    });
    dustPts = new THREE.Points(geo, mat);
    dustPts.frustumCulled = false; dustPts.visible = false;
    world.add(dustPts);
  })();

  /* ================= word rain 3D (finale) ================= */
  var PHRASES = ["I love you", "Forever yours", "You are my universe", "My heart is yours",
    "Always by your side", "To the moon and back", "Yêu em", "Thương lắm", "Mãi bên nhau", "My Love"];
  var TINTS = [0xffffff, 0xffd7ea, 0xff9ec4, 0xffc4dd, 0xffe3f0];
  var wordTextures = PHRASES.map(function (p) {
    var cv = document.createElement("canvas"); cv.width = 640; cv.height = 160;
    var g = cv.getContext("2d");
    var fs = 64; g.font = "700 " + fs + "px 'Segoe UI', Arial, sans-serif";
    while (g.measureText(p).width > 600 && fs > 30) { fs -= 4; g.font = "700 " + fs + "px 'Segoe UI', Arial, sans-serif"; }
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = "rgba(255,77,141,.95)"; g.shadowBlur = 20;
    g.fillStyle = "#fff0f6";
    g.fillText(p, 320, 82); g.fillText(p, 320, 82);
    return new THREE.CanvasTexture(cv);
  });
  var rainSprites = [];
  (function buildRain() {
    for (var i = 0; i < 34; i++) {
      var ti = Math.floor(Math.random() * PHRASES.length);
      var m = new THREE.SpriteMaterial({
        map: wordTextures[ti], color: TINTS[Math.floor(Math.random() * TINTS.length)],
        transparent: true, opacity: 0, depthWrite: false
      });
      var s = new THREE.Sprite(m);
      var wdt = 5.5 + PHRASES[ti].length * 0.34;
      s.scale.set(wdt, wdt * 0.25, 1);
      s.userData = { speed: 0, swayPh: Math.random() * Math.PI * 2, baseOp: 0.8, ti: ti };
      respawnWord(s, true);
      s.visible = false;
      world.add(s); rainSprites.push(s);
    }
  })();
  function respawnWord(s, anywhere) {
    var best = null;
    for (var a = 0; a < 7; a++) {
      var z = -36 + Math.pow(Math.random(), 1.35) * 44;
      var cand = {
        x: (Math.random() * 2 - 1) * 18,
        y: anywhere ? -28 + Math.random() * 58 : 33,
        z: z, d: (z + 36) / 44
      };
      var ok = true;
      for (var j = 0; j < rainSprites.length; j++) {
        var o = rainSprites[j];
        if (o === s) continue;
        if (Math.abs(o.position.x - cand.x) < 7.5 && Math.abs(o.position.y - cand.y) < 6) { ok = false; break; }
      }
      best = cand;
      if (ok) break;
    }
    s.position.set(best.x, best.y, best.z);
    s.userData.speed = 2.0 + best.d * 4.2;
    s.userData.baseOp = 0.45 + best.d * 0.55;
  }

  /* ================= sizing / fit ================= */
  function fitWorld() {
    var w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    if (composer) composer.setSize(w, h);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    var tanH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    var visH = 2 * 58 * tanH, visW = visH * camera.aspect;
    var s = Math.min(1.12, visW * 0.95 / 38.5, visH * 0.94 / 30);
    world.scale.setScalar(s);
    if (textUniforms) {
      textUniforms.uGroup.value = s;
      textUniforms.uScale.value = renderer.domElement.height / (2 * tanH);
    }
  }
  window.addEventListener("resize", fitWorld);

  /* ================= flow ================= */
  var started = false, filmStart = 0, prevPhase = "intro";
  function phaseAt(ft) {
    if (!started) return "intro";
    if (ft < IGNITE) return "ignite";
    if (ft < T_WRITE_END) return "write";
    if (ft < T_GATHER_END) return "gather";
    if (ft < T_BEAT_END) return "beat";
    if (ft < T_BURST_END) return "burst";
    return "rain";
  }
  function start() {
    if (started) return;
    started = true; filmStart = perfNow();
    sheetReady.then(function () { player.play(); });
    muteBtn.classList.remove("hidden");
    if (navigator.vibrate) navigator.vibrate(30);
  }
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest("#mute")) return;
    if (!started) { start(); return; }
    var ft = perfNow() - filmStart;
    if (phaseAt(ft) === "rain" && ft - T_BURST_END > 1.2) {
      filmStart = perfNow(); // replay film + score together
      player.stop();
      sheetReady.then(function () { player.play(); });
    }
  });
  muteBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    player.setMuted(!player.muted);
    muteBtn.classList.toggle("off", player.muted);
  });
  document.addEventListener("contextmenu", function (e) { e.preventDefault(); });

  /* ================= main loop ================= */
  var lastFrame = perfNow();
  function loop() {
    requestAnimationFrame(loop);
    var now = perfNow(), dt = Math.min(0.05, now - lastFrame); lastFrame = now;
    var ft = started ? now - filmStart : -1;
    var phase = phaseAt(ft);
    if (phase !== prevPhase) prevPhase = phase;

    starLayers.forEach(function (L, i) {
      L.mat.opacity = L.baseOp * (0.78 + 0.22 * Math.sin(now * L.sp + L.ph));
      L.pts.rotation.y = now * 0.004 * (i + 1);
    });
    camera.position.x = Math.sin(now * 0.07) * 1.5;
    camera.position.y = Math.cos(now * 0.09) * 1.0;
    camera.lookAt(0, 0, 0);

    // ---- opening star: pulses before start, ignites into the streak ----
    if (!started) {
      starSprite.visible = true;
      var bs = 5.8 + 1.0 * Math.sin(now * 3.0);
      starSprite.scale.set(bs, bs, 1);
      starRings.forEach(function (rs, ri) {
        var cyc = ((now * 0.55 + ri * 0.5) % 1);
        var sc = 6 + cyc * 13;
        rs.visible = true; rs.scale.set(sc, sc, 1);
        rs.material.opacity = 0.8 * (1 - cyc);
      });
    } else if (phase === "ignite") {
      var k = smooth(ft / IGNITE);
      var tx = textPositions.length ? textPositions[0] : -10;
      var ty = textPositions.length ? textPositions[1] : LINE_Y[0];
      starSprite.visible = true;
      starSprite.position.set(0 + (tx - 0) * k, 1.2 + (ty - 1.2) * k, 1 - 0.5 * k);
      var ss = 6 + 2.2 * k;
      starSprite.scale.set(ss, ss, 1);
      starRings.forEach(function (rs) { rs.visible = false; });
    } else {
      starSprite.visible = false;
      starRings.forEach(function (rs) { rs.visible = false; });
    }

    // ---- text + comet ----
    if (textPts) {
      textPts.visible = started && (phase === "write" || phase === "gather");
      if (started) {
        var wt = ft - IGNITE; // writing clock
        textUniforms.uT.value = wt;
        var fade = 1;
        if (phase === "gather") fade = 1 - clamp01((ft - T_WRITE_END) / 0.8);
        if (phase === "beat" || phase === "burst" || phase === "rain" || phase === "ignite") fade = phase === "ignite" ? 1 : fade;
        textUniforms.uFade.value = (phase === "beat" || phase === "burst" || phase === "rain") ? 0 : fade;
        var fi = (phase === "write") ? frontierIndex(wt) : -1;
        [[comet, fi], [cometTrail1, fi - 90], [cometTrail2, fi - 200]].forEach(function (pair) {
          var spr = pair[0], idx = pair[1];
          if (!spr) return;
          if (idx >= 0 && wt < lastReveal + 0.05) {
            spr.visible = true;
            spr.position.set(textPositions[idx * 3], textPositions[idx * 3 + 1], 0.5);
          } else spr.visible = false;
        });
        if (comet) comet.material.opacity = 0.85 + 0.15 * Math.sin(now * 22);
      }
    }

    // ---- heart ----
    var hVis = started && (phase === "gather" || phase === "beat" || phase === "burst");
    heartPts.visible = hVis;
    if (hVis) {
      if (phase === "gather") {
        var gt = ft - T_WRITE_END, gg = smooth(gt / 3.4);
        setHeartPos(function (i, arr) {
          var p = i / 3, k2 = smooth((gt - heartStag[p]) / 2.5);
          arr[i] = heartStart[i] + (heartHome[i] - heartStart[i]) * k2;
          arr[i + 1] = heartStart[i + 1] + (heartHome[i + 1] - heartStart[i + 1]) * k2;
          arr[i + 2] = heartStart[i + 2] + (heartHome[i + 2] - heartStart[i + 2]) * k2;
        });
        heartPts.material.opacity = clamp01(gt * 1.6);
        heartPts.material.size = 0.8;
        heartPts.position.z = -16 * (1 - gg);
        heartPts.scale.setScalar(0.82 + 0.18 * gg);
        heartPts.rotation.y = 0.12 * Math.sin(gt * 0.8);
      } else if (phase === "beat") {
        var bt = ft - T_GATHER_END;
        setHeartPos(function (i, arr) { arr[i] = heartHome[i]; arr[i + 1] = heartHome[i + 1]; arr[i + 2] = heartHome[i + 2]; });
        heartPts.material.opacity = 1;
        heartPts.position.z = 0;
        heartPts.scale.setScalar(1 + 0.085 * beatPulse(bt));
        heartPts.rotation.y = 0.18 * Math.sin(bt * 0.7);
      } else if (phase === "burst") {
        var ut = ft - T_BEAT_END, bk = clamp01(ut / 1.15), e = 1 - Math.pow(1 - bk, 2);
        setHeartPos(function (i, arr) {
          arr[i] = heartHome[i] + heartVel[i] * e;
          arr[i + 1] = heartHome[i + 1] + heartVel[i + 1] * e;
          arr[i + 2] = heartHome[i + 2] + heartVel[i + 2] * e;
        });
        heartPts.material.size = 0.8 + 0.55 * e;
        heartPts.scale.setScalar(1 + 0.12 * (1 - bk));
        heartPts.material.opacity = 1 - smooth((bk - 0.55) / 0.45) * 0.95;
        flashEl.style.opacity = String(0.95 * Math.pow(1 - bk, 1.5));
      }
    }
    if (phase !== "burst") flashEl.style.opacity = "0";

    // ---- dust + rain ----
    var rainOn = phase === "rain";
    dustPts.visible = rainOn;
    if (rainOn) {
      var rt = ft - T_BURST_END;
      dustPts.material.opacity = 0.5 * clamp01(rt / 1.6);
      dustPts.rotation.y = now * 0.02;
      var ramp = clamp01(rt / 1.6);
      rainSprites.forEach(function (s) {
        s.visible = true;
        s.position.y -= s.userData.speed * dt * (0.4 + 0.6 * ramp);
        s.position.x += Math.sin(now * 0.7 + s.userData.swayPh) * dt * 0.7;
        if (s.position.y < -32) respawnWord(s, false);
        s.material.opacity = s.userData.baseOp * ramp;
      });
      for (var a = 0; a < rainSprites.length; a++) {
        for (var b = a + 1; b < rainSprites.length; b++) {
          var A = rainSprites[a], B = rainSprites[b];
          var dx = Math.abs(A.position.x - B.position.x);
          var dy = A.position.y - B.position.y;
          var needX = (A.scale.x + B.scale.x) * 0.36;
          if (dx < needX && Math.abs(dy) < 2.7) {
            var push = (2.7 - Math.abs(dy)) * 0.9 * Math.min(1, dt * 10) * (dy >= 0 ? 1 : -1);
            A.position.y += push; B.position.y -= push;
          }
        }
      }
    } else {
      rainSprites.forEach(function (s) { s.visible = false; });
    }

    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  fitWorld();
  requestAnimationFrame(loop);

  window.__neon = {
    get phase() { return phaseAt(started ? perfNow() - filmStart : -1); },
    start: start,
    skipTo: function (name) {
      if (!started) start();
      filmStart = perfNow() - (PHASE_START[name] || 0) - 0.05;
    },
    textRevealed: function () {
      var wt = started ? perfNow() - filmStart - IGNITE : 0, n = 0;
      for (var i = 0; i < textReveals.length; i++) if (textReveals[i] <= wt) n++;
      return textReveals.length ? n / textReveals.length : 0;
    },
    textTotal: function () { return textReveals.length; },
    rainVisible: function () { var n = 0; rainSprites.forEach(function (s) { if (s.visible && s.material.opacity > 0.25) n++; }); return n; },
    heartOpacity: function () { return heartPts.material.opacity; },
    musicPlaying: function () { return !!(player && player.playing); },
    notesPlayed: function () { return player ? player.notesPlayed : 0; }
  };
})();
