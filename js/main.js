import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDERS, LABELS } from './models.js';
import { Gizmo } from './gizmo.js';
import { getMaterial } from './materials.js';

const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1116);
scene.fog = new THREE.Fog(0x0e1116, 10, 30);

const camera = new THREE.PerspectiveCamera(50, innerWidth/innerHeight, 0.05, 200);
camera.position.set(2.2, 1.8, 2.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 15;
controls.maxPolarAngle = Math.PI/2 - 0.02;
controls.target.set(0, 0.9, 0);
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(3,5,4); key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-4; key.shadow.camera.right=4;
key.shadow.camera.top=4; key.shadow.camera.bottom=-4;
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
fill.position.set(-4,2,-3); scene.add(fill);

const grid = new THREE.GridHelper(20, 40, 0x2b3240, 0x1c2330);
grid.position.y = 0.001; scene.add(grid);

const productRoot = new THREE.Group();
scene.add(productRoot);

const gizmo = new Gizmo(scene, camera, renderer.domElement, ()=>{});

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let selected = null;

/* FIX3-dbl */
let _lastTap = 0, _lastX = 0, _lastY = 0;
renderer.domElement.addEventListener('pointerdown', e => {
  const now = Date.now();
  const t = e.touches ? e.touches[0] : e;
  const dist = Math.hypot(t.clientX - _lastX, t.clientY - _lastY);
  if (now - _lastTap < 320 && dist < 30) {
    // ضغطتان سريعتان → اختيار العنصر تحت الإصبع + فتح اللوحة
    _lastTap = 0;
    if (gizmo.isDragging()) return;
    setTimeout(() => {
      pick(t.clientX, t.clientY);
      if (selected) { sideEl.classList.add("open"); }
    }, 10);
    return;
  }
  _lastTap = now; _lastX = t.clientX; _lastY = t.clientY;
}, { passive:true });

renderer.domElement.addEventListener('pointerdown', e => {
  if(gizmo.isDragging()) return;
  const startX = e.clientX, startY = e.clientY;
  const up = ev => {
    window.removeEventListener('pointerup', up);
    const dx = ev.clientX - startX, dy = ev.clientY - startY;
    if(dx*dx + dy*dy > 100) return;
    pick(ev.clientX, ev.clientY);
  };
  window.addEventListener('pointerup', up);
});

function pick(x,y){
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x = ((x - r.left)/r.width)*2 - 1;
  pointer.y = -((y - r.top)/r.height)*2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(productRoot, true)
    .filter(h => h.object.userData.kind !== 'handle');
  if(!hits.length){ select(null); return; }
  let obj = hits[0].object;
  while(obj.parent && obj.parent !== productRoot && !obj.userData.kind) obj = obj.parent;
  if(!obj.userData.kind) obj = hits[0].object;
  select(obj);
}

/* FIX3 */ function closeSide(){ sideEl.classList.remove("open"); }

function select(obj){
  selected = obj;
  gizmo.attach(obj);
  renderProps(obj);
  if(!obj) closeSide();
}

let mode = 'gallery';
const galleryEl = document.getElementById('gallery');
const dockEl = document.getElementById('dock');
const pvbarEl = document.getElementById('pvbar');
const sideEl = document.getElementById('side');

document.querySelectorAll('.modes button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('.modes button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    setMode(b.dataset.mode);
  };
});

function setMode(m){
  mode = m;
  galleryEl.classList.toggle('hide', m!=='gallery');
  dockEl.classList.toggle('hide', m!=='editor');
  pvbarEl.classList.toggle('hide', m!=='preview');
  sideEl.classList.remove('open');
  if(m==='gallery') renderGallery();
  if(m==='preview') renderPreviewBar();
  if(m==='editor') select(null);
}

const saved = JSON.parse(localStorage.getItem('najjar_products') || '[]');
const products = saved.length ? saved : seedProducts();

function seedProducts(){
  return [
    { id:uid(), name:'خزانة ملابس', type:'wardrobe', mat:'oak',
      params:{w:1.2,h:2.0,d:0.6,doors:2,drawers:2,shelves:3,mat:'oak'} },
    { id:uid(), name:'مطبخ سفلي', type:'kitchen', mat:'white',
      params:{w:1.0,h:0.9,d:0.6,drawers:3,mat:'white'} },
    { id:uid(), name:'رفوف', type:'shelf', mat:'walnut',
      params:{w:0.9,h:1.8,d:0.35,shelves:4,mat:'walnut'} },
    { id:uid(), name:'طاولة', type:'table', mat:'oak',
      params:{w:1.2,h:0.75,d:0.7,mat:'oak'} },
    { id:uid(), name:'باب خشب', type:'doorUnit', mat:'walnut',
      params:{w:0.9,h:2.1,mat:'walnut'} },
    { id:uid(), name:'نافذة ألمنيوم', type:'window', mat:'alu',
      params:{w:1.2,h:1.0,mat:'alu'} },
  ];
}
function uid(){ return 'p'+Math.random().toString(36).slice(2,9); }

