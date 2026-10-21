'use strict';
/* Bay Qua Trời Hoa — a 3D flight through three flower skies.
   One continuous world, three altitudes, two hard camera flights between them:
   a flower garden at the ground, a petal vortex in the open sky, and a sea of
   clouds where the flowers gather into a beating 3D heart — the letter inside it.
   Everything is driven by her hands: drag to look, hold to gather the wind,
   swipe up to fly, tap the vortex core three times to dive through it. */

const glEl = document.getElementById('gl');
const titleCard = document.getElementById('titleCard');
const cardWrap = document.getElementById('cardWrap');
const lineEl = document.getElementById('line');
const replayBtn = document.getElementById('replay');
const music = document.getElementById('music');
const shimmer = document.getElementById('shimmer');
const chime = document.getElementById('chime');
const unlockSnd = document.getElementById('unlockSnd');

const GY = 0, VY = 70, HY = 140;               // the three altitudes
const SPECIES = ['rose', 'peony', 'allium', 'tulip', 'hydrangea', 'lisianthus', 'baby'];

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
glEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xfbd3e0, 58, 200);
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 3.4, 14);

const composer = null;   // bright pastel world: no bloom pass (it blows the sky to white)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);

});

// ---------- textures made in-code (sky, ground, cloud, glow) ----------
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  return t;
}
const skyTex = canvasTex(64, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#ff9fc0'); g.addColorStop(0.4, '#ffc2d4');
  g.addColorStop(0.72, '#ffe3c2'); g.addColorStop(1, '#ffd09a');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(320, 24, 16),
  new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
);
scene.add(sky);

