import * as THREE from 'three';

export class Gizmo {
  constructor(scene, camera, dom, onChange){
    this.scene=scene; this.camera=camera; this.dom=dom; this.onChange=onChange;
    this.target=null; this.mode='translate'; this.dragging=null;
    this.root = new THREE.Group();
    this.root.renderOrder = 999;
    scene.add(this.root);
    this.root.visible = false;
    this._build();
    this._bind();
  }
  _mat(hex){ return new THREE.MeshBasicMaterial({color:hex,depthTest:false,transparent:true,opacity:.95}); }
  _arrow(dir,color){
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.01,0.01,0.6,10), this._mat(color));
    cyl.position.y = 0.3;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03,0.12,12), this._mat(color));
    tip.position.y = 0.66;
    g.add(cyl,tip);
    if(dir==='x') g.rotation.z = -Math.PI/2;
    if(dir==='z') g.rotation.x = Math.PI/2;
    g.traverse(o=>{ o.userData.axis=dir; o.userData.kind='axis'; });
    return g;
  }
  _ring(axis,color){
    const geo = new THREE.TorusGeometry(0.65,0.012,8,48);
    const mesh = new THREE.Mesh(geo, this._mat(color));
    if(axis==='x') mesh.rotation.y = Math.PI/2;
    if(axis==='y') mesh.rotation.x = Math.PI/2;
    mesh.userData.axis = axis; mesh.userData.kind = 'ring';
    return mesh;
  }
  _center(){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.05,16,16), this._mat(0xffffff));
    s.userData.kind = 'center';
    return s;
  }
  _build(){
    this.gAxisX = this._arrow('x',0xff5566);
    this.gAxisY = this._arrow('y',0x55ff88);
    this.gAxisZ = this._arrow('z',0x5599ff);
    this.gRings = new THREE.Group();
    this.gRings.add(this._ring('x',0xff5566), this._ring('y',0x55ff88), this._ring('z',0x5599ff));
    this.gRings.visible = false;
    this.gCenter = this._center();
    this.root.add(this.gAxisX,this.gAxisY,this.gAxisZ,this.gRings,this.gCenter);
  }
  attach(obj){ this.target=obj; this.root.visible = !!obj; }
  setMode(m){
    this.mode = m;
    const rot = m === 'rotate';
    this.gAxisX.visible = this.gAxisY.visible = this.gAxisZ.visible = !rot;
    this.gRings.visible = rot;
  }
  update(){
    if(!this.target){ this.root.visible=false; return; }
    this.root.visible = true;
    const box = new THREE.Box3().setFromObject(this.target);
    const c = box.getCenter(new THREE.Vector3());
    this.root.position.copy(c);
    const dist = this.camera.position.distanceTo(c);
    this.root.scale.setScalar(dist * 0.22);
  }
  _bind(){
    const p = {x:0,y:0};
    const onDown = e => {
      if(!this.target) return;
      const t = e.touches? e.touches[0] : e;
      p.x = t.clientX; p.y = t.clientY;
      const hit = this._pick(t.clientX, t.clientY);
      if(hit){
        this.dragging = {
          hit, start:{x:p.x,y:p.y},
          startPos:this.target.position.clone(),
          startRot:this.target.rotation.clone()
        };
        this.dom.style.cursor = 'grabbing';
        e.preventDefault(); e.stopPropagation();
      }
    };
    const onMove = e => {
      if(!this.dragging) return;
      const t = e.touches? e.touches[0] : e;
      const dx = t.clientX - this.dragging.start.x;
      const dy = t.clientY - this.dragging.start.y;
      const factor = 0.002 * this.camera.position.distanceTo(this.root.position);
      const axis = this.dragging.hit.userData.axis;
      const kind = this.dragging.hit.userData.kind;
      if(kind==='axis' && this.mode==='translate'){
        const delta = new THREE.Vector3();
        if(axis==='x') delta.x = -dx * factor;
        if(axis==='y') delta.y = dy * factor;
        if(axis==='z') delta.z = -dx * factor;
        this.target.position.copy(this.dragging.startPos).add(delta);
      } else if(kind==='ring' || this.mode==='rotate'){
        const d = (dx + dy) * 0.008;
        if(axis==='x') this.target.rotation.x = this.dragging.startRot.x + d;
        if(axis==='y') this.target.rotation.y = this.dragging.startRot.y + d;
        if(axis==='z') this.target.rotation.z = this.dragging.startRot.z + d;
      }
      this.onChange && this.onChange();
      e.preventDefault(); e.stopPropagation();
    };
    const onUp = () => { this.dragging = null; this.dom.style.cursor=''; };
    this.dom.addEventListener('pointerdown', onDown, {capture:true});
    window.addEventListener('pointermove', onMove, {passive:false});
    window.addEventListener('pointerup', onUp);
  }
  _pick(x, y){
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x-r.left)/r.width)*2-1, -((y-r.top)/r.height)*2+1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    const hits = rc.intersectObjects([this.gAxisX,this.gAxisY,this.gAxisZ,this.gRings], true);
    return hits[0]?.object || null;
  }
  isDragging(){ return !!this.dragging; }
}