let activeThumbRenderers = [];
function renderGallery(){
  activeThumbRenderers.forEach(r=>{
    try{ r.dispose(); r.forceContextLoss(); r.domElement.remove(); }catch(e){}
  });
  activeThumbRenderers = [];
  galleryEl.innerHTML = '';
  products.forEach(p => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `
      <div class="thumb"></div>
      <div class="meta">
        <div class="name">${p.name}</div>
        <div class="sub">${LABELS[p.type] || p.type}</div>
      </div>
      <div class="actions">
        <button class="go">معاينة</button>
        <button class="ed">تعديل</button>
      </div>`;
    el.querySelector('.go').onclick = ()=> openProduct(p, 'preview');
    el.querySelector('.ed').onclick = ()=> openProduct(p, 'editor');
    galleryEl.appendChild(el);
    const thumb = el.querySelector('.thumb');
    setTimeout(()=>renderThumb(thumb, p), 40);
  });
}

function renderThumb(container, p){
  const w = container.clientWidth || 200, h = 110;
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  r.setSize(w, h); r.setPixelRatio(1);
  container.appendChild(r.domElement);
  activeThumbRenderers.push(r);
  const sc = new THREE.Scene();
  sc.add(new THREE.HemisphereLight(0xffffff, 0x333344, 1.0));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2);
  dl.position.set(2,3,2); sc.add(dl);
  const prod = BUILDERS[p.type](p.params);
  sc.add(prod);
  const box = new THREE.Box3().setFromObject(prod);
  const size = box.getSize(new THREE.Vector3()).length();
  const center = box.getCenter(new THREE.Vector3());
  const c = new THREE.PerspectiveCamera(45, w/h, 0.1, 100);
  let t = Math.random()*Math.PI*2;
  (function loop(){
    if(!container.isConnected) return;
    t += 0.006;
    c.position.set(center.x+Math.cos(t)*size*0.9, center.y+size*0.55, center.z+Math.sin(t)*size*1.05);
    c.lookAt(center);
    r.render(sc, c);
    requestAnimationFrame(loop);
  })();
}

let activeProduct = null;

function openProduct(p, view){
  activeProduct = p;
  while(productRoot.children.length){
    const c = productRoot.children[0];
    productRoot.remove(c);
  }
  const model = BUILDERS[p.type](p.params);
  model.userData.product = p;
  productRoot.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const dist = Math.max(size.x, size.y, size.z) * 1.9;
  camera.position.set(dist, center.y + size.y*0.35, dist);
  controls.target.copy(center);
  controls.update();
  document.querySelector(`.modes button[data-mode="${view}"]`)?.click();
}

function renderPreviewBar(){
  pvbarEl.innerHTML = '';
  const parts = [];
  productRoot.traverse(o=>{
    if(o.userData.kind === 'door' || o.userData.kind === 'drawer') parts.push(o);
  });
  if(!parts.length){
    pvbarEl.innerHTML = '<button disabled>لا توجد أبواب أو أدراج</button>';
    return;
  }
  parts.forEach((part, i) => {
    const btn = document.createElement('button');
    btn.textContent = part.userData.kind === 'door' ? `🚪 باب ${i+1}` : `🗄️ درج ${i+1}`;
    btn.onclick = ()=>{
      const u = part.userData;
      u.open = u.open ? 0 : 1;
      btn.classList.toggle('on', !!u.open);
    };
    pvbarEl.appendChild(btn);
  });
}

function animateParts(dt){
  productRoot.traverse(o=>{
    const u = o.userData;
    if(u.kind === 'door'){
      const target = u.open ? u.maxOpen : 0;
      const sign = u.side === 'right' ? -1 : 1;
      o.rotation.y += ((target*sign) - o.rotation.y) * Math.min(1, dt*6);
    } else if(u.kind === 'drawer'){
      const target = u.open ? u.maxOpen : 0;
      o.position.z += (target - o.position.z) * Math.min(1, dt*6);
    }
  });
}

function toggleDD(el){
  document.querySelectorAll('.dd').forEach(d=>{ if(d!==el) d.classList.remove('open'); });
  el.classList.toggle('open');
}
document.querySelectorAll('.fbtn').forEach(b=>{
  const dd = b.querySelector('.dd');
  if(dd) b.onclick = e => { e.stopPropagation(); toggleDD(dd); };
});
window.addEventListener('click', ()=> document.querySelectorAll('.dd').forEach(d=>d.classList.remove('open')));

