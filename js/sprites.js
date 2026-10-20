"use strict";
/* ============ SPRITES — bộ sticker AI kawaii pastel (PNG nền trong suốt) ============ */
const INK = "#5D4037";
const SPR_DIR = "assets/sprites/";
const sprImg = (n, style)=>`<img src="${SPR_DIR}${n}.png" alt="" draggable="false"${style?` style="${style}"`:""}>`;
const SPR = {
  bud:       ()=>sprImg("bud"),
  bloom1:    ()=>sprImg("bloom1"),
  bloom2:    ()=>sprImg("bloom2"),
  bloomX:    ()=>sprImg("bloomX"),
  bloomXX:   ()=>sprImg("bloomXX"),
  wilt:      ()=>sprImg("wilt"),
  rose:      ()=>sprImg("rose"),
  goldflower:()=>sprImg("goldflower"),
  daisy:     ()=>sprImg("daisy"),
  tulip:     ()=>sprImg("tulip"),
  butterfly: ()=>sprImg("butterfly"),
  bee:       ()=>sprImg("bee"),
  heart:     ()=>sprImg("heart"),
  leaf:      ()=>sprImg("leaf"),
  drop:      ()=>sprImg("drop"),
  star:      ()=>sprImg("star"),
  candy:     ()=>sprImg("candy"),
  bell:      ()=>sprImg("bell"),
  bow:       ()=>sprImg("bow"),
  sun:       ()=>sprImg("sun"),
  shroom:    ()=>sprImg("shroom"),
  shell:     ()=>sprImg("shell"),
  vase:      ()=>sprImg("vase"),
  sparkle:   ()=>sprImg("sparkle"),
  butterflyFly:()=>sprImg("butterfly_fly"),
  beeFly:    ()=>sprImg("bee_fly"),
  check: ()=>`<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="11" fill="#81C784"/><path d="M7 12.5 L10.5 16 L17 8.5" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
const PAIR_ICONS = ["rose","daisy","tulip","butterfly","bee","heart","leaf","drop","star","candy","bell","bow","sun","shroom","shell"];
const FLOWER_LEVELS = ["bud","bloom1","bloom2","bloomX","bloomXX"];
const FLOWER_NAMES = ["Nụ hoa","Chớm nở","Nở rộ","Rực rỡ","Hoa Sinh Nhật"];
