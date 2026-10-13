import * as THREE from 'three';
import { getMaterial } from './materials.js';

export function makeBox(w,h,d,matName='oak',name='panel'){
  const g = new THREE.BoxGeometry(w,h,d);
  const m = getMaterial(matName).clone();
  const mesh = new THREE.Mesh(g,m);
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.userData = { kind:name, matName, dims:{w,h,d} };
  return mesh;
}
export function makePanel(w,h,d,matName='oak'){ return makeBox(w,h,d,matName,'panel'); }

export function makeHandle(len, r, matName='alu'){
  const grp = new THREE.Group();
  const m = getMaterial(matName);
  const bar = new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,16), m);
  bar.rotation.z = Math.PI/2; bar.castShadow = true;
  grp.add(bar);
  const cap1 = new THREE.Mesh(new THREE.SphereGeometry(r*1.05,12,12), m);
  cap1.position.x = -len/2;
  const cap2 = cap1.clone(); cap2.position.x = len/2;
  grp.add(cap1,cap2);
  grp.userData = { kind:'handle' };
  return grp;
}

export function makeDoor(w,h,t,matName='oak',opts={}){
  const grp = new THREE.Group();
  grp.userData = { kind:'door', open:0, maxOpen: opts.maxOpen ?? Math.PI/1.7, thickness:t };
  const leaf = makeBox(w,h,t,matName,'doorLeaf');
  leaf.position.set(w/2,0,0);
  grp.add(leaf);
  const handle = makeHandle(0.10,0.028,'alu');
  handle.position.set(w*0.86, 0, t/2 + 0.02);
  grp.add(handle);
  return grp;
}

export function makeDrawer(w,h,d,matName='oak'){
  const grp = new THREE.Group();
  grp.userData = { kind:'drawer', open:0, maxOpen: d*0.9 };
  const t = 0.018;
  const front = makeBox(w,h,t,matName,'drawerFront');
  front.position.set(0,0,d/2);
  grp.add(front);
  const sideL = makeBox(t,h*0.75,d*0.85,matName);
  sideL.position.set(-w/2+t/2, -h*0.1, d/2 - d*0.42);
  const sideR = sideL.clone(); sideR.position.x = w/2 - t/2;
  const bottom = makeBox(w-t*2, t, d*0.85, matName);
  bottom.position.set(0, -h*0.45, d/2 - d*0.42);
  const back = makeBox(w, h*0.75, t, matName);
  back.position.set(0, -h*0.1, d*0.075);
  grp.add(sideL, sideR, bottom, back);
  const handle = makeHandle(w*0.5, 0.028,'alu');
  handle.position.set(0,0,d/2 + t/2 + 0.02);
  grp.add(handle);
  return grp;
}

export function makeShelf(w,d,matName='oak'){
  return makeBox(w,0.018,d,matName,'shelf');
}