document.querySelectorAll('#ddAdd .row').forEach(r=>{
  r.onclick = ()=>{
    const type = r.dataset.add;
    const p = { id:uid(), name:LABELS[type], type, mat:'oak', params:defaultParams(type) };
    products.push(p);
    persist();
    openProduct(p, 'editor');
    toast('تمت الإضافة: '+p.name);
  };
});

function defaultParams(type){
  switch(type){
    case 'wardrobe': return {w:1.2,h:2.0,d:0.6,doors:2,drawers:1,shelves:3,mat:'oak'};
    case 'kitchen':  return {w:1.0,h:0.9,d:0.6,drawers:3,mat:'white'};
    case 'shelf':    return {w:0.9,h:1.8,d:0.35,shelves:4,mat:'oak'};
    case 'table':    return {w:1.2,h:0.75,d:0.7,mat:'oak'};
    case 'doorUnit': return {w:0.9,h:2.1,mat:'walnut'};
    case 'window':   return {w:1.2,h:1.0,mat:'alu'};
  }
}

document.querySelectorAll('#ddColor .row').forEach(r=>{
  r.onclick = ()=>{
    const name = r.dataset.color;
    if(!selected) return toast('حدد عنصرًا أولًا');
    applyMaterialTo(selected, name);
    if(activeProduct){ activeProduct.mat = name; activeProduct.params.mat = name; persist(); }
    toast('تم تغيير اللون');
  };
});

function applyMaterialTo(obj, name){
  obj.traverse(o=>{
    if(o.isMesh && o.material && o.material.isMeshStandardMaterial){
      o.material = getMaterial(name).clone();
    }
  });
}

document.querySelectorAll('#ddTools .row').forEach(r=>{
  r.onclick = ()=>{
    const t = r.dataset.tool;
    if(t === 'del' && selected){ selected.remove(); select(null); toast('تم الحذف'); }
    if(t === 'dup' && selected){
      const c = selected.clone(true);
      c.position.x += 0.15;
      selected.parent.add(c);
      select(c);
      toast('تم التكرار');
    }
    if(t === 'rot'){ gizmo.setMode('rotate'); toast('وضع الدوران'); }
    if(t === 'trn'){ gizmo.setMode('translate'); toast('وضع التحريك'); }
  };
});

const propsEl = document.getElementById('props');
document.getElementById('btnProps').onclick = ()=> sideEl.classList.toggle('open');
document.getElementById('closeSide').onclick = ()=> sideEl.classList.remove('open');
document.getElementById('delSel').onclick = ()=>{ if(selected){ selected.remove(); select(null);} };

function renderProps(obj){
  propsEl.innerHTML = '';
  if(!obj){ propsEl.innerHTML = '<p style="color:var(--mut);font-size:12px">لم يتم تحديد أي عنصر.</p>'; return; }
  const u = obj.userData || {};
  addRow('النوع', u.kind || '—');
  addSlider('الموضع X', obj.position.x, -3, 3, v => obj.position.x = v);
  addSlider('الموضع Y', obj.position.y, 0, 3, v => obj.position.y = v);
  addSlider('الموضع Z', obj.position.z, -3, 3, v => obj.position.z = v);
  addSlider('دوران Y', obj.rotation.y, -Math.PI, Math.PI, v => obj.rotation.y = v);
  addSlider('قياس', obj.scale.x, 0.2, 3, v => obj.scale.setScalar(v));
}

function addRow(label, value){
  const d = document.createElement('div');
  d.className = 'prop';
  d.innerHTML = `<label>${label}<span class="val">${value}</span></label>`;
  propsEl.appendChild(d);
}
function addSlider(label, val, min, max, on){
  const d = document.createElement('div');
  d.className = 'prop';
  d.innerHTML = `<label>${label}<span class="val">${(+val).toFixed(2)}</span></label>
                 <input type="range" min="${min}" max="${max}" step="0.01" value="${val}">`;
  const input = d.querySelector('input');
  const v = d.querySelector('.val');
  input.oninput = ()=>{ v.textContent = (+input.value).toFixed(2); on(+input.value); };
  propsEl.appendChild(d);
}

document.getElementById('btnSave').onclick = ()=>{ persist(); toast('تم الحفظ ✓'); };
function persist(){
  try{ localStorage.setItem('najjar_products', JSON.stringify(products)); }catch(e){}
}

let toastT;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(()=>t.classList.remove('show'), 1600);
}

addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  controls.update();
  gizmo.update();
  if(mode === 'preview') animateParts(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

setMode('gallery');
