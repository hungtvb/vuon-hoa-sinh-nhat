/* ================= STATE + NAV ================= */
const S = { won:[false,false,false,false] };
const GAME_META = [
  { name:"Ghép Hoa", desc:"Chạm 2 bông giống nhau để tiến hóa", flower:"bloomX" },
  { name:"Nối Cặp", desc:"Nối 2 icon giống nhau, đường gấp ≤ 2 lần", flower:"rose" },
  { name:"Trí Nhớ", desc:"Lật thẻ tìm 8 cặp hoa", flower:"daisy" },
  { name:"Hứng Hoa", desc:"Kéo giỏ hứng cánh hoa rơi", flower:"tulip" },
];
function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo(0,0);
}
function renderProgress(){
  const el = document.getElementById("menuProgress");
  el.innerHTML = GAME_META.map((g,i)=>
    `<div class="fslot${S.won[i]?" won":""}">${SPR[g.flower]()}</div>`).join("");
}
function renderMenu(){
  renderProgress();
  const grid = document.getElementById("menuGrid");
  grid.innerHTML = GAME_META.map((g,i)=>{
    const wide = (i===0||i===3);
    const body = wide
      ? `${SPR[g.flower]()}
      <div><div class="gname">${g.name}</div>
      <div class="gdesc">${g.desc}</div></div>`
      : `${SPR[g.flower]()}
      <div class="gname">${g.name}</div>
      <div class="gdesc">${g.desc}</div>`;
    return `<div class="game-card${wide?" wide":""}${S.won[i]?" done":""}" data-game="${i}">
      <div class="badge">${SPR.check()}</div>
      ${body}
    </div>`;
  }).join("");
  grid.querySelectorAll(".game-card").forEach(c=>{
    c.addEventListener("click", ()=> startGame(+c.dataset.game));
  });
  let btn = document.getElementById("btnFinale");
  if(!btn){
    btn = document.createElement("button");
    btn.id = "btnFinale"; btn.className = "btn"; btn.style.marginTop = "14px";
    btn.textContent = "Mở món quà cuối";
    document.getElementById("screen-menu").appendChild(btn);
  }
  const n = S.won.filter(Boolean).length;
  btn.disabled = n < 4;
  btn.textContent = n < 4 ? `Hái thêm ${4-n} bông nữa để mở quà` : "Mở món quà cuối";
  btn.onclick = ()=>{ if(S.won.every(Boolean)) openFinale(); };
}
function startGame(i){
  show("screen-g"+(i+1));
  [initG1,initG2,initG3,initG4][i]();
}
function showLose(text, retryFn){
  document.getElementById("loseIcon").innerHTML = SPR.wilt();
  document.getElementById("loseText").textContent = text;
  document.getElementById("loseModal").classList.add("show");
  document.getElementById("btnLoseRetry").onclick = ()=>{
    document.getElementById("loseModal").classList.remove("show");
    retryFn();
  };
  document.getElementById("btnLoseMenu").onclick = ()=>{
    document.getElementById("loseModal").classList.remove("show");
    show("screen-menu"); renderMenu();
  };
}
function showWin(i, text){
  document.getElementById("winFlower").innerHTML = SPR[GAME_META[i].flower]();
  document.getElementById("winText").textContent = text;
  document.getElementById("winModal").classList.add("show");
  document.getElementById("btnWinNext").onclick = ()=>{
    document.getElementById("winModal").classList.remove("show");
    S.won[i] = true;
    show("screen-menu"); renderMenu();
  };
}
document.querySelectorAll("[data-nav]").forEach(b=>
  b.addEventListener("click", ()=>{ show("screen-"+b.dataset.nav); renderMenu(); }));
document.getElementById("btnStart").addEventListener("click", ()=>{
  show("screen-menu"); renderMenu();
  const bgm = document.getElementById("bgm");
  bgm.volume = 0.5;
  bgm.play().catch(()=>{});
});
let musicOn = true;
document.getElementById("btnMusic").addEventListener("click", (e)=>{
  e.stopPropagation();
  const bgm = document.getElementById("bgm");
  musicOn = !musicOn;
  document.getElementById("icoMusicOn").style.display = musicOn ? "" : "none";
  document.getElementById("icoMusicOff").style.display = musicOn ? "none" : "";
  if(musicOn){ bgm.play().catch(()=>{}); } else { bgm.pause(); }
});
document.getElementById("btnReplay").addEventListener("click", ()=>{
  S.won = [false,false,false,false]; show("screen-menu"); renderMenu();
});
// cover decoration
document.getElementById("coverFlowers").innerHTML = SPR.bloom2()+SPR.bloomX()+SPR.bloom1();
// chữ chạy lung linh (marquee) ở cover + finale
(function(){
  const icons = ["rose","sparkle","goldflower","heart"];
  let half = "";
  for(let r=0;r<3;r++) icons.forEach(k=>{ half += `<span class="mq-item">${SPR[k]()}<i class="shimmer-text">Chúc mừng sinh nhật</i></span>`; });
  const html = half + half;
  const mc = document.getElementById("marqueeCover"); if(mc) mc.innerHTML = html;
  const mf = document.getElementById("marqueeFinale"); if(mf) mf.innerHTML = html;
})();
(function(){
  const b = document.createElement("div");
  b.className = "butterfly"; b.style.cssText = "top:11%; left:8%; width:44px";
  b.innerHTML = SPR.butterflyFly();
  const b2 = b.cloneNode(true); b2.style.cssText = "top:18%; right:5%; width:34px; animation-delay:1.2s";
  b2.innerHTML = SPR.beeFly();
  document.getElementById("screen-cover").append(b, b2);
  // cánh hoa rơi trang trí cover
  const cov = document.getElementById("screen-cover");
  const pcols = ["#D94F7A","#F06292","#F8BBD0","#9C1C4C"];
  for(let i=0;i<10;i++){
    const p = document.createElement("div");
    p.className = "petal";
    const s = 9+Math.random()*9;
    p.style.cssText = `left:${Math.random()*100}%; width:${s}px; height:${s}px; border-radius:60% 0; background:${pcols[i%4]}; animation-duration:${6+Math.random()*6}s; animation-delay:${Math.random()*6}s;`;
    cov.appendChild(p);
  }
})();

// sparkles + mây trang trí phong cách Kawaii Pastel Pop
(function decorate(){
  const cov = document.getElementById("screen-cover");
  [[8,14,0],[86,10,1.1],[12,72,2],[90,66,.6],[50,6,1.6]].forEach(([l,t,d],i)=>{
    const sp = document.createElement("div");
    sp.className = "sparkle";
    sp.style.cssText = `left:${l}%; top:${t}%; width:${22+i*4}px; animation-delay:${d}s;`;
    sp.innerHTML = SPR.sparkle();
    cov.appendChild(sp);
  });
  [[4,3,110,34],[60,9,110,34]].forEach(([l,t,w,hh])=>{
    const cl = document.createElement("div");
    cl.className = "cloud";
    cl.style.cssText = `left:${l}%; top:${t}%; width:${w}px; height:${hh}px;`;
    cov.appendChild(cl);
  });

})();
