"use strict";
/* ĐIỀU PHỐI — một WebGL context dùng chung cho mọi màn (như mẫu tham chiếu).
   Pha: intro (nụ hoa) -> bloom -> rain (mưa) -> gather (giữ gom) -> heart/orbit
   (ngân hà) -> burst (bùng nổ) -> letter (lá thư). */
(function () {
  const $ = id => document.getElementById(id);
  document.addEventListener("contextmenu", e => e.preventDefault());

  const LITE = (() => {
    if (location.search.indexOf("lite") >= 0) return true;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory;
    return cores <= 4 || (typeof mem === "number" && mem <= 4);
  })();

  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, LITE ? 1.5 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  $("gl").appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  (function setBg() {
    const c = document.createElement("canvas"); c.width = 16; c.height = 512;
    const g = c.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, "#FFD9AC");
    grad.addColorStop(0.38, "#FFB9CE");
    grad.addColorStop(0.72, "#F78FB3");
    grad.addColorStop(1, "#EE82AC");
    g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    scene.background = tex;
  })();

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 34);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const dir = new THREE.DirectionalLight(0xfff2dd, 0.5);
  dir.position.set(3, 6, 8); scene.add(dir);
  const pt = new THREE.PointLight(0xff9ebb, 0.3, 60);
  pt.position.set(0, 2, 12); scene.add(pt);

  /* ---------- bloom (phát sáng) — lỗi thì tự lùi về render thường ---------- */
  let composer = null;
  if (location.search.indexOf("nobloom") >= 0) composer = null;
  else try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    const bloom = new THREE.UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight), 0.38, 0.45, 0.8);
    composer.addPass(bloom);
  } catch (e) { composer = null; }

  /* ---------- dựng các màn ---------- */
  Rose.build(scene);
  let rainBuilt = false;
  function buildRain() {
    if (rainBuilt) return; rainBuilt = true;
    Rain.build(scene, camera, LITE);
  }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 1200))]).then(buildRain);
  } else buildRain();
  Finale.initLetter();

  /* ---------- nhạc ---------- */
  const bgm = $("bgm");
  let musicStarted = false;
  function startMusic() {
    if (musicStarted) return; musicStarted = true;
    bgm.volume = 0;
    const pr = bgm.play();
    if (pr && pr.catch) pr.catch(() => {});
    $("btn-music").classList.remove("muted");
    const iv = setInterval(() => {
      bgm.volume = Math.min(0.5, bgm.volume + 0.04);
      if (bgm.volume >= 0.5) clearInterval(iv);
    }, 120);
  }
  $("btn-music").addEventListener("click", e => {
    e.stopPropagation();
    if (!musicStarted) { startMusic(); return; }
    bgm.muted = !bgm.muted;
    $("btn-music").classList.toggle("muted", bgm.muted);
  });

  /* ---------- máy trạng thái ---------- */
  let phase = "intro"; // intro | rain | orbit | done
  const hint = $("hint"), ring = $("hold-ring"), ringFg = $("hold-fg");
  const CIRC = 169.6;

  Rain.onProgress = (p, holding) => {
    ringFg.style.strokeDashoffset = String(CIRC * (1 - p));
    ring.classList.toggle("show", holding || p > 0.02);
  };
  Rain.onFormed = () => {
    phase = "orbit";
    hint.classList.remove("show");
    ring.classList.remove("show");
    Finale.start(projectHeart);
    $("heart-ui").classList.add("show");
  };
  Finale.onBeat = n => {
    $("heart-count").textContent = n + " / 3 nhịp tim";
    $("heart-fill").style.width = (n / 3 * 100) + "%";
    if (n >= 3) $("heart-hint").textContent = "Trái tim đang mở ra điều bất ngờ…";
  };
  Finale.onBurst = () => {
    phase = "done";
    setTimeout(() => $("heart-ui").classList.remove("show"), 600);
  };
  Rose.onBloomDone = () => {
    Rose.burst();
    buildRain();
    Rain.start();
    setTimeout(() => { if (phase === "rain") hint.classList.add("show"); }, 2100);
  };

  $("btn-start").addEventListener("click", () => {
    if (phase !== "intro") return;
    phase = "rain";
    startMusic();
    $("ui-intro").classList.add("gone");
    setTimeout(() => { $("ui-intro").style.display = "none"; }, 850);
    Rose.startBloom();
  });

  /* ---------- chạm / giữ ---------- */
  function projectHeart() {
    const v = Rain.getHeartCenter().clone().project(camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (-v.y + 1) / 2 * window.innerHeight };
  }
  let holdingPointer = false;
  window.addEventListener("pointerdown", e => {
    if (e.target.closest("#btn-music") || e.target.closest(".ocard") || e.target.closest("#letter") || e.target.closest("#btn-start")) return;
    if (phase === "rain") {
      holdingPointer = true;
      ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px";
      ring.style.transform = "translate(-50%,-50%)";
      Rain.setHold(true, e.clientX, e.clientY);
      hint.classList.remove("show");
    } else if (phase === "orbit") {
      const c = projectHeart();
      const d = Math.hypot(e.clientX - c.x, e.clientY - c.y);
      if (d < 135) Finale.beat();
    }
  });
  window.addEventListener("pointermove", e => {
    if (!holdingPointer) return;
    ring.style.left = e.clientX + "px"; ring.style.top = e.clientY + "px";
    Rain.setHold(true, e.clientX, e.clientY);
  });
  ["pointerup", "pointercancel"].forEach(ev => window.addEventListener(ev, () => {
    if (!holdingPointer) return;
    holdingPointer = false;
    Rain.setHold(false);
  }));

  /* ---------- vòng lặp ---------- */
  const clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    const dt = Math.min(location.search.indexOf("fast") >= 0 ? 0.5 : 0.05, clock.getDelta());
    const t = clock.elapsedTime;
    Rose.update(dt, t);
    if (rainBuilt) Rain.update(dt, t);
    Finale.update(dt, t);
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  loop();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
  });
})();
