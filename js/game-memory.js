/* ================= GAME 3: TRÍ NHỚ ================= */
let g3 = null;
function initG3(){
  const board = document.getElementById("g3Board");
  board.innerHTML = "";
  const icons = [];
  for(let i=0;i<8;i++){ icons.push(i,i); }
  for(let i=icons.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [icons[i],icons[j]]=[icons[j],icons[i]]; }
  g3 = { icons, open:[], matched:0, moves:18, lock:false, over:false };
  document.getElementById("g3Moves").textContent = g3.moves;
  document.getElementById("g3Pairs").textContent = "0/8";
  icons.forEach((ic,idx)=>{
    const c = document.createElement("div");
    c.className = "cell";
    c.innerHTML = `<div class="tile"><div class="face front">${SPR.bud().replace(/<svg /,'<svg width="34" height="34" ')}</div><div class="face back">${SPR[PAIR_ICONS[ic]]()}</div></div>`;
    c.addEventListener("click", ()=>g3Click(idx));
    board.appendChild(c);
  });
}
function g3Click(idx){
  if(g3.over || g3.lock) return;
  const cell = document.getElementById("g3Board").children[idx];
  const tile = cell.firstChild;
  if(tile.classList.contains("flipped") || cell.classList.contains("matched")) return;
  tile.classList.add("flipped");
  g3.open.push(idx);
  if(g3.open.length===2){
    g3.moves--;
    document.getElementById("g3Moves").textContent = Math.max(0,g3.moves);
    const [a,b] = g3.open;
    g3.open = [];
    if(g3.icons[a]===g3.icons[b]){
      g3.lock = true;
      setTimeout(()=>{
        [a,b].forEach(i=>{
          const cc = document.getElementById("g3Board").children[i];
          cc.classList.add("matched"); cc.firstChild.classList.add("flipped");
        });
        g3.matched++;
        document.getElementById("g3Pairs").textContent = g3.matched+"/8";
        g3.lock = false;
        if(g3.matched===8){
          g3.over = true;
          setTimeout(()=>showWin(2,"Trí nhớ siêu đỉnh! Bạn đã tìm ra cả 8 cặp hoa."), 500);
        }
      }, 450);
    } else {
      g3.lock = true;
      setTimeout(()=>{
        [a,b].forEach(i=>document.getElementById("g3Board").children[i].firstChild.classList.remove("flipped"));
        g3.lock = false;
        if(g3.moves<=0 && !g3.over){
          g3.over = true;
          setTimeout(()=>showLose("Hết lượt rồi! Thử lại nhé?", initG3), 350);
        }
      }, 750);
    }
  }
}
