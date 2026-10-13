import * as THREE from 'three';
const cache = new Map();
function woodCanvas(base, dark){
  const c=document.createElement('canvas'); c.width=256; c.height=256;
  const g=c.getContext('2d'); g.fillStyle=base; g.fillRect(0,0,256,256);
  for(let i=0;i<90;i++){
    g.strokeStyle=dark; g.globalAlpha=Math.random()*0.22;
    g.lineWidth=Math.random()*1.8+0.3;
    const y=Math.random()*256; g.beginPath(); g.moveTo(0,y);
    for(let x=0;x<=256;x+=16) g.lineTo(x, y+Math.sin(x*0.05+i)*4);
    g.stroke();
  }
  return c;
}
const PRESETS = {
  oak:    { color:0xC79A63, base:'#c79a63', dark:'#8a5f2e', rough:.65, metal:0 },
  walnut: { color:0x5C3A21, base:'#5c3a21', dark:'#2e1a0d', rough:.7,  metal:0 },
  white:  { color:0xF2F3F5, base:null, rough:.35, metal:0 },
  black:  { color:0x1A1D22, base:null, rough:.6,  metal:0 },
  alu:    { color:0xB8BEC6, base:null, rough:.35, metal:.9 },
  glass:  { color:0x9FD3E0, base:null, rough:.05, metal:0, transparent:true, opacity:.28 }
};
export function getMaterial(name){
  if(cache.has(name)) return cache.get(name);
  const p = PRESETS[name] || PRESETS.oak;
  const params = { color:p.color, roughness:p.rough, metalness:p.metal };
  if(p.transparent){ params.transparent=true; params.opacity=p.opacity; }
  const m = new THREE.MeshStandardMaterial(params);
  if(p.base){
    const tex = new THREE.CanvasTexture(woodCanvas(p.base,p.dark));
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    m.map = tex;
  }
  cache.set(name, m);
  return m;
}
export const MATERIAL_NAMES = Object.keys(PRESETS);
