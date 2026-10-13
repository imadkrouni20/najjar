import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDERS, LABELS } from './models.js';
import { Gizmo } from './gizmo.js';
import { getMaterial } from './materials.js';

/* ============ Renderer ============ */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
renderer.setPixelRatio(Math.min(1.5, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

/* معالجة فقدان السياق (يمنع الشاشة البيضاء) */
renderer.domElement.addEventListener('webglcontextlost', e => {
  e.preventDefault();
  console.warn('WebGL context lost');
}, false);
renderer.domElement.addEventListener('webglcontextrestored', () => {
  console.warn('WebGL context restored');
  renderer.setSize(innerWidth, innerHeight);
}, false);

/* ============ Scene ============ */
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

/* ============ Lights ============ */
scene.add(new THREE.HemisphereLight(0xffffff, 0x223344, 0.85));
const key = new THREE.DirectionalLight(0xffffff, 1.1);
key.position.set(3,5,4); key.castShadow = true;
key.shadow.mapSize.set(1024,1024);
key.shadow.camera.left=-4; key.shadow.camera.right=4;
key.shadow.camera.top=4; key.shadow.camera.bottom=-4;
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
fill.position.set(-4,2,-3); scene.add(fill);

/* ============ Grid ============ */
const grid = new THREE.GridHelper(20, 40, 0x2b3240, 0x1c2330);
grid.position.y = 0.001; scene.add(grid);

/* ============ Product root ============ */
const productRoot = new THREE.Group();
scene.add(productRoot);

/* ============ Gizmo ============ */
const gizmo = new Gizmo(scene, camera, renderer.domElement, ()=>{});

/* ============ DOM ============ */
const galleryEl = document.getElementById('gallery');
const dockEl = document.getElementById('dock');
const pvbarEl = document.getElementById('pvbar');
const sideEl = document.getElementById('side');
const propsEl = document.getElementById('props');

/* ============ State ============ */
const saved = JSON.parse(localStorage.getItem('najjar_products') || '[]');
const products = saved.length ? saved : seedProducts();
let activeProduct = null;
let selected = null;
let mode = 'gallery';

function uid(){ return 'p'+Math.random().toString(36).slice(2,9); }

function seedProducts(){
  return [
    { id:uid(), name:'خزانة ملابس', type:'wardrobe', params:{w:1.2,h:2.0,d:0.6,doors:2,drawers:2,shelves:3,mat:'oak'} },
    { id:uid(), name:'مطبخ سفلي', type:'kitchen', params:{w:1.0,h:0.9,d:0.6,drawers:3,mat:'white'} },
    { id:uid(), name:'رفوف', type:'shelf', params:{w:0.9,h:1.8,d:0.35,shelves:4,mat:'walnut'} },
    { id:uid(), name:'طاولة', type:'table', params:{w:1.2,h:0.75,d:0.7,mat:'oak'} },
    { id:uid(), name:'باب خشب', type:'doorUnit', params:{w:0.9,h:2.1,mat:'walnut'} },
    { id:uid(), name:'نافذة ألمنيوم', type:'window', params:{w:1.2,h:1.0,mat:'alu'} },
  ];
}

/* ============ Thumbnail manager ============ */
const thumbRenderers = [];        // كل المصغرات النشطة
const thumbLoops = [];            // معرفات requestAnimationFrame

function stopAllThumbs(){
  thumbLoops.forEach(id => cancelAnimationFrame(id));
  thumbLoops.length = 0;
  thumbRenderers.forEach(r => {
    try{
      r.dispose();
      r.forceContextLoss();
      r.domElement.remove();
    }catch(e){}
  });
  thumbRenderers.length = 0;
}

/* ============ Modes ============ */
document.querySelectorAll('.modes button').forEach(b=>{
  b.onclick = ()=>{
    document.querySelectorAll('.modes button').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    setMode(b.dataset.mode);
  };
});

function setMode(m){
  const prev = mode;
  mode = m;
  galleryEl.classList.toggle('hide', m!=='gallery');
  dockEl.classList.toggle('hide', m!=='editor');
  pvbarEl.classList.toggle('hide', m!=='preview');
  sideEl.classList.remove('open');

  // ✅ إيقاف مصغرات المعرض عند مغادرته — الحل الأساسي للشاشة البيضاء
  if(prev === 'gallery' && m !== 'gallery'){
    stopAllThumbs();
  }

  if(m === 'gallery'){
    renderGallery();
    gizmo.attach(null);
    selected = null;
  }

  if((m === 'editor' || m === 'preview') && productRoot.children.length === 0 && products[0]){
    loadProduct(products[0]);
  }

  if(m === 'editor'){
    // Gizmo يظهر فقط عند التحديد في المحرر
    select(null);
  }

  if(m === 'preview'){
    // 🚫 إخفاء Gizmo في المعاينة + منع التحديد
    select(null);
    gizmo.attach(null);
    renderPreviewBar();
  }
}

/* ============ Load product ============ */
function loadProduct(p){
  activeProduct = p;
  while(productRoot.children.length) productRoot.remove(productRoot.children[0]);
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
}

function openProductFromCard(p, view){
  loadProduct(p);
  document.querySelector('.modes button[data-mode="'+view+'"]')?.click();
}

/* ============ Gallery ============ */
function renderGallery(){
  stopAllThumbs();
  galleryEl.innerHTML = '';
  products.forEach(p => {
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML =
      '<div class="thumb"></div>'+
      '<div class="meta">'+
        '<div class="name">'+p.name+'</div>'+
        '<div class="sub">'+(LABELS[p.type] || p.type)+'</div>'+
      '</div>'+
      '<div class="actions">'+
        '<button class="go">معاينة</button>'+
        '<button class="ed">تعديل</button>'+
      '</div>';
    el.querySelector('.go').onclick = ()=> openProductFromCard(p, 'preview');
    el.querySelector('.ed').onclick = ()=> openProductFromCard(p, 'editor');
    galleryEl.appendChild(el);
    const thumb = el.querySelector('.thumb');
    setTimeout(()=>{
      if(mode === 'gallery') renderThumb(thumb, p);
    }, 60);
  });
}

/* FIX6 */ function renderThumb(container, p){
  const w = container.clientWidth || 200, h = 110;
  const r = new THREE.WebGLRenderer({ antialias:true, alpha:true, preserveDrawingBuffer:true });
  r.setSize(w, h); r.setPixelRatio(1);
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
  c.position.set(center.x+size*0.9, center.y+size*0.55, center.z+size*1.05);
  c.lookAt(center);
  r.render(sc, c);
  // استخرج الصورة كـ Data URL ثم دمّر السياق فورًا
  const dataUrl = r.domElement.toDataURL('image/png');
  r.dispose();
  r.forceContextLoss();
  // اعرض الصورة بدل canvas
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
  container.appendChild(img);
}

/* ============ Preview bar ============ */
function renderPreviewBar(){
  pvbarEl.innerHTML = '';
  const parts = [];
  productRoot.traverse(o=>{
    if(o.userData.kind === 'door' || o.userData.kind === 'drawer') parts.push(o);
  });
  if(!parts.length){
    const b = document.createElement('button');
    b.textContent = 'لا توجد أبواب أو أدراج';
    b.disabled = true;
    pvbarEl.appendChild(b);
    return;
  }
  let doorN = 0, drawerN = 0;
  parts.forEach(part => {
    const btn = document.createElement('button');
    if(part.userData.kind === 'door'){ doorN++; btn.textContent = '🚪 باب '+doorN; }
    else { drawerN++; btn.textContent = '🗄️ درج '+drawerN; }
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

/* ============ Pick / Select ============ */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function pick(x, y){
  if(mode !== 'editor') return;   // منع التحديد في المعاينة والمعرض
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

function select(obj){
  selected = obj;
  gizmo.attach(mode === 'editor' ? obj : null);
  renderProps(obj);
  if(!obj) sideEl.classList.remove('open');
}

/* ============ Tap / Double-tap ============ */
let lastTapTime = 0, lastTapX = 0, lastTapY = 0;
renderer.domElement.addEventListener('pointerdown', e => {
  if(mode !== 'editor') return;
  if(gizmo.isDragging()) return;
  const t = e.touches ? e.touches[0] : e;
  const now = Date.now();
  const dx = t.clientX - lastTapX, dy = t.clientY - lastTapY;
  const isDouble = (now - lastTapTime < 320) && (dx*dx + dy*dy < 900);
  lastTapTime = now; lastTapX = t.clientX; lastTapY = t.clientY;

  const sx = t.clientX, sy = t.clientY;
  const up = ev => {
    window.removeEventListener('pointerup', up);
    const cx = ev.clientX, cy = ev.clientY;
    const ddx = cx - sx, ddy = cy - sy;
    if(ddx*ddx + ddy*ddy > 100) return;
    pick(cx, cy);
    if(isDouble && selected) sideEl.classList.add('open');
  };
  window.addEventListener('pointerup', up);
});

/* ============ Dock ============ */
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
    const p = { id:uid(), name:LABELS[type], type, params:defaultParams(type) };
    products.push(p);
    persist();
    openProductFromCard(p, 'editor');
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
    if(activeProduct){ activeProduct.params.mat = name; persist(); }
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

/* ============ Side panel ============ */
document.getElementById('btnProps').onclick = ()=> sideEl.classList.toggle('open');
document.getElementById('closeSide').onclick = ()=> sideEl.classList.remove('open');
document.getElementById('delSel').onclick = ()=>{ if(selected){ selected.remove(); select(null);} };

function renderProps(obj){
  propsEl.innerHTML = '';
  if(!obj){
    propsEl.innerHTML = '<p style="color:var(--mut);font-size:12px">لم يتم تحديد أي عنصر.</p>';
    return;
  }
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
  d.innerHTML = '<label>'+label+'<span class="val">'+value+'</span></label>';
  propsEl.appendChild(d);
}
function addSlider(label, val, min, max, on){
  const d = document.createElement('div');
  d.className = 'prop';
  d.innerHTML = '<label>'+label+'<span class="val">'+(+val).toFixed(2)+'</span></label>'+
                '<input type="range" min="'+min+'" max="'+max+'" step="0.01" value="'+val+'">';
  const input = d.querySelector('input');
  const v = d.querySelector('.val');
  input.oninput = ()=>{ v.textContent = (+input.value).toFixed(2); on(+input.value); };
  propsEl.appendChild(d);
}

/* ============ Save ============ */
document.getElementById('btnSave').onclick = ()=>{ persist(); toast('تم الحفظ ✓'); };
function persist(){
  try{ localStorage.setItem('najjar_products', JSON.stringify(products)); }catch(e){}
}

/* ============ Toast ============ */
let toastT;
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(()=>t.classList.remove('show'), 1600);
}

/* ============ Resize ============ */
addEventListener('resize', ()=>{
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

/* ============ Loop ============ */
let last = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  controls.update();
  if(mode === 'editor') gizmo.update();
  else gizmo.root.visible = false;
  if(mode === 'preview') animateParts(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ============ Boot ============ */
setMode('gallery');