const groundTex = canvasTex(512, 512, (x, w, h) => {
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 256);
  g.addColorStop(0, '#a8d47e'); g.addColorStop(0.55, '#8fc46a');
  g.addColorStop(0.85, '#79b25e'); g.addColorStop(1, '#d9a7b8');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
});
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(120, 40),
  new THREE.MeshBasicMaterial({ map: groundTex })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const cloudTex = canvasTex(256, 256, (x) => {
  for (const [cx, cy, r, a] of [[128, 140, 86, 0.85], [84, 150, 56, 0.7], [176, 150, 60, 0.7], [128, 112, 58, 0.75]]) {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,252,248,${a})`); g.addColorStop(0.7, `rgba(255,240,244,${a * 0.55})`); g.addColorStop(1, 'rgba(255,240,244,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  }
});
const clouds = [];
{
  const mat = new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, opacity: 0.95 });
  for (let i = 0; i < 44; i++) {
    const sp = new THREE.Sprite(mat);
    const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 38;
    sp.position.set(Math.cos(a) * r, HY - 9 + Math.random() * 13, Math.sin(a) * r - 4);
    const s = 11 + Math.random() * 17;
    sp.scale.set(s, s * 0.52, 1);
    sp.userData.ph = Math.random() * 6.28;
    clouds.push(sp); scene.add(sp);
  }
  // a soft cloud floor far below the heart so the altitude reads
  for (let i = 0; i < 16; i++) {
    const sp = new THREE.Sprite(mat);
    const a = Math.random() * Math.PI * 2, r = 16 + Math.random() * 46;
    sp.position.set(Math.cos(a) * r, HY - 26 + Math.random() * 6, Math.sin(a) * r);
    const s = 22 + Math.random() * 22;
    sp.scale.set(s, s * 0.5, 1);
    sp.userData.ph = Math.random() * 6.28;
    clouds.push(sp); scene.add(sp);
  }
}

// ---------- instanced real flowers ----------
// cylindrical billboard: each instance turns around Y to face the camera
function billboardPatch(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          vec3 toCam = cameraPosition - ip.xyz;
          float ang = atan(toCam.x, toCam.z);
          float ca = cos(ang), sa = sin(ang);
          transformed = vec3(ca * transformed.x + sa * transformed.z, transformed.y, -sa * transformed.x + ca * transformed.z);
        }`);
  };
  return mat;
}
const texLoader = new THREE.TextureLoader();
function flowerMesh(species, count, useBillboard) {
  const tex = texLoader.load(`assets/img/${species}.webp`);
  const mat = new THREE.MeshBasicMaterial({ map: tex, alphaTest: 0.42, side: THREE.DoubleSide });
  if (useBillboard !== false) billboardPatch(mat);   // shader billboard only works for scene-level meshes
  const geo = new THREE.PlaneGeometry(1, 1);
  const mesh = new THREE.InstancedMesh(geo, mat, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.userData.places = [];
  return mesh;
}
// for meshes inside rotating groups the shader billboard breaks (it works in local
// space) — those instances are re-faced toward the camera in JS every frame instead
function faceInstances(mesh, groupPos, groupYaw) {
  const places = mesh.userData.places;
  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const wx = groupPos.x + Math.cos(groupYaw) * p.x + Math.sin(groupYaw) * p.z;
    const wz = groupPos.z - Math.sin(groupYaw) * p.x + Math.cos(groupYaw) * p.z;
    const rotLocal = Math.atan2(camera.position.x - wx, camera.position.z - wz) - groupYaw;
    setInst(mesh, i, p.x, p.y, p.z, p.s, rotLocal);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
const dummy = new THREE.Object3D();
function setInst(mesh, i, x, y, z, s, rotY) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(0, rotY || 0, 0);
  dummy.scale.set(s, s, s);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

// the garden: rings of flowers planted in the meadow
const gardenMeshes = [];
{
  SPECIES.forEach((sp) => {
    const N = 104;
    const m = flowerMesh(sp, N);
    for (let i = 0; i < N; i++) {
      let x = 0, z = 0;
      if (i >= 88) {          // foreground band framing the camera's view
        x = (5 + Math.random() * 6) * (Math.random() < 0.5 ? -1 : 1);
        z = 3.5 + Math.random() * 4.5;
      } else {
        for (let tries = 0; tries < 6; tries++) {
          const a = Math.random() * Math.PI * 2;
          const r = 8 + Math.pow(Math.random(), 0.8) * 38;
          x = Math.cos(a) * r; z = Math.sin(a) * r;
          if (Math.hypot(x - 0, z - 16.5) > 6.5) break;   // keep the camera's clearing open
        }
      }
      const s = i >= 88 ? 0.8 + Math.random() * 0.45 : 0.85 + Math.random() * 1.15;
      setInst(m, i, x, s * 0.5, z, s, 0);
      m.userData.places.push({ x, y: s * 0.5, z, s });
    }
    m.instanceMatrix.needsUpdate = true;
    gardenMeshes.push(m); scene.add(m);
  });
}
// the vortex rings: three slow rings of flowers circling the sky zone
const rings = [];
{
  const defs = [
    { y: VY - 8, r: 9, speed: 0.24 },
    { y: VY, r: 12, speed: -0.17 },
    { y: VY + 8, r: 15, speed: 0.12 },
  ];
  for (const d of defs) {
    const g = new THREE.Group();
    g.position.y = d.y;
    SPECIES.forEach((sp, si) => {
      const N = 11;
      const m = flowerMesh(sp, N, false);
      for (let i = 0; i < N; i++) {
        const a = ((i + si / SPECIES.length) / N) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
        const s = 0.95 + Math.random() * 0.55;
        const px = Math.cos(a) * d.r, py = (Math.random() - 0.5) * 1.6, pz = Math.sin(a) * d.r;
        setInst(m, i, px, py, pz, s, 0);
        m.userData.places.push({ x: px, y: py, z: pz, s });
      }
      m.instanceMatrix.needsUpdate = true;
      g.add(m);
    });
    g.userData.speed = d.speed;
    rings.push(g); scene.add(g);
  }
}
// the heart: real flowers standing on the heart curve, floating over the clouds
const heartGroup = new THREE.Group();
heartGroup.position.set(0, HY, 0);
scene.add(heartGroup);
function heartCurve(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return { x: x * 0.24, y: y * 0.24 };
}
{
  SPECIES.forEach((sp, si) => {
    const N = 13;
    const m = flowerMesh(sp, N, false);
    for (let i = 0; i < N; i++) {
      const t = ((i + si / SPECIES.length) / N) * Math.PI * 2;
      const p = heartCurve(t);
      const s = 1.05 + Math.random() * 0.55;
      const pz = (Math.random() - 0.5) * 0.7;
      setInst(m, i, p.x, p.y, pz, s, 0);
      m.userData.places.push({ x: p.x, y: p.y, z: pz, s });
    }
    m.instanceMatrix.needsUpdate = true;
    heartGroup.add(m);
  });
}
// a warm glow sprite behind the heart
{
  const glowTex = canvasTex(128, 128, (x) => {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,190,205,0.85)'); g.addColorStop(0.55, 'rgba(255,160,185,0.32)'); g.addColorStop(1, 'rgba(255,160,185,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false }));
  glow.scale.set(13, 13, 1);
  glow.position.z = -1.6;
  heartGroup.add(glow);
  heartGroup.userData.glow = glow;
}

// ---------- the petal river: one particle system, many conformations ----------
const PN = 2400;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PN * 3);
const seeds = [];
for (let i = 0; i < PN; i++) {
  seeds.push({
    a: Math.random() * Math.PI * 2,          // angle seed
    r: Math.pow(Math.random(), 0.6),          // radius seed 0..1
    h: Math.random(),                          // height seed
    sp: 0.6 + Math.random() * 0.9,             // personal speed
    ph: Math.random() * Math.PI * 2,
    sz: 0.5 + Math.random() * 0.9,
  });
  pPos[i * 3] = (Math.random() - 0.5) * 30;
  pPos[i * 3 + 1] = 2 + Math.random() * 8;
  pPos[i * 3 + 2] = (Math.random() - 0.5) * 30;
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const petalTex = texLoader.load('assets/img/petal.webp');
const points = new THREE.Points(pGeo, new THREE.PointsMaterial({
  map: petalTex, size: 0.72, transparent: true, depthWrite: false,
  opacity: 0.62, color: 0xff8fab, sizeAttenuation: true,
}));
scene.add(points);
const burstVel = new Float32Array(PN * 3);
const burstLife = new Float32Array(PN);
let petalMode = 'drift';      // drift | storm | vortex | tunnel | heart
let vortexPulse = 0;

// each petal has a parametric home per mode; the flight feel comes from the
// camera moving while the homes stream past it
const _t = { x: 0, y: 0, z: 0 };
function petalTarget(i, s, now, out) {
  if (petalMode === 'drift') {
    const bx = Math.cos(s.a) * (5 + s.r * 25);
    let bz = Math.sin(s.a) * (5 + s.r * 25) - 7;
    if (bz > 6) bz = 12 - bz;   // never drift through the camera
    out.x = bx + Math.sin(now * 0.5 * s.sp + s.ph) * 1.6;
    out.y = 2.4 + s.h * 6.5 + Math.sin(now * 0.8 * s.sp + s.ph * 2) * 0.9;
    out.z = bz + Math.cos(now * 0.4 * s.sp + s.ph) * 1.6;
    if (i % 3 !== 0) { out.y = 11 + s.h * 13; out.x *= 1.7; out.z = out.z * 1.7 - 8; }
  } else if (petalMode === 'storm') {
    const ang = s.a + now * 2.3 * s.sp;
    const y = ((s.h + now * 0.16 * s.sp) % 1) * 74 - 6;
    const rad = 1.5 + s.r * 8.5;
    out.x = Math.cos(ang) * rad;
    out.y = y;
    out.z = Math.sin(ang) * rad;
  } else if (petalMode === 'vortex') {
    const h = ((s.h + now * 0.055 * s.sp) % 1) * 36;
    const ang = s.a + now * (1.5 - h * 0.016) * s.sp;
    const rad = (2.6 + h * 0.30) * (1 + vortexPulse * 0.35);
    out.x = Math.cos(ang) * rad;
    out.y = VY - 18 + h;
    out.z = Math.sin(ang) * rad;
  } else if (petalMode === 'tunnel') {
    const ang = s.a + now * 3.1 * s.sp;
    const rad = 1.6 + s.r * 6.5;
    const fall = ((s.h + now * 0.62 * s.sp) % 1) * 78;
    out.x = Math.cos(ang) * rad;
    out.y = camera.position.y + 34 - fall;
    out.z = Math.sin(ang) * rad;
  } else { // heart: half form the heart, half fall as gentle rain around it
    if (i % 3 === 0) {
      const tt = (i / PN) * Math.PI * 6;
      const p = heartCurve(tt % (Math.PI * 2));
      const layer = (Math.floor(tt / (Math.PI * 2)) - 1) * 0.8;
      out.x = p.x * 0.82;
      out.y = HY + p.y * 0.82 + Math.sin(now * 1.3 + s.ph) * 0.14;
      out.z = layer + Math.cos(now + s.ph) * 0.1;
    } else {
      const bx = Math.cos(s.a) * (9.5 + s.r * 17), bz = Math.sin(s.a) * (9.5 + s.r * 17) - 3;
      out.x = bx + Math.sin(now * 0.6 + s.ph) * 0.8;
      out.y = HY + 15 - ((s.h + now * 0.03 * s.sp) % 1) * 30;
      out.z = bz;
    }
  }
  return out;
}
function burstAt(wx, wy, wz, n) {
  let done = 0;
  for (let i = 0; i < PN && done < n; i++) {
    if (burstLife[i] > 0) continue;
    const d = Math.hypot(pPos[i * 3] - wx, pPos[i * 3 + 1] - wy, pPos[i * 3 + 2] - wz);
    if (d > 7) continue;
    burstLife[i] = 1.1 + Math.random() * 0.4;
    burstVel[i * 3] = (Math.random() - 0.5) * 7;
    burstVel[i * 3 + 1] = 2.5 + Math.random() * 5;
    burstVel[i * 3 + 2] = (Math.random() - 0.5) * 7;
    done++;
  }
}

// ---------- state ----------
let phase = 'garden';        // garden | launch | vortex | dive | heart | card
let phaseT = 0;
let charge = 0, charging = false;
let coreTaps = 0, corePulseT = 0;
let heartReadyAt = 0, letterRead = false;
let camYaw = 0, camPitch = 0, yawT = 0, pitchT = 0;
let orbitA = 0.6, orbitAT = 0.6;
let heartDragYaw = 0, heartDragYawT = 0;
let flight = null;
let startedMusic = false, musicVol = 0;
const pointer = { down: false, x: 0, y: 0, sx: 0, sy: 0, t: 0, vx: 0, vy: 0, px: 0, py: 0, moved: 0 };

const musicEl = music;
function startMusic() { if (startedMusic) return; startedMusic = true; musicEl.volume = 0; musicEl.play().catch(() => {}); }
function playSnd(a) { try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {} }

let lineTimer = null;
function showLine(text, holdMs) {
  lineEl.textContent = text;
  lineEl.classList.remove('hidden');
  requestAnimationFrame(() => lineEl.classList.add('show'));
  clearTimeout(lineTimer);
  lineTimer = setTimeout(() => {
    lineEl.classList.remove('show');
    setTimeout(() => lineEl.classList.add('hidden'), 1300);
  }, holdMs || 4200);
}

// ---------- flights: the hard transitions ----------
function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function flyTo(toPos, toLook, dur, done) {
  flight = {
    t: 0, dur,
    fromPos: camera.position.clone(), toPos,
    fromLook: currentLook.clone(), toLook,
    fromFov: camera.fov, done,
  };
}
const currentLook = new THREE.Vector3(0, 2.2, 0);
let launchHintShown = false;

function startLaunch() {
  phase = 'launch'; phaseT = 0;
  petalMode = 'storm';
  titleCard.classList.add('gone');
  playSnd(shimmer);
  flyTo(new THREE.Vector3(0, VY - 2.5, 24), new THREE.Vector3(0, VY - 0.5, 0), 3.4, () => {
    phase = 'vortex'; phaseT = 0;
    petalMode = 'vortex';
    orbitA = orbitAT = Math.atan2(camera.position.z, camera.position.x);
    showLine('Kéo để bay quanh lốc hoa — chạm vào tâm lốc 3 lần', 5200);
  });
}
function startDive() {
  phase = 'dive'; phaseT = 0;
  petalMode = 'tunnel';
  playSnd(unlockSnd);
  flyTo(new THREE.Vector3(0, HY + 1.5, 17.5), new THREE.Vector3(0, HY, 0), 3.6, () => {
    phase = 'heart'; phaseT = 0;
    petalMode = 'heart';
    heartReadyAt = performance.now();
    showLine(letterRead ? 'Rê tay qua mưa hoa…' : 'Chạm vào trái tim nhé', 5200);
    if (!letterRead) setTimeout(() => replayBtn.classList.remove('hidden'), 3000);
  });
}

// ---------- the letter card ----------
let cardOpen = false;
function showCard() {
  if (cardOpen) return;
  cardOpen = true;
  letterRead = true;
  playSnd(chime);
  cardWrap.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => cardWrap.classList.add('show')));
}
function hideCard() {
  cardWrap.classList.remove('show');
  setTimeout(() => { cardWrap.classList.add('hidden'); cardOpen = false; }, 480);
}
document.getElementById('cardClose').addEventListener('click', hideCard);
cardWrap.addEventListener('click', (e) => { if (e.target === cardWrap) hideCard(); });
replayBtn.addEventListener('click', () => location.reload());

