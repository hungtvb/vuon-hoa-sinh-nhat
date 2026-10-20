/* ================= GAME 4: HỨNG HOA ================= */
let g4 = null;
const CATCH_IMGS = {};
["rose","goldflower","wilt"].forEach(n=>{ const im = new Image(); im.src = SPR_DIR+n+".png"; CATCH_IMGS[n]=im; });
function initG4(){
  const cv = document.getElementById("catchCanvas");
  const ctx = cv.getContext("2d");
  document.getElementById("g4Restart").style.display = "none";
  if(g4 && g4.raf) cancelAnimationFrame(g4.raf);
  if(g4 && g4.timer) clearInterval(g4.timer);
  g4 = { ctx, items:[], score:0, time:45, bx:180, over:false, raf:0, timer:0, last:0 };
  document.getElementById("g4Score").textContent = "0";
  document.getElementById("g4Time").textContent = g4.time;
  const setX = e=>{
    const r = cv.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    g4.bx = Math.max(40, Math.min(320, x * (360/r.width)));
  };
  cv.onpointerdown = setX; cv.onpointermove = e=>{ if(e.buttons||e.pointerType==="touch") setX(e); };
  cv.ontouchmove = e=>{ setX(e); e.preventDefault(); };
  g4.timer = setInterval(()=>{
    if(g4.over) return;
    g4.time--;
    document.getElementById("g4Time").textContent = Math.max(0,g4.time);
    if(g4.time<=0) g4Finish();
  }, 1000);
  const loop = t=>{
    if(g4.over) return;
    if(!document.getElementById("screen-g4").classList.contains("active")){ g4.over=true; return; }
    if(t - g4.last > 650){
      g4.last = t;
      const r = Math.random();
      const type = r<0.62 ? "rose" : r<0.8 ? "gold" : "wilt";
      g4.items.push({ x: 20+Math.random()*320, y:-20, vy: 1.6+Math.random()*1.4, type, rot: Math.random()*6.28 });
    }
    // update
    g4.items.forEach(it=>{ it.y += it.vy; it.rot += 0.03; });
    // catch
    g4.items = g4.items.filter(it=>{
      if(it.y > 372 && it.y < 410 && Math.abs(it.x - g4.bx) < 46){
        if(it.type==="rose") g4.score += 10;
        else if(it.type==="gold") g4.score += 20;
        else g4.score = Math.max(0, g4.score - 15);
        document.getElementById("g4Score").textContent = g4.score;
        return false;
      }
      return it.y < 460;
    });
    drawG4();
    g4.raf = requestAnimationFrame(loop);
  };
  g4.raf = requestAnimationFrame(loop);
}
function drawG4(){
  const { ctx } = g4;
  ctx.clearRect(0,0,360,440);
  // items
  g4.items.forEach(it=>{
    ctx.save(); ctx.translate(it.x, it.y); ctx.rotate(it.rot);
    const im = CATCH_IMGS[it.type==="gold" ? "goldflower" : it.type];
    if(im && im.complete && im.naturalWidth) ctx.drawImage(im, -22, -22, 44, 44);
    ctx.restore();
  });
  // basket
  const bx = g4.bx;
  ctx.fillStyle = "#C98A5E"; ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx-42, 384); ctx.lineTo(bx+42, 384); ctx.lineTo(bx+30, 424); ctx.lineTo(bx-30, 424);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = "#8D6E63"; ctx.lineWidth = 2;
  for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(bx+i*22-6,386); ctx.lineTo(bx+i*22-4,422); ctx.stroke(); }
}
function g4Finish(){
  g4.over = true;
  clearInterval(g4.timer); cancelAnimationFrame(g4.raf);
  if(g4.score >= 300){
    setTimeout(()=>showWin(3,`Giỏ hoa đầy ắp! Bạn được ${g4.score} điểm.`), 400);
  } else {
    document.getElementById("g4Restart").style.display = "block";
    document.getElementById("g4Restart").onclick = initG4;
  }
}
