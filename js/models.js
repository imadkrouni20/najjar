import * as THREE from 'three';
import { makeBox, makeDoor, makeDrawer, makeShelf } from './parts.js';

export function buildWardrobe({w=1.2,h=2.0,d=0.6,doors=2,drawers=0,shelves=3,mat='oak'}={}){
  const g = new THREE.Group();
  g.userData = { type:'wardrobe', params:{w,h,d,doors,drawers,shelves,mat} };
  const t = 0.018;
  const left = makeBox(t,h,d,mat); left.position.set(-w/2+t/2,h/2,0);
  const right = left.clone(); right.position.x = w/2-t/2;
  const top = makeBox(w,t,d,mat); top.position.set(0,h-t/2,0);
  const bot = makeBox(w,t,d,mat); bot.position.set(0,t/2,0);
  const back = makeBox(w,h,t*0.6,mat); back.position.set(0,h/2,-d/2);
  g.add(left,right,top,bot,back);
  const shelfSpace = h - 0.1;
  for(let i=1;i<=shelves;i++){
    const s = makeShelf(w-t*2, d-t*1.5, mat);
    s.position.set(0, 0.05 + (shelfSpace*(i/(shelves+1))), 0.02);
    g.add(s);
  }
  const drawerH = 0.20;
  for(let i=0;i<drawers;i++){
    const dr = makeDrawer(w-t*2, drawerH, d-t, mat);
    dr.position.set(0, 0.05 + drawerH/2 + i*drawerH, 0.01);
    g.add(dr);
  }
  const doorH = h - 0.06 - drawers*drawerH;
  const doorW = (w - t*2)/doors;
  const doorY = 0.03 + drawers*drawerH + doorH/2;
  for(let i=0;i<doors;i++){
    const xLeft = -w/2 + t + i*doorW;
    const dr = makeDoor(doorW - 0.002, doorH, 0.018, mat);
    if(i%2===1){
      dr.position.set(xLeft + doorW, doorY, d/2 - 0.01);
      dr.rotation.y = Math.PI;
      dr.userData.side = 'right';
    } else {
      dr.position.set(xLeft, doorY, d/2 - 0.01);
      dr.userData.side = 'left';
    }
    dr.userData.doorIndex = i;
    g.add(dr);
  }
  return g;
}

export function buildKitchen({w=1.0,h=0.9,d=0.6,drawers=3,mat='white'}={}){
  const g = new THREE.Group();
  g.userData = { type:'kitchen', params:{w,h,d,drawers,mat} };
  const box = buildWardrobe({ w, h, d, doors:0, drawers, shelves:0, mat });
  const ct = makeBox(w+0.02, 0.03, d+0.02, 'alu');
  ct.position.set(0, h+0.015, 0);
  g.add(box, ct);
  return g;
}

export function buildShelf({w=0.9,h=1.8,d=0.35,shelves=4,mat='oak'}={}){
  const g=new THREE.Group();
  g.userData = { type:'shelf', params:{w,h,d,shelves,mat} };
  const t=0.018;
  const left = makeBox(t,h,d,mat); left.position.set(-w/2+t/2,h/2,0);
  const right = left.clone(); right.position.x=w/2-t/2;
  g.add(left,right);
  for(let i=0;i<=shelves+1;i++){
    const s = makeBox(w, t, d, mat);
    s.position.set(0, (h/(shelves+1))*i, 0);
    g.add(s);
  }
  return g;
}

export function buildTable({w=1.2,h=0.75,d=0.7,mat='oak'}={}){
  const g=new THREE.Group();
  g.userData={ type:'table', params:{w,h,d,mat} };
  const top = makeBox(w,0.04,d,mat); top.position.y=h-0.02;
  g.add(top);
  const legG = 0.05, off=0.06;
  [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([sx,sz])=>{
    const leg = makeBox(legG, h-0.04, legG, mat);
    leg.position.set(sx*(w/2-off), (h-0.04)/2, sz*(d/2-off));
    g.add(leg);
  });
  return g;
}

export function buildDoorUnit({w=0.9,h=2.1,mat='walnut'}={}){
  const g=new THREE.Group();
  g.userData={ type:'doorUnit', params:{w,h,mat} };
  const frame = 0.06, t = 0.05;
  const top = makeBox(w, frame, t, mat); top.position.set(0,h-frame/2,0);
  const bot = top.clone(); bot.position.y = frame/2;
  const l = makeBox(frame, h, t, mat); l.position.set(-w/2+frame/2,h/2,0);
  const r = l.clone(); r.position.x=w/2-frame/2;
  g.add(top,bot,l,r);
  const leaf = makeDoor(w-frame*2, h-frame*2, 0.04, mat);
  leaf.position.set(-w/2+frame, frame, 0);
  g.add(leaf);
  return g;
}

export function buildWindow({w=1.2,h=1.0,mat='alu'}={}){
  const g=new THREE.Group();
  g.userData={ type:'window', params:{w,h,mat} };
  const f = 0.05, t = 0.06;
  const top = makeBox(w, f, t, mat); top.position.set(0,h-f/2,0);
  const bot = top.clone(); bot.position.y = f/2;
  const l = makeBox(f, h, t, mat); l.position.set(-w/2+f/2,h/2,0);
  const r = l.clone(); r.position.x=w/2-f/2;
  const mid = makeBox(f*0.6, h, t*0.8, mat); mid.position.set(0,h/2,0);
  const glass = makeBox(w-f*2, h-f*2, 0.012, 'glass');
  glass.position.set(0,h/2,0);
  g.add(top,bot,l,r,mid,glass);
  return g;
}

export const BUILDERS = {
  wardrobe: buildWardrobe, kitchen: buildKitchen, shelf: buildShelf,
  table: buildTable, doorUnit: buildDoorUnit, window: buildWindow
};
export const LABELS = {
  wardrobe:'خزانة ملابس', kitchen:'مطبخ سفلي', shelf:'رفوف',
  table:'طاولة', doorUnit:'باب خشب', window:'نافذة ألمنيوم'
};
