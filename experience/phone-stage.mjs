import * as THREE from './vendor/three.module.min.js';
import {CSS3DRenderer,CSS3DObject} from './vendor/CSS3DRenderer.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

const stage=document.getElementById('phone-stage');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const section=document.querySelector('.device-section');
const status=document.getElementById('stage-status');
const screenElements=['2023','2026'].map(year=>document.getElementById('screen-'+year));
let focusEra='2023',api=null;
function command(year,action,extra={}){document.getElementById('frame-'+year).contentWindow?.postMessage({type:'lab-command',action,...extra},'*');}
document.querySelectorAll('[data-device-action]').forEach(b=>b.onclick=()=>{api?.front();stage.scrollIntoView({block:'center',behavior:'instant'});command(b.dataset.era,b.dataset.deviceAction);});
document.getElementById('show-rank-labels').onchange=e=>['2023','2026'].forEach(y=>command(y,'rank-labels',{enabled:e.target.checked}));
document.querySelectorAll('[data-focus-era]').forEach(b=>b.onclick=()=>{
 focusEra=b.dataset.focusEra;section.classList.toggle('focus-2026',focusEra==='2026');
 document.querySelectorAll('[data-focus-era]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));api?.focus();
});
window.addEventListener('rank-hop-focus',()=>{api?.front();if(stage.clientWidth<=760)document.querySelector('[data-focus-era="2026"]').click();stage.scrollIntoView({block:'center',behavior:'instant'});});
// Each child can reload when its CSS3D surface first enters the scene.
window.addEventListener('message',e=>{if(e.data?.type==='lab-ready'){const year=['2023','2026'].find(y=>document.getElementById('frame-'+y).contentWindow===e.source);if(year)command(year,'rank-labels',{enabled:document.getElementById('show-rank-labels').checked});}});
function fallback(message){stage.dataset.phase='fallback';status.textContent=message;document.getElementById('skip-stage').hidden=true;document.getElementById('turn-phones').hidden=true;document.getElementById('replay-stage').disabled=true;window.phoneStageSnapshot={mode:'fallback',phase:'ready',reason:message};}
function roundShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function rounded(w,h,d,r,mat){const g=new THREE.ExtrudeGeometry(roundShape(w,h,r),{depth:d-.04,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:3,steps:1,curveSegments:10});g.translate(0,0,-(d-.04)/2);return new THREE.Mesh(g,mat);}
function phone(year,scene,cssScene){
 const modern=year==='2026',w=(modern?71.9:70.6)/23,h=(modern?150:146.6)/23,d=(modern?8.75:8.25)/23;
 const group=new THREE.Group();scene.add(group);
 const metal=new THREE.MeshStandardMaterial({color:modern?0x784555:0xa9a397,metalness:.87,roughness:.28});
 const glass=new THREE.MeshPhysicalMaterial({color:modern?0x361c28:0x77756f,metalness:.3,roughness:.38,clearcoat:1,clearcoatRoughness:.25});
 const black=new THREE.MeshStandardMaterial({color:0x08090c,metalness:.35,roughness:.18});
 const body=rounded(w,h,d,.34,metal);group.add(body);
 const back=rounded(w-.085,h-.085,.035,.33,glass);back.position.z=-d/2-.006;group.add(back);
 const face=rounded(w-.065,h-.065,.035,.33,black);face.position.z=d/2;group.add(face);
 // The newer chassis uses the wide camera plateau; both retain the triple-lens layout.
 const plate=rounded(modern?w-.16:1.53,1.55,.14,.28,metal);plate.position.set(modern?0:.61,h/2-.91,-d/2-.09);group.add(plate);
 const lensMat=new THREE.MeshPhysicalMaterial({color:0x0b1220,metalness:.8,roughness:.08,clearcoat:1});
 const lensPositions=[[.91,h/2-.56],[.91,h/2-1.23],[.27,h/2-.90]];
 for(const [x,y]of lensPositions){
  const ring=new THREE.Mesh(new THREE.CylinderGeometry(.286,.286,.14,48),metal);ring.rotation.x=Math.PI/2;ring.position.set(x,y,-d/2-.23);group.add(ring);
  const lens=new THREE.Mesh(new THREE.CylinderGeometry(.235,.235,.155,48),black);lens.rotation.x=Math.PI/2;lens.position.set(x,y,-d/2-.25);group.add(lens);
  const optic=new THREE.Mesh(new THREE.SphereGeometry(.17,24,16),lensMat);optic.scale.z=.25;optic.position.set(x,y,-d/2-.337);group.add(optic);
  const iris=new THREE.Mesh(new THREE.RingGeometry(.09,.13,40),new THREE.MeshBasicMaterial({color:0x354565,side:THREE.DoubleSide}));iris.position.set(x,y,-d/2-.382);group.add(iris);
 }
 for(const [x,y,r,color]of [[modern?-.93:-.02,h/2-.52,.10,0xe1ddd1],[modern?-.94:-.03,h/2-1.24,.08,0x121219]]){const disc=new THREE.Mesh(new THREE.CylinderGeometry(r,r,.03,24),new THREE.MeshStandardMaterial({color,roughness:.3}));disc.rotation.x=Math.PI/2;disc.position.set(x,y,-d/2-.19);group.add(disc);}
 // Raised physical keys, antenna breaks and the USB-C opening.
 for(const [side,y,len]of [[-1,1.65,.25],[-1,.95,.46],[-1,.31,.46],[1,1.03,.7],...(modern?[[1,-1.35,.65]]:[])]){const key=new THREE.Mesh(new THREE.BoxGeometry(.055,len,.11),metal);key.position.set(side*(w/2+.017),y,0);group.add(key);}
 for(const side of [-1,1])for(const y of [-2.48,2.48]){const a=new THREE.Mesh(new THREE.BoxGeometry(.045,.045,d+.01),new THREE.MeshStandardMaterial({color:0x25252a}));a.position.set(side*w/2,y,0);group.add(a);}
 const port=new THREE.Mesh(new THREE.BoxGeometry(.45,.025,.12),black);port.position.set(0,-h/2-.018,0);group.add(port);
 // A subtle modeled maker's emblem, kept separate from the source-of-truth UI.
 const emblem=new THREE.Group();const emblemMat=new THREE.MeshStandardMaterial({color:modern?0x2c1820:0x54524e,metalness:.5,roughness:.3,side:THREE.DoubleSide});
 const mark=new THREE.Shape();mark.moveTo(0,.22);mark.bezierCurveTo(-.09,.27,-.2,.31,-.28,.18);mark.bezierCurveTo(-.42,-.04,-.23,-.35,-.13,-.36);mark.bezierCurveTo(-.04,-.37,-.03,-.29,.05,-.31);mark.bezierCurveTo(.15,-.29,.17,-.39,.25,-.31);mark.bezierCurveTo(.31,-.25,.36,-.15,.37,-.11);mark.bezierCurveTo(.18,-.03,.18,.13,.31,.20);mark.bezierCurveTo(.22,.33,.09,.27,0,.22);
 const markMesh=new THREE.Mesh(new THREE.ShapeGeometry(mark,24),emblemMat);markMesh.scale.x=-1;emblem.add(markMesh);
 const leaf=new THREE.Mesh(new THREE.SphereGeometry(.09,16,12),emblemMat);leaf.scale.set(.55,1.2,.02);leaf.position.set(-.07,.37,0);leaf.rotation.z=.5;emblem.add(leaf);emblem.position.set(0,-.2,-d/2-.03);group.add(emblem);
 const el=document.getElementById('screen-'+year);const sw=w-.16,sh=h-.16;el.style.width='360px';el.style.height=(360*sh/sw)+'px';el.style.borderRadius=modern?'39px':'37px';
 const cssGroup=new THREE.Group(),surface=new CSS3DObject(el);surface.scale.setScalar(sw/360);surface.position.z=d/2+.027;cssGroup.add(surface);cssScene.add(cssGroup);
 return {year,group,cssGroup,el,w,h};
}
function start(){
 if(new URLSearchParams(location.search).has('no3d')){fallback('입체 효과 없이도 두 피드를 그대로 체험할 수 있습니다.');return;}
 let renderer;
 try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{fallback('이 기기에서는 입체 효과 대신 일반 목업으로 보여드립니다.');return;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;renderer.domElement.className='webgl-stage';renderer.domElement.setAttribute('aria-hidden','true');stage.append(renderer.domElement);
 const scene=new THREE.Scene(),cssScene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-6,6,3.8,-3.8,.1,100);camera.position.set(0,0,20);
 const cssRenderer=new CSS3DRenderer();cssRenderer.domElement.className='css-stage';stage.append(cssRenderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 scene.add(new THREE.HemisphereLight(0xc5e4ff,0x4f3244,2));const key=new THREE.DirectionalLight(0xffffff,3.0);key.position.set(-4,6,8);scene.add(key);const rim=new THREE.DirectionalLight(0x97cfff,2.5);rim.position.set(5,2,-4);scene.add(rim);
 const phones=['2023','2026'].map(y=>phone(y,scene,cssScene));
 const dustGeo=new THREE.BufferGeometry();const positions=[];for(let i=0;i<90;i++){const n=i*2.399963;positions.push(Math.cos(n)*(2+i%9),Math.sin(n)*4,-2-(i%7));}dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const dustMat=new THREE.PointsMaterial({size:.019,color:0x9fc4df,transparent:true,opacity:.4});const dust=new THREE.Points(dustGeo,dustMat);scene.add(dust);
 stage.classList.add('has-webgl');let mobile=false,width=0,height=0,raf=0,intersecting=true,animationStart=performance.now(),duration=reduced.matches?0:4200,kind='intro',back=false;
 const ease=t=>1-Math.pow(1-t,3),clamp=THREE.MathUtils.clamp;
 const targetX=p=>mobile?(p.year===focusEra?0:(p.year==='2023'?-5:5)):(p.year==='2023'?-2.22:2.22);
 function snapshot(phase){window.phoneStageSnapshot={mode:'three',phase,revision:THREE.REVISION,focused:focusEra,back,reducedMotion:reduced.matches,canvas:{width,height},phones:phones.map(p=>({year:p.year,rotationY:p.group.rotation.y,x:p.group.position.x,visible:p.el.style.visibility!=='hidden'}))};}
 function render(now){raf=0;if(!intersecting||document.hidden)return;const t=duration?clamp((now-animationStart)/duration,0,1):1;
  for(let i=0;i<phones.length;i++){
   const p=phones[i],sign=i?1:-1;let k=t;
   if(kind==='intro'){
    k=duration?clamp((now-animationStart-i*220)/(duration-i*220),0,1):1;const e=ease(k);p.group.position.set(targetX(p)+sign*4.8*(1-e),-.65*(1-e)+Math.sin(k*Math.PI)*.28,-3*(1-e));p.group.rotation.set(.16*(1-e),sign*(Math.PI*1.18)*(1-e),-sign*.22*(1-e));
   }else{const e=ease(t);p.group.position.x=THREE.MathUtils.lerp(p.fromX,targetX(p),e);p.group.position.y=0;p.group.position.z=0;p.group.rotation.set(0,THREE.MathUtils.lerp(p.fromY,back?Math.PI:0,e),0);}
   p.cssGroup.position.copy(p.group.position);p.cssGroup.quaternion.copy(p.group.quaternion);const visible=Math.cos(p.group.rotation.y)>.05&&(!mobile||p.year===focusEra);p.el.style.visibility=visible?'visible':'hidden';p.el.style.opacity=String(clamp((Math.cos(p.group.rotation.y)-.05)*2,0,1));p.el.inert=!visible||t<1;
  }
  dustMat.opacity=kind==='intro'?(1-t)*.5:0;dust.rotation.z=t*.15;
  renderer.render(scene,camera);cssRenderer.render(cssScene,camera);
  if(t<1){stage.dataset.phase='animating';snapshot('animating');raf=requestAnimationFrame(render);}else{stage.dataset.phase='ready';document.getElementById('skip-stage').hidden=true;status.textContent=back?'카메라·금속 프레임·측면 버튼을 확인하세요.':'화면을 스크롤하고, 아래 버튼으로 추천 기준을 바꿔보세요.';snapshot('ready');}
 }
 function wake(){cancelAnimationFrame(raf);raf=requestAnimationFrame(render);}
 function animate(nextKind,nextBack=false,ms=1100){kind=nextKind;back=nextBack;stage.dataset.phase='animating';snapshot('animating');phones.forEach(p=>{p.fromX=p.group.position.x;p.fromY=p.group.rotation.y;});animationStart=performance.now();duration=reduced.matches?0:ms;document.getElementById('turn-phones').setAttribute('aria-pressed',String(back));document.getElementById('turn-phones').textContent=back?'화면으로 돌아오기':'기기 뒷면 보기';wake();}
 function resize(){width=stage.clientWidth;height=stage.clientHeight;mobile=width<=760;const viewHeight=mobile?7.35:7.5;const viewWidth=viewHeight*width/height;camera.left=-viewWidth/2;camera.right=viewWidth/2;camera.top=viewHeight/2;camera.bottom=-viewHeight/2;camera.updateProjectionMatrix();renderer.setSize(width,height);cssRenderer.setSize(width,height);wake();}
 api={front:()=>{if(back)animate('turn',false);},focus:()=>animate('focus',false,600)};
 document.getElementById('replay-stage').onclick=()=>{stage.scrollIntoView({block:'center',behavior:'instant'});back=false;kind='intro';animationStart=performance.now();duration=reduced.matches?0:4200;document.getElementById('skip-stage').hidden=reduced.matches;document.getElementById('turn-phones').setAttribute('aria-pressed','false');document.getElementById('turn-phones').textContent='기기 뒷면 보기';wake();};
 document.getElementById('skip-stage').onclick=()=>{animationStart=performance.now()-10000;wake();};
 document.getElementById('turn-phones').onclick=()=>{stage.scrollIntoView({block:'center',behavior:'instant'});animate('turn',!back);};
 new ResizeObserver(resize).observe(stage);
 new IntersectionObserver(entries=>{intersecting=entries[0].isIntersecting;if(intersecting)wake();else cancelAnimationFrame(raf);},{rootMargin:'150px'}).observe(stage);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)wake();else cancelAnimationFrame(raf);});
 reduced.addEventListener('change',()=>{duration=0;animate('turn',false,0);});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);renderer.domElement.hidden=true;stage.dataset.phase='ready';phones.forEach(p=>{p.el.inert=false;});status.textContent='입체 효과가 중단됐습니다. 피드는 계속 사용할 수 있습니다.';document.getElementById('turn-phones').disabled=true;document.getElementById('replay-stage').disabled=true;snapshot('context-lost');});
 resize();
}
try{start();}catch(error){console.warn('Phone stage fallback:',error.message);const holder=document.getElementById('fallback-phones');screenElements.forEach(el=>holder.append(el));stage.querySelectorAll('.webgl-stage,.css-stage').forEach(el=>el.remove());stage.classList.remove('has-webgl');fallback('입체 효과를 불러오지 못해 일반 목업으로 보여드립니다.');}
