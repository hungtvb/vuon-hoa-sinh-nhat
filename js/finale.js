/* ================= FINALE ================= */
let fw = null;
function openFinale(){
  show("screen-finale");
  // vườn hoa nở rộ lần lượt quanh lọ hoa
  const garden = document.getElementById("bloomGarden");
  if(garden){
    const kinds = ["rose","bloom2","goldflower","bloomX","daisy","bloom1","tulip"];
    garden.innerHTML = kinds.map((k,i)=>`<span class="bf${i%2? " small":""}" style="animation-delay:${0.18*i}s">${SPR[k]()}</span>`).join("");
  }
  document.getElementById("finaleVase").innerHTML =
    `<div style="width:150px; margin:0 auto">${SPR.vase()}</div>`;
  // petals falling
  const fin = document.getElementById("screen-finale");
  fin.querySelectorAll(".petal").forEach(p=>p.remove());
  const colors = ["#D94F7A","#F06292","#F8BBD0","#9C1C4C","#FFD6E0"];
  for(let i=0;i<26;i++){
    const p = document.createElement("div");
    p.className = "petal";
    const s = 10+Math.random()*10;
    p.style.cssText = `left:${Math.random()*100}%; width:${s}px; height:${s}px; border-radius:60% 0; background:${colors[i%5]}; animation-duration:${5+Math.random()*6}s; animation-delay:${Math.random()*6}s;`;
    fin.appendChild(p);
  }
  startFireworks();
}
function startFireworks(){
  const cv = document.getElementById("fireworks");
  const fin = document.getElementById("screen-finale");
  cv.width = fin.clientWidth; cv.height = fin.clientHeight;
  const ctx = cv.getContext("2d");
  if(fw && fw.raf) cancelAnimationFrame(fw.raf);
  fw = { parts:[], raf:0, last:0 };
  const colors = ["#FF9EBB","#FFE082","#FFCBA4","#CE93D8","#81D4FA"];
  const loop = t=>{
    if(!document.getElementById("screen-finale").classList.contains("active")) return;
    ctx.clearRect(0,0,cv.width,cv.height);
    if(t - fw.last > 900){
      fw.last = t;
      const cx = 40+Math.random()*(cv.width-80), cy = 40+Math.random()*cv.height*0.35;
      const c = colors[Math.floor(Math.random()*colors.length)];
      for(let i=0;i<46;i++){
        const a = Math.PI*2*i/46, sp = 1.5+Math.random()*2.5;
        fw.parts.push({x:cx,y:cy,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,c});
      }
    }
    fw.parts = fw.parts.filter(p=>p.life>0);
    fw.parts.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.vy+=0.03; p.vx*=0.985; p.life-=0.012;
      ctx.globalAlpha = Math.max(0,p.life);
      ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.arc(p.x,p.y,2.6,0,6.29); ctx.fill();
    });
    ctx.globalAlpha = 1;
    fw.raf = requestAnimationFrame(loop);
  };
  fw.raf = requestAnimationFrame(loop);
}
