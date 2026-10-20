/* ================= GAME 2: NỐI CẶP ================= */
let g2 = null;
const G2R = 5, G2C = 6;
function g2InitBoard(){
  const icons = [];
  for(let i=0;i<15;i++){ icons.push(i,i); }
  for(let i=icons.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [icons[i],icons[j]]=[icons[j],icons[i]]; }
  // padded grid (R+2)x(C+2), null = trống
  const grid = Array.from({length:G2R+2}, ()=>Array(G2C+2).fill(null));
  icons.forEach((ic,k)=>{ grid[1+Math.floor(k/G2C)][1+(k%G2C)] = ic; });
  return grid;
}
// trả về path (mảng {r,c} padded) hoặc null; tối đa 2 khúc ngoặt
function g2Straight(g, a, b){
  if(a.r===b.r){
    const [c1,c2] = a.c<b.c ? [a.c,b.c] : [b.c,a.c];
    for(let c=c1+1;c<c2;c++) if(g[a.r][c]!==null) return null;
    return [a,b];
  }
  if(a.c===b.c){
    const [r1,r2] = a.r<b.r ? [a.r,b.r] : [b.r,a.r];
    for(let r=r1+1;r<r2;r++) if(g[r][a.c]!==null) return null;
    return [a,b];
  }
  return null;
}
function g2OneBend(g, a, b){
  for(const p of [{r:a.r,c:b.c},{r:b.r,c:a.c}]){
    if(g[p.r][p.c]!==null && !(p.r===b.r&&p.c===b.c)) continue;
    if(g2Straight(g,a,p) && g2Straight(g,p,b)) return [a,p,b];
  }
  return null;
}
function g2Path(g, a, b){
  if(a.r===b.r && a.c===b.c) return null;
  let p = g2Straight(g,a,b); if(p) return p;
  p = g2OneBend(g,a,b); if(p) return p;
  for(let r=0;r<G2R+2;r++) for(let c=0;c<G2C+2;c++){
    if(g[r][c]!==null) continue;
    const mid = {r,c};
    const p1 = g2OneBend(g,a,mid);
    if(p1 && g2Straight(g,mid,b)) return [a,mid,b];
  }
  return null;
}
function g2ExistsMove(g){
  const cells = [];
  for(let r=1;r<=G2R;r++) for(let c=1;c<=G2C;c++)
    if(g[r][c]!==null) cells.push({r,c,ic:g[r][c]});
  for(let i=0;i<cells.length;i++) for(let j=i+1;j<cells.length;j++){
    if(cells[i].ic===cells[j].ic && g2Path(g,cells[i],cells[j])) return true;
  }
  return false;
}
function g2Shuffle(g){
  const pos = [], icons = [];
  for(let r=1;r<=G2R;r++) for(let c=1;c<=G2C;c++)
    if(g[r][c]!==null){ pos.push({r,c}); icons.push(g[r][c]); g[r][c]=null; }
  for(let i=icons.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [icons[i],icons[j]]=[icons[j],icons[i]]; }
  pos.forEach((p,i)=> g[p.r][p.c]=icons[i]);
}
function initG2(){
  if(g2 && g2.timer) clearInterval(g2.timer);
  const board = document.getElementById("g2Board");
  board.innerHTML = "";
  let grid = g2InitBoard();
  let guard = 0;
  while(!g2ExistsMove(grid) && guard++<60){ grid = g2InitBoard(); }
  g2 = { grid, sel:null, left:G2R*G2C, time:80, over:false, timer:null };
  document.getElementById("g2Time").textContent = g2.time;
  document.getElementById("g2Left").textContent = g2.left;
  document.getElementById("linkPath").innerHTML = "";
  for(let r=1;r<=G2R;r++) for(let c=1;c<=G2C;c++){
    const d = document.createElement("div");
    d.className = "cell"; d.dataset.r = r; d.dataset.c = c;
    d.innerHTML = SPR[PAIR_ICONS[grid[r][c]]]();
    d.addEventListener("click", ()=>g2Click(r,c));
    board.appendChild(d);
  }
  g2.timer = setInterval(()=>{
    if(g2.over) return;
    g2.time--;
    document.getElementById("g2Time").textContent = Math.max(0,g2.time);
    if(g2.time<=0){
      g2.over = true; clearInterval(g2.timer);
      setTimeout(()=>showLose("Hết giờ rồi! Thử lại nhé?", initG2), 300);
    }
  }, 1000);
}
function g2CellEl(r,c){
  return document.querySelector(`#g2Board .cell[data-r="${r}"][data-c="${c}"]`);
}
function g2Click(r,c){
  if(g2.over || g2.grid[r][c]===null) return;
  const cur = {r,c};
  if(!g2.sel){ g2.sel = cur; g2CellEl(r,c).classList.add("selected"); return; }
  if(g2.sel.r===r && g2.sel.c===c){ g2.sel=null; g2CellEl(r,c).classList.remove("selected"); return; }
  const a = g2.sel, icA = g2.grid[a.r][a.c], icB = g2.grid[r][c];
  g2CellEl(a.r,a.c).classList.remove("selected");
  g2.sel = null;
  if(icA===icB){
    const path = g2Path(g2.grid, a, cur);
    if(path){ g2Link(a, cur, path); return; }
  }
  const el = g2CellEl(r,c);
  el.classList.add("shake"); setTimeout(()=>el.classList.remove("shake"),320);
}
function g2Link(a, b, path){
  const svg = document.getElementById("linkPath");
  const board = document.getElementById("g2Board");
  const bw = board.clientWidth, bh = board.clientHeight;
  const cw = bw / G2C, ch = bh / G2R;
  const padX = cw/2 + 10, padY = ch/2 + 10;
  svg.setAttribute("viewBox", `${-padX} ${-padY} ${bw+padX*2} ${bh+padY*2}`);
  svg.style.left = -padX+"px"; svg.style.top = -padY+"px";
  svg.style.width = (bw+padX*2)+"px"; svg.style.height = (bh+padY*2)+"px";
  const pts = path.map(p=>`${((p.c-0.5)*cw).toFixed(1)},${((p.r-0.5)*ch).toFixed(1)}`).join(" ");
  svg.innerHTML = `<polyline points="${pts}" fill="none" stroke="#FFE082" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
  setTimeout(()=>{
    svg.innerHTML = "";
    g2.grid[a.r][a.c] = null; g2.grid[b.r][b.c] = null;
    [g2CellEl(a.r,a.c), g2CellEl(b.r,b.c)].forEach(el=>{ el.classList.add("empty"); el.innerHTML=""; });
    g2.left -= 2;
    document.getElementById("g2Left").textContent = g2.left;
    if(g2.left===0){
      g2.over = true; clearInterval(g2.timer);
      setTimeout(()=>showWin(1,"Xuất sắc! Bạn đã nối hết 15 cặp biểu tượng."), 400);
      return;
    }
    if(!g2ExistsMove(g2.grid)){
      let guard=0;
      do{ g2Shuffle(g2.grid); guard++; }while(!g2ExistsMove(g2.grid) && guard<60);
      for(let r=1;r<=G2R;r++) for(let c=1;c<=G2C;c++){
        const el = g2CellEl(r,c), ic = g2.grid[r][c];
        if(ic!==null){ el.classList.remove("empty"); el.innerHTML = SPR[PAIR_ICONS[ic]](); }
      }
    }
  }, 380);
}