// ---------- input ----------
const stage = document.getElementById('stage');
function screenToWorld(cx, cy, depth) {
  const v = new THREE.Vector3((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, 0.5);
  v.unproject(camera);
  const dir = v.sub(camera.position).normalize();
  return camera.position.clone().add(dir.multiplyScalar(depth));
}
stage.addEventListener('pointerdown', (e) => {
  if (cardOpen) return;
  startMusic();
  pointer.down = true; pointer.x = pointer.sx = pointer.px = e.clientX;
  pointer.y = pointer.sy = pointer.py = e.clientY;
  pointer.t = performance.now(); pointer.vx = pointer.vy = 0; pointer.moved = 0;
  if (phase === 'garden') charging = true;
});
window.addEventListener('pointermove', (e) => {
  if (!pointer.down) return;
  const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
  pointer.moved += Math.abs(dx) + Math.abs(dy);
  pointer.vx = dx * 60 / Math.max(1, performance.now() - pointer.t + 16);
  pointer.vy = dy * 60 / Math.max(1, performance.now() - pointer.t + 16);
  pointer.x = e.clientX; pointer.y = e.clientY;
  if (flight) return;
  if (phase === 'garden') { yawT -= dx * 0.0032; pitchT -= dy * 0.0022; charging = false; }
  else if (phase === 'vortex') { orbitAT -= dx * 0.005; }
  else if (phase === 'heart') { heartDragYawT += dx * 0.006; }
});
window.addEventListener('pointerup', (e) => {
  if (!pointer.down) return;
  pointer.down = false;
  const dtMs = performance.now() - pointer.t;
  const dist = Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy);
  const wasTap = dtMs < 280 && dist < 14;
  const swipeUp = pointer.vy < -55 && dist > 40;
  if (phase === 'garden') {
    if (wasTap) {
      const w = screenToWorld(e.clientX, e.clientY, 13);
      burstAt(w.x, Math.max(0.7, w.y), w.z, 70);
      if (!launchHintShown) { launchHintShown = true; showLine('Đúng rồi — giờ nhấn giữ, rồi vuốt lên để bay', 4400); }
    } else if ((charge > 0.55 || swipeUp) && !flight) {
      startLaunch();
    }
    charging = false; charge = 0;
  } else if (phase === 'vortex' && wasTap && !flight) {
    const dc = Math.hypot(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2);
    if (dc < window.innerWidth * 0.34) {
      coreTaps++;
      corePulseT = 1;
      vortexPulse = 1;
      burstAt(0, VY, 0, 50);
      playSnd(shimmer);
      if (coreTaps >= 3) { startDive(); }
      else showLine(`Tâm lốc sáng lên… (${coreTaps}/3)`, 2600);
    }
  } else if (phase === 'heart' && wasTap && !flight) {
    const dc = Math.hypot(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight * 0.44);
    if (dc < window.innerWidth * 0.4 && performance.now() - heartReadyAt > 700) showCard();
  }
});
window.addEventListener('pointercancel', () => { pointer.down = false; charging = false; });
document.addEventListener('contextmenu', (e) => e.preventDefault());

