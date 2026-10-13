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
    this.setMode('translate');   // ✅ يبدأ دائمًا بالتحريك — الدوائر مخفية
    this._bind();
  }
  _mat(hex){ return new THREE.MeshBasicMaterial({color:hex,depthTest:false,transparent:true,opacity:.95}); }

  _arrow(dir,color){
    const g = new THREE.Group();
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.007,0.007,0.36,10), this._mat(color));
    cyl.position.y = 0.18;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.021,0.09,12), this._mat(color));
    tip.position.y = 0.405;
    g.add(cyl,tip);
    if(dir==='x') g.rotation.z = -Math.PI/2;
    if(dir==='z') g.rotation.x =  Math.PI/2;
    g.traverse(o=>{ o.userData.axis=dir; o.userData.kind='axis'; });
    return g;
  }
  _ring(axis,color){
    const geo = new THREE.TorusGeometry(0.42, 0.009, 8, 48);
    const mesh = new THREE.Mesh(geo, this._mat(color));
    if(axis==='x') mesh.rotation.y = Math.PI/2;
    if(axis==='y') mesh.rotation.x = Math.PI/2;
    mesh.userData.axis = axis; mesh.userData.kind = 'ring';
    return mesh;
  }
  _center(){
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035,16,16), this._mat(0xffffff));
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
    const rot = (m === 'rotate');
    /* ✅ في وضع التحريك: الدوائر مخفية تمامًا */
    this.gAxisX.visible = !rot;
    this.gAxisY.visible = !rot;
    this.gAxisZ.visible = !rot;
    this.gRings.visible = rot;
  }

  update(){
    if(!this.target){ this.root.visible=false; return; }
    this.root.visible = true;
    const box = new THREE.Box3().setFromObject(this.target);
    const c = box.getCenter(new THREE.Vector3());
    this.root.position.copy(c);
    const dist = this.camera.position.distanceTo(c);
    this.root.scale.setScalar(dist * 0.13);   // ✅ أصغر
  }

  _bind(){
    const onDown = e => {
      if(!this.target) return;
      const t = e.touches? e.touches[0] : e;
      const hit = this._pick(t.clientX, t.clientY);
      if(!hit) return;
      const kind = hit.userData.kind;

      /* ✅ منع تفعيل أي وضع غير مسموح */
      if(this.mode === 'translate' && kind !== 'axis') return;
      if(this.mode === 'rotate'    && kind !== 'ring') return;

      this.dragging = {
        hit,
        startX: t.clientX, startY: t.clientY,
        startPos: this.target.position.clone(),
        startRot: this.target.rotation.clone(),
        axisWorldDir: this._axisWorldDir(hit.userData.axis)
      };
      this.dom.style.cursor = 'grabbing';
      e.preventDefault(); e.stopPropagation();
    };

    const onMove = e => {
      if(!this.dragging) return;
      const t = e.touches? e.touches[0] : e;
      const dx = t.clientX - this.dragging.startX;
      const dy = t.clientY - this.dragging.startY;
      const axis = this.dragging.hit.userData.axis;
      const kind = this.dragging.hit.userData.kind;

      /* ✅ التحريك فقط — لا دوران على الإطلاق */
      if(this.mode === 'translate' && kind === 'axis'){
        const worldDir = this.dragging.axisWorldDir.clone();
        const wp = this.root.position.clone();
        const s0 = wp.clone().project(this.camera);
        const s1 = wp.clone().add(worldDir).project(this.camera);
        const rect = this.dom.getBoundingClientRect();
        const ax =  (s1.x - s0.x) * rect.width  / 2;
        const ay = -(s1.y - s0.y) * rect.height / 2;
        const len2 = ax*ax + ay*ay;
        if(len2 < 0.0001) return;
        const proj = (dx * ax + dy * ay) / len2;
        const delta = worldDir.multiplyScalar(proj);
        this.target.position.copy(this.dragging.startPos).add(delta);
      }

      /* ✅ الدوران فقط — لا تحريك على الإطلاق */
      else if(this.mode === 'rotate' && kind === 'ring'){
        const d = (dx + dy) * 0.010;
        if(axis==='x') this.target.rotation.x = this.dragging.startRot.x + d;
        if(axis==='y') this.target.rotation.y = this.dragging.startRot.y - d;
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

  _axisWorldDir(axis){
    const v = new THREE.Vector3(0,0,0);
    if(axis === 'x') v.set(1,0,0);
    if(axis === 'y') v.set(0,1,0);
    if(axis === 'z') v.set(0,0,1);
    return v.applyQuaternion(this.root.quaternion).normalize();
  }

  _pick(x, y){
    const r = this.dom.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x-r.left)/r.width)*2-1, -((y-r.top)/r.height)*2+1);
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    /* ✅ نفحص فقط العناصر الظاهرة حسب الوضع */
    const list = (this.mode === 'rotate')
      ? [this.gRings]
      : [this.gAxisX, this.gAxisY, this.gAxisZ];
    const hits = rc.intersectObjects(list, true);
    return hits[0]?.object || null;
  }
  isDragging(){ return !!this.dragging; }
}
