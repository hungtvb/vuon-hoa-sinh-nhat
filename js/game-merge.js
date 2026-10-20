/* ================= GAME 1: GHÉP HOA ================= */
let g1 = null;
function initG1(){
  const board = document.getElementById("g1Board");
  board.innerHTML = "";
  const items = [];
  for(let i=0;i<16;i++) items.push({lv:0});
  for(let i=0;i<4;i++) items.push({wilt:true});
  for(let i=items.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [items[i],items[j]]=[items[j],items[i]]; }
  if(g1 && g1.timer) clearInterval(g1.timer);
  g1 = { items, sel:null, lives:3, time:60, over:false, timer:0 };
  paintG1Hud();
  g1.timer = setInterval(()=>{
    if(g1.over) return;
    g1.time--;
    document.getElementById("g1Time").textContent = Math.max(0, g1.time);
    if(g1.time <= 0){
      g1.over = true; clearInterval(g1.timer);
      setTimeout(()=>showLose("Hết giờ rồi! Thử lại nhé?", initG1), 400);
    }
  }, 1000);
  items.forEach((it,idx)=>{
    const c = document.createElement("div");
    c.className = "cell"; c.dataset.idx = idx;
    c.innerHTML = it.wilt ? SPR.wilt() : SPR[FLOWER_LEVELS[0]]();
    c.addEventListener("click", ()=>g1Click(idx));
    board.appendChild(c);
  });
}
function g1Cell(i){ return document.getElementById("g1Board").children[i]; }
function g1Click(idx){
  if(g1.over) return;
  const it = g1.items[idx];
  if(!it){ g1.sel = null; paintG1Sel(); return; }
  if(it.wilt){ // chạm lá úa: phạt
    g1LoseLife();
    const c = g1Cell(idx); c.classList.add("shake"); setTimeout(()=>c.classList.remove("shake"),320);
    g1.sel = null; paintG1Sel();
    return g1CheckEnd();
  }
  if(g1.sel === null){ g1.sel = idx; paintG1Sel(); return; }
  if(g1.sel === idx){ g1.sel = null; paintG1Sel(); return; }
  const a = g1.items[g1.sel], b = it;
  if(a.lv === b.lv && a.lv < 4){
    // merge!
    const from = g1Cell(g1.sel), to = g1Cell(idx);
    g1.items[g1.sel] = null;
    g1.items[idx] = { lv: a.lv + 1 };
    from.classList.add("empty"); from.innerHTML = "";
    to.classList.add("clearing");
    setTimeout(()=>{
      to.classList.remove("clearing");
      to.innerHTML = SPR[FLOWER_LEVELS[a.lv+1]]();
      burstPetals(to);
      if(a.lv+1 === 4){ g1.over = true; clearInterval(g1.timer); setTimeout(()=>showWin(0,"Tuyệt vời! Bạn đã ghép ra Hoa Sinh Nhật rực rỡ nhất vườn."), 650); }
    }, 380);
  } else {
    g1LoseLife();
    [g1Cell(g1.sel), g1Cell(idx)].forEach(c=>{ c.classList.add("shake"); setTimeout(()=>c.classList.remove("shake"),320); });
  }
  g1.sel = null; paintG1Sel();
  g1CheckEnd();
}
function paintG1Sel(){
  [...document.getElementById("g1Board").children].forEach((c,i)=>c.classList.toggle("selected", i===g1.sel));
}
function paintG1Hud(){
  document.getElementById("g1Moves").textContent = Math.max(0, g1.lives);
  document.getElementById("g1Time").textContent = Math.max(0, g1.time);
}
function g1LoseLife(){
  if(g1.over) return;
  g1.lives--;
  document.getElementById("g1Moves").textContent = Math.max(0, g1.lives);
  if(g1.lives <= 0){
    g1.over = true; clearInterval(g1.timer);
    setTimeout(()=>showLose("Hết lượt rồi! Thử lại nhé?", initG1), 400);
  }
}
function g1CheckEnd(){ /* thua xử lý ở g1LoseLife + timer */ }
function burstPetals(cell){
  const r = cell.getBoundingClientRect();
  for(let i=0;i<8;i++){
    const p = document.createElement("div");
    const colors = ["#FF9EBB","#FFCBA4","#FFE082","#F48FB1"];
    p.style.cssText = `position:fixed; left:${r.left+r.width/2}px; top:${r.top+r.height/2}px; width:10px; height:10px; border-radius:50% 0; background:${colors[i%4]}; z-index:99; pointer-events:none; transition:all .7s ease-out;`;
    document.body.appendChild(p);
    const ang = Math.PI*2*i/8;
    requestAnimationFrame(()=>{ p.style.transform = `translate(${Math.cos(ang)*46}px, ${Math.sin(ang)*46-20}px) rotate(200deg)`; p.style.opacity = "0"; });
    setTimeout(()=>p.remove(), 750);
  }
}