// ---------- heartbeat ----------
function heartbeatPulse(now) {
  const period = 1.15;
  const t = (now % period) / period;
  return Math.exp(-Math.pow((t - 0.10) * 9, 2)) + 0.7 * Math.exp(-Math.pow((t - 0.30) * 9, 2));
}

// ---------- update ----------
function update(dt, now) {
  phaseT += dt;
  musicVol += ((startedMusic ? 0.66 : 0) - musicVol) * Math.min(1, dt * 1.6);
  if (startedMusic) musicEl.volume = Math.max(0, Math.min(1, musicVol));
  vortexPulse = Math.max(0, vortexPulse - dt * 1.4);
  corePulseT = Math.max(0, corePulseT - dt);

  // garden charge: holding gathers the petals toward her hand
  if (phase === 'garden' && charging && !flight) {
    charge = Math.min(1, charge + dt / 0.85);
  } else if (phase !== 'garden') charge = 0;

  // ---- camera ----
  if (flight) {
    flight.t += dt;
    const k = easeInOut(Math.min(1, flight.t / flight.dur));
    camera.position.lerpVectors(flight.fromPos, flight.toPos, k);
    currentLook.lerpVectors(flight.fromLook, flight.toLook, k);
    const punch = Math.sin(Math.min(1, flight.t / flight.dur) * Math.PI);
    camera.fov = flight.fromFov + punch * 17 * (flight.toPos.y > flight.fromPos.y ? 1 : 0.8);
    camera.updateProjectionMatrix();
    camera.lookAt(currentLook);
    if (flight.t >= flight.dur) { const d = flight.done; flight = null; camera.fov = 55; camera.updateProjectionMatrix(); if (d) d(); }
  } else if (phase === 'garden') {
    yawT = Math.max(-0.62, Math.min(0.62, yawT));
    pitchT = Math.max(-0.2, Math.min(0.34, pitchT));
    camYaw += (yawT - camYaw) * Math.min(1, dt * 6);
    camPitch += (pitchT - camPitch) * Math.min(1, dt * 6);
    camera.position.set(Math.sin(now * 0.24) * 0.5, 4.2 + Math.sin(now * 0.4) * 0.22 + charge * 0.7, 16.5);
    currentLook.set(Math.sin(camYaw) * 8, 2.4 + camPitch * 6, -Math.cos(camYaw) * 8 + 6);
    camera.lookAt(currentLook);
    camera.fov = 55 + charge * 5; camera.updateProjectionMatrix();
  } else if (phase === 'vortex') {
    orbitA += (orbitAT - orbitA) * Math.min(1, dt * 5);
    orbitAT += dt * 0.045;   // slow drift when idle
    const r = 24;
    camera.position.set(Math.cos(orbitA) * r, VY - 2.5 + Math.sin(now * 0.3) * 0.7, Math.sin(orbitA) * r);
    currentLook.set(0, VY - 0.5, 0);
    camera.lookAt(currentLook);
  } else if (phase === 'heart' || phase === 'card') {
    heartDragYaw += (heartDragYawT - heartDragYaw) * Math.min(1, dt * 5);
    camera.position.set(Math.sin(heartDragYaw) * 3.2, HY + 1.5 + Math.sin(now * 0.33) * 0.3, 17.5 - Math.abs(Math.sin(heartDragYaw)) * 1.2);
    currentLook.set(0, HY, 0);
    camera.lookAt(currentLook);
  }

  // ---- world life ----
  for (const g of rings) g.rotation.y += g.userData.speed * dt * (1 + vortexPulse * 2.2);
  for (const c of clouds) c.position.y += Math.sin(now * 0.24 + c.userData.ph) * 0.0035;
  const pulse = heartbeatPulse(now);
  const hScale = 1 + 0.045 * pulse;
  heartGroup.scale.set(hScale, hScale, hScale);
  heartGroup.rotation.y = Math.sin(now * 0.16) * 0.38 + heartDragYaw * 0.7;
  heartGroup.position.y = HY + Math.sin(now * 0.5) * 0.24;
  if (heartGroup.userData.glow) heartGroup.userData.glow.material.opacity = 0.65 + 0.3 * pulse;

  for (const g of rings) for (const m of g.children) if (m.isInstancedMesh) faceInstances(m, g.position, g.rotation.y);
  for (const m of heartGroup.children) if (m.isInstancedMesh) faceInstances(m, heartGroup.position, heartGroup.rotation.y);

  // ---- petals ----
  const lerpK = petalMode === 'tunnel' ? Math.min(1, dt * 7) : petalMode === 'storm' ? Math.min(1, dt * 3.2) : Math.min(1, dt * 2.1);
  const gatherX = 0, gatherY = 3.6, gatherZ = 10;
  for (let i = 0; i < PN; i++) {
    const ix = i * 3;
    if (burstLife[i] > 0) {
      burstLife[i] -= dt;
      burstVel[ix + 1] -= 2.2 * dt;
      pPos[ix] += burstVel[ix] * dt;
      pPos[ix + 1] += burstVel[ix + 1] * dt;
      pPos[ix + 2] += burstVel[ix + 2] * dt;
      continue;
    }
    petalTarget(i, seeds[i], now, _t);
    let tx = _t.x, ty = _t.y, tz = _t.z;
    if (phase === 'garden' && charge > 0.03 && petalMode === 'drift') {
      // while she holds, the drift bends toward the gathering point in front of her
      const d = Math.hypot(pPos[ix] - gatherX, pPos[ix + 1] - gatherY, pPos[ix + 2] - gatherZ);
      if (d < 15) { const f = charge * (1 - d / 15) * 0.75; tx += (gatherX - tx) * f; ty += (gatherY - ty) * f; tz += (gatherZ - tz) * f; }
    }
    pPos[ix] += (tx - pPos[ix]) * lerpK;
    pPos[ix + 1] += (ty - pPos[ix + 1]) * lerpK;
    pPos[ix + 2] += (tz - pPos[ix + 2]) * lerpK;
  }
  pGeo.attributes.position.needsUpdate = true;
}

// ---------- main loop ----------
let frozen = false;
window.__freeze = (v) => { frozen = v; };
let last = performance.now();
let hinted = false;
function frame(ts) {
  const now = ts / 1000;
  let dt = Math.min(0.033, (ts - last) / 1000); last = ts;
  if (!hinted && ts > 1200) { hinted = true; showLine('Kéo để ngắm vườn — chạm vào một bông hoa', 4600); }
  if (!frozen) update(dt, now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// hooks for automated visual verification
window.__sky = {
  phase: () => phase,
  charge: () => charge,
  holdStart: () => { charging = true; startMusic(); },
  holdEnd: (launch) => { charging = false; if (launch) { charge = 1; startLaunch(); } },
  tapCore: () => {
    if (phase !== 'vortex') return;
    coreTaps++; corePulseT = 1; vortexPulse = 1; burstAt(0, VY, 0, 50);
    if (coreTaps >= 3) startDive();
  },
  tapHeart: () => { if (phase === 'heart') showCard(); },
  tapGarden: () => burstAt(0, 2, 6, 70),
  cardVisible: () => cardOpen,
  closeCard: () => hideCard(),
  camY: () => camera.position.y,
  musicPlaying: () => startedMusic && !musicEl.paused && musicEl.currentTime > 0,
  debug: () => ({ scene, camera, renderer, composer }),
  texState: () => {
    const out = [];
    scene.traverse((o) => {
      if (o.material && o.material.map) out.push({ type: o.type, hasImg: !!o.material.map.image, w: o.material.map.image ? o.material.map.image.width : 0 });
    });
    return out.slice(0, 12);
  },
};
