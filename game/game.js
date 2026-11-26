const canvas=document.querySelector("canvas"),ctx=canvas.getContext("2d"),art=new Image();art.src="bracket.png";
const keys=new Set(), mouse={x:600,y:240,down:false,seen:false};
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n)),rnd=(a,b)=>a+Math.random()*(b-a);
const bounds={x:50,y:26},min=-2;
const avenues=[0,16,32,48], streets=[0,12,24], subway=[48,24];
const guns=[
 {name:"Ионный карабин",color:"#68ffe3",delay:.105,speed:15,damage:1,spread:[0]},
 {name:"Дробовик «Оса»",color:"#ffc06a",delay:.48,speed:11,damage:2,spread:[-.23,-.11,0,.11,.23],price:95,desc:"Пять зарядов веером для ближнего боя."},
 {name:"Рельсотрон «Игла»",color:"#ce8aff",delay:.52,speed:24,damage:7,spread:[0],price:150,desc:"Прошивает несколько мутантов по одной линии."},
 {name:"Дуплет «Близнецы»",color:"#ffce7b",delay:.22,speed:15,damage:2,spread:[-.055,.055],price:80,desc:"Два параллельных заряда за один спуск."},
 {name:"Криолуч «Иней»",color:"#91ddff",delay:.26,speed:16,damage:2,spread:[0],price:125,desc:"Замедляет поражённого мутанта на две секунды."},
 {name:"Тесла «Дуга»",color:"#b39cff",delay:.38,speed:18,damage:3,spread:[0],price:165,desc:"Разряд перескакивает на второго врага рядом."},
 {name:"Роевик «Мотылёк»",color:"#e5ff8d",delay:.31,speed:8,damage:3,spread:[-.14,.14],price:195,desc:"Два светляка доворачивают к ближайшей цели."},
 {name:"Плазмомёт «Вулкан»",color:"#ff887c",delay:.62,speed:10,damage:6,spread:[0],price:230,desc:"Плазменный шар обжигает группу при попадании."},
 {name:"Импульсник «Ливень»",color:"#ff92d9",delay:.065,speed:17,damage:2,spread:[0],price:290,desc:"Непрерывная очередь из компактного эмиттера."}
];
const gleb={x:.5,y:9.8,trader:true};
function nearGleb(){return Math.hypot(player.x-gleb.x,player.y-gleb.y)<2}
function cacheCount(){return caches.filter(c=>player.owned.includes(c.slot)).length}
const caches=[{x:8,y:12,slot:1,place:"Рынок"},{x:32,y:5,slot:2,place:"Подстанция"}];
function road(x,y){
 if(x<-.85&&y>8.5&&y<10.05)return false;
 return x>=min&&y>=min&&x<=bounds.x&&y<=bounds.y&&(avenues.some(v=>Math.abs(x-v)<=2.1)||streets.some(v=>Math.abs(y-v)<=2.1))
}
function moveActor(a,dx,dy){
 const x=clamp(a.x+dx,min,bounds.x),y=clamp(a.y+dy,min,bounds.y);
 if(road(x,a.y))a.x=x;if(road(a.x,y))a.y=y
}
function clearRoute(x,y,tx,ty){
 const n=Math.ceil(Math.hypot(tx-x,ty-y)*2);
 for(let i=1;i<=n;i++)if(!road(x+(tx-x)*i/n,y+(ty-y)*i/n))return false;
 return true
}
// A shared distance field lets the horde take the nearest connected side street.
const navWidth=53,navHeight=29,dirs4=[[1,0],[-1,0],[0,1],[0,-1]];
let navKey=-1,distances=new Int16Array(navWidth*navHeight);
const node=(x,y)=>(y+2)*navWidth+x+2;
function guide(e,p){
 if(clearRoute(e.x,e.y,p.x,p.y))return p;
 const gx=Math.round(p.x),gy=Math.round(p.y),key=node(gx,gy);
 if(key!==navKey){
  navKey=key;distances.fill(-1);distances[key]=0;const queue=[[gx,gy]];
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of dirs4){
   const nx=x+dx,ny=y+dy,k=node(nx,ny);if(!road(nx,ny)||distances[k]>=0)continue;
   distances[k]=distances[node(x,y)]+1;queue.push([nx,ny])
  }}
 }
 const x=Math.round(e.x),y=Math.round(e.y);let best={x,y},cost=distances[node(x,y)];
 for(const [dx,dy] of dirs4){let nx=x+dx,ny=y+dy,k=node(nx,ny);
  if(road(nx,ny)&&distances[k]>=0&&distances[k]<cost&&clearRoute(e.x,e.y,nx,ny)){cost=distances[k];best={x:nx,y:ny}}
 }return best
}
function selectGun(slot){if(player.owned.includes(slot))player.slot=slot;hud()}
function collect(){for(const c of caches)if(!player.owned.includes(c.slot)&&Math.hypot(player.x-c.x,player.y-c.y)<.95){player.owned.push(c.slot);selectGun(c.slot);tone(380,920,.22,"triangle")}}

let barrels,blasts,player,foes,shots,fx,stains,rings,items,round,quota,spawned,kills,points,streak,comboTime,spawnIn,nextIn,mode,time,shake,serial;
let sound=true,audioContext;
function tone(freq,end,length,type,vol=.055){
 if(!sound||!audioContext||audioContext.state!=="running")return;
 const a=audioContext,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime);o.frequency.exponentialRampToValueAtTime(end,a.currentTime+length);g.gain.setValueAtTime(vol,a.currentTime);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+length);o.connect(g);g.connect(a.destination);o.start();o.stop(a.currentTime+length)
}
function awaken(){if(mode==="ready")mode="play";if(sound){try{audioContext??=new AudioContext();if(audioContext.state==="suspended")audioContext.resume().catch(()=>{})}catch{}}}
function reset(){if(typeof resetVendor==="function")resetVendor();navKey=-1;camera.x=286;camera.y=172;mouse.seen=false;barrels=freshBarrels();blasts=[];player={x:.6,y:0,owned:[0],credits:100,slot:0,hp:100,charge:100,fire:0,dash:0,safe:0,dx:.707,dy:-.707,face:1,moving:false,lookAngle:0,lookIndex:0};foes=[];shots=[];fx=[];stains=[];rings=[];items=[];round=1;quota=waveSizes[0];spawned=kills=points=streak=comboTime=spawnIn=nextIn=time=shake=serial=0;mode="ready";keys.clear();mouse.down=false;for(let i=0;i<4;i++)spawn();document.querySelector("#result").hidden=true;hud()}
function hud(){document.querySelector("#wave").textContent=cacheCount()===0?"Найди оружие на рынке или подстанции":cacheCount()===1?"Найди второй тайник":"К метро · "+Math.round(Math.hypot(player.x-48,player.y-24)*4)+" м";document.querySelector("#gun").textContent=(player.slot+1)+" · "+guns[player.slot].name;document.querySelector("#money").textContent="₡ "+player.credits;document.querySelector("#trade").disabled=!nearGleb()||mode!=="play";document.querySelector("#health").textContent="♥ "+Math.ceil(player.hp)+" / 100";document.querySelector("#charge").textContent="ИМПУЛЬС "+Math.floor(player.charge)+"%";document.querySelector("#score").textContent=String(points).padStart(6,"0")+(streak>1?"   ×"+streak:"")}
function finish(win){mode=win?"win":"lost";let el=document.querySelector("#result");el.hidden=false;el.querySelector("span").textContent=(win?"МЕТРО ОТКРЫТО":"СМЕНА ОКОНЧЕНА")+" · "+kills+" убито · "+points+" очков";tone(win?260:120,win?780:28,.55,"sawtooth")}
const waveSizes=[24,32,40];
function spawn(){
 const ahead=spawned%5!==4, offset=ahead?rnd(4.2,7.2):-rnd(3,5);
 let c;
 for(let j=0;j<12;j++){const a=j*Math.PI/6+spawned*2.4,px=player.x+Math.cos(a)*offset,py=player.y+Math.sin(a)*offset;if(road(px,py)){c=[px,py];break}}
 if(!c)c=[avenues.reduce((a,b)=>Math.abs(b-player.x)<Math.abs(a-player.x)?b:a),clamp(player.y+offset,min,bounds.y)];
 const pattern=spawned%10;
 const boss=round===3&&spawned===0;
 const kind=boss?"boss":pattern===3||pattern===8?"runner":pattern===6?"guard":round>1&&pattern===9?"medic":round>1&&pattern===2?"heavy":round>1&&pattern===1?"spitter":"grunt";
 const heavy=kind==="heavy",spitter=kind==="spitter";
 const hp={boss:48,heavy:8,spitter:4,runner:2,guard:4,medic:4,grunt:3}[kind];
 foes.push({x:c[0],y:c[1],hp,max:hp,boss,heavy,spitter,kind,armor:kind==="guard"?3:0,healTime:0,chargeTime:0,telegraph:0,id:++serial,attack:rnd(1.3,3),wind:0,flash:0,strike:0,walking:false,gait:0,heading:1});spawned++}
function splatter(e,strong){const n=strong?23:7;for(let i=0;i<n;i++)fx.push({x:e.x,y:e.y,z:rnd(8,23),dx:rnd(-2.3,2.3),dy:rnd(-2.3,2.3),vz:rnd(24,99),life:rnd(.2,.75),ink:i%4===0?"#ff946c":i%3===0?"#f34058":"#982445",size:rnd(2,6)});if(strong){for(let i=0;i<7;i++)stains.push({x:clamp(e.x+rnd(-.32,.32),min,bounds.x),y:clamp(e.y+rnd(-.32,.32),min,bounds.y),r:rnd(2,9)});if(stains.length>330)stains.splice(0,7)}}
function hit(e,n){if(e.hp<=0)return;
 if(e.armor>0){const absorbed=Math.min(n,e.armor);e.armor-=absorbed;n-=absorbed;e.flash=.14;if(!n)return}
 e.hp-=n;e.flash=.14;splatter(e,e.hp<=0);if(e.hp>0)return;kills++;player.credits+=e.boss?100:e.heavy?32:e.spitter?25:18;streak=comboTime>0?Math.min(9,streak+1):1;comboTime=2;points+=(e.boss?750:e.heavy?150:75)*streak;player.charge=Math.min(100,player.charge+8);shake=Math.max(shake,e.boss?10:2);if(kills%6===0)items.push({x:e.x,y:e.y});tone(109,35,.1,"triangle",.12)}
function damage(n){if(player.safe>0)return;player.hp=Math.max(0,player.hp-n);player.safe=.65;shake=7;tone(133,33,.18,"sawtooth");if(!player.hp)finish(false)}
function pulse(){if(mode!=="play"||player.charge<100)return;player.charge=0;rings.push({x:player.x,y:player.y,t:0});for(const e of foes){let dx=e.x-player.x,dy=e.y-player.y,d=Math.hypot(dx,dy);if(d<3.25){hit(e,12);moveActor(e,dx/(d||1)*.7,dy/(d||1)*.7)}}shots=shots.filter(b=>!b.hostile||Math.hypot(b.x-player.x,b.y-player.y)>3.25);shake=9;tone(310,36,.4,"sawtooth")}
function dash(){if(mode!=="play"||player.dash>0)return;player.dash=1.5;player.safe=.35;for(let i=0;i<12;i++){moveActor(player,player.dx*.12,player.dy*.12);fx.push({x:player.x,y:player.y,z:13,dx:0,dy:0,vz:10,life:.27,ink:"#77ffb3",size:5});for(const e of foes)if(Math.hypot(e.x-player.x,e.y-player.y)<.5&&e.dashed!==time){e.dashed=time;hit(e,3)}}tone(180,720,.15,"triangle")}
const camera={x:455,y:252,zoom:1.18};
const gripHeight=34, barrelLength=44;
function gunVector(){
 const p=player;
 if(mouse.seen&&(mouse.down||!keys.has("Space"))){
  const [sx,sy]=xy(p.x,p.y,gripHeight);
  const dx=(mouse.x-480)/camera.zoom+camera.x-sx,dy=(mouse.y-270)/camera.zoom+camera.y-sy;
  const len=Math.hypot(dx,dy);if(len>1)return [dx/len,dy/len];
 }
 if(keys.has("Space")){
  let nearest=null,best=Infinity;
  for(const e of foes){let d=Math.hypot(e.x-p.x,e.y-p.y);if(e.hp>0&&d<best){best=d;nearest=e}}
  if(nearest){const dx=(nearest.x-p.x-nearest.y+p.y)*W,dy=(nearest.x-p.x+nearest.y-p.y)*H+gripHeight-16,len=Math.hypot(dx,dy);if(len)return [dx/len,dy/len]}
 }
 if(p.moving){const dx=(p.dx-p.dy)*W,dy=(p.dx+p.dy)*H,len=Math.hypot(dx,dy)||1;return [dx/len,dy/len]}
 return p.aim||[.985,-.173];
}
function weaponHit(e,slot){
 const gun=guns[slot];hit(e,gun.damage);
 if(slot===4)e.chilled=2;
 if(slot===5){let best=null,d=2.5;for(const o of foes){const r=Math.hypot(o.x-e.x,o.y-e.y);if(o!==e&&o.hp>0&&r<d&&clearRoute(e.x,e.y,o.x,o.y)){best=o;d=r}}
  if(best){hit(best,3);for(let n=1;n<=9;n++)fx.push({x:e.x+(best.x-e.x)*n/10,y:e.y+(best.y-e.y)*n/10,z:14+rnd(-3,3),dx:0,dy:0,vz:2,life:.16,ink:gun.color,size:3})}}
 if(slot===7){blasts.push({x:e.x,y:e.y,t:0});for(const o of foes)if(o!==e&&o.hp>0&&Math.hypot(o.x-e.x,o.y-e.y)<1.7&&clearRoute(e.x,e.y,o.x,o.y))hit(o,3)}
}
function fire(){
 const p=player,[u,v]=gunVector();p.aim=[u,v];p.face=u>=0?1:2;
 // Project the visible muzzle back onto the projectile plane.
 const offsetX=(u*barrelLength/W+(v*barrelLength+16-gripHeight)/H)/2;
 const offsetY=((v*barrelLength+16-gripHeight)/H-u*barrelLength/W)/2;
 const vx=(u/W+v/H)/2,vy=(v/H-u/W)/2,len=Math.hypot(vx,vy);
 const gun=guns[p.slot];let blocked=false,nearHit=null;
 for(let n=1;n<=5;n++){
  const x=p.x+offsetX*n/5,y=p.y+offsetY*n/5;
  const barrel=barrels.find(b=>b.live&&Math.hypot(b.x-x,b.y-y)<.28);
  if(barrel){detonate(barrel);blocked=true;break}
  const e=foes.find(e=>e.hp>0&&Math.hypot(e.x-x,e.y-y)<(e.boss?.74:.41));
  if(e){nearHit=e.id;weaponHit(e,p.slot);blocked=p.slot!==2;break}
 }
 if(!blocked)for(const angle of gun.spread){
  const heading=Math.atan2(vy,vx)+angle;
  shots.push({x:p.x+offsetX,y:p.y+offsetY,dx:Math.cos(heading)*gun.speed,dy:Math.sin(heading)*gun.speed,life:p.slot===1?.45:1,hostile:false,slot:p.slot,seen:new Set(nearHit===null?[]:[nearHit])})
 }
 p.fire=gun.delay;tone([280,140,690,420,790,610,550,170,360][p.slot],[68,28,92,85,180,90,130,30,75][p.slot],p.slot?.16:.075,p.slot===2?"triangle":"sawtooth",.04)
}
function step(dt){if(mode!=="play")return;time+=dt;const p=player;for(const k of ["fire","safe","dash"])p[k]=Math.max(0,p[k]-dt);p.charge=Math.min(100,p.charge+dt*3);shake=Math.max(0,shake-dt*22);comboTime-=dt;if(comboTime<=0)streak=0;
 const h=Number(keys.has("KeyD")||keys.has("ArrowRight"))-Number(keys.has("KeyA")||keys.has("ArrowLeft")),v=Number(keys.has("KeyS")||keys.has("ArrowDown"))-Number(keys.has("KeyW")||keys.has("ArrowUp"));const dx=h+v,dy=v-h,len=Math.hypot(dx,dy);p.moving=!!len;if(len){p.dx=dx/len;p.dy=dy/len;moveActor(p,p.dx*3.45*dt,p.dy*3.45*dt);if(h)p.face=h>0?1:2}
 collect();
 if((mouse.down||keys.has("Space"))&&p.fire<=0)fire();
 for(const e of foes){if(e.hp<=0)continue;e.flash-=dt;e.strike-=dt;e.attack-=dt;e.walking=false;let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||.01;let speed=e.boss?.66:e.heavy?.72:1.02+.08*round;
 if(e.kind==="medic"&&e.attack<=0){
  let target=null;
  for(const ally of foes){
   if(ally===e||ally.hp<=0||ally.hp>=ally.max||Math.hypot(e.x-ally.x,e.y-ally.y)>2.4||!clearRoute(e.x,e.y,ally.x,ally.y))continue;
   if(!target||ally.hp/ally.max<target.hp/target.max)target=ally
  }
  if(target){target.hp=Math.min(target.max,target.hp+2);target.healTime=.45;e.healTime=.45;e.attack=3}
 }
 e.healTime=Math.max(0,e.healTime-dt);
 if(e.kind==="runner"&&e.chargeTime<=0&&e.telegraph<=0&&e.attack<=0&&d<3&&d>.6&&clearRoute(e.x,e.y,p.x,p.y)){
  e.telegraph=.38;e.rushX=dx/d;e.rushY=dy/d;e.attack=2.7
 }
 if(e.kind==="guard"&&e.armor>0)speed*=.67;
 if(e.chilled>0){e.chilled-=dt;speed*=.45}
 if(e.telegraph>0){e.telegraph-=dt;if(e.telegraph<=0)e.chargeTime=.33}
 else if(e.chargeTime>0){
  e.chargeTime-=dt;const ox=e.x,oy=e.y;moveActor(e,e.rushX*speed*4*dt,e.rushY*speed*4*dt);
  e.gait+=Math.hypot(e.x-ox,e.y-oy)*2.1;e.walking=true
 }
 else if(e.wind>0){e.wind-=dt;if(e.wind<=0){e.strike=.36;for(let i=0;i<12;i++){let a=i*Math.PI/6;shots.push({x:e.x,y:e.y,dx:Math.cos(a)*2.5,dy:Math.sin(a)*2.5,life:2.2,hostile:true})}shake=4;tone(90,40,.3,"square",.03)}}
 else if(e.boss&&e.attack<=0){e.wind=.85;e.attack=3.8}
 else if(e.spitter&&d<5&&e.attack<=0&&clearRoute(e.x,e.y,p.x,p.y)){shots.push({x:e.x,y:e.y,dx:dx/d*3,dy:dy/d*3,life:2.8,hostile:true});e.attack=2;e.strike=.36}
 else if(d>.26&&(!e.spitter||d>2.5||!clearRoute(e.x,e.y,p.x,p.y))){
  const target=guide(e,p),ox=e.x,oy=e.y,ax=target.x-ox,ay=target.y-oy,mag=Math.hypot(ax,ay)||1;
  moveActor(e,ax/mag*speed*dt,ay/mag*speed*dt);
  const stride=Math.hypot(e.x-ox,e.y-oy);e.walking=stride>.0001;e.gait+=stride*(e.heavy||e.boss?1.4:2.1);if(Math.abs(ax-ay)>.05)e.heading=ax-ay>0?1:-1
 }
 if(d<.42&&p.safe<=0){e.strike=.36;damage(e.boss?22:e.heavy?16:10)}if(mode!=="play")break}
 if(mode!=="play"){hud();return}
 for(const b of shots){
 if(b.slot===6){let target=null,d=6;for(const e of foes){const r=Math.hypot(e.x-b.x,e.y-b.y);if(e.hp>0&&r<d&&clearRoute(b.x,b.y,e.x,e.y)){target=e;d=r}}
 if(target&&d>.01){const a=Math.atan2(b.dy,b.dx),goal=Math.atan2(target.y-b.y,target.x-b.x),turn=clamp(Math.atan2(Math.sin(goal-a),Math.cos(goal-a)),-dt*4,dt*4);b.dx=Math.cos(a+turn)*8;b.dy=Math.sin(a+turn)*8}}
 b.x+=b.dx*dt;b.y+=b.dy*dt;b.life-=dt;if(!road(b.x,b.y)){b.life=0;continue}if(b.hostile){if(Math.hypot(b.x-p.x,b.y-p.y)<.34){damage(12);b.life=0}}else {const barrel=barrels.find(o=>o.live&&Math.hypot(o.x-b.x,o.y-b.y)<.28);if(barrel){detonate(barrel);b.life=0;continue}}if(!b.hostile)for(const e of foes){if(e.hp>0&&!b.seen.has(e.id)&&Math.hypot(b.x-e.x,b.y-e.y)<(e.boss?.74:.41)){b.seen.add(e.id);weaponHit(e,b.slot);if(b.slot!==2){b.life=0;break}}}}
 shots=shots.filter(b=>b.life>0&&b.x>min-.5&&b.x<bounds.x+.5&&b.y>min-.5&&b.y<bounds.y+.5);foes=foes.filter(e=>e.hp>0);items=items.filter(i=>{if(p.hp<100&&Math.hypot(i.x-p.x,i.y-p.y)<.55){p.hp=Math.min(100,p.hp+28);tone(440,880,.12,"triangle");return false}return true});
 for(const f of fx){f.life-=dt;f.x+=f.dx*dt;f.y+=f.dy*dt;f.z+=f.vz*dt;f.vz-=250*dt}fx=fx.filter(f=>f.life>0&&f.z>0);for(const r of rings)r.t+=dt;rings=rings.filter(r=>r.t<.45);
 for(const b of blasts)b.t+=dt;blasts=blasts.filter(b=>b.t<.45);spawnIn-=dt;const room=6+round*4-foes.length;
 if(spawned<quota&&room>0&&spawnIn<=0){
  const group=Math.min(round===3?3:2,room,quota-spawned);
  for(let i=0;i<group;i++)spawn();
  spawnIn=round===1?1.1:.95
 }
 if(mode==="play"&&spawned===quota&&foes.length===0){
  if(round<3){
   nextIn+=dt;
   if(nextIn>1.2){
    round++;quota=waveSizes[round-1];spawned=0;spawnIn=0;nextIn=0;
    p.hp=Math.min(100,p.hp+18);p.charge=100
   }
  }else if(cacheCount()===2&&Math.hypot(p.x-48,p.y-24)<2){
   finish(true)
  }
 }
 hud()
}
function freshBarrels(){return [[4,1],[5,1],[9,12],[16,7],[21,24],[30,12],[32,6],[39,0],[48,18],[47,22]].map(([x,y])=>({x,y,live:true}))}
function detonate(b){
 if(!b.live)return;b.live=false;shake=10;blasts.push({x:b.x,y:b.y,t:0});
 for(let i=0;i<48;i++)fx.push({x:b.x,y:b.y,z:rnd(4,18),dx:rnd(-4,4),dy:rnd(-4,4),vz:rnd(30,160),life:rnd(.22,.95),size:rnd(3,9),ink:["#ff6a33","#ffac43","#ffe4a0","#494051"][i%4]});
 for(const e of foes)if(Math.hypot(e.x-b.x,e.y-b.y)<2.5)hit(e,14);
 for(const other of barrels)if(other.live&&Math.hypot(b.x-other.x,b.y-other.y)<1.65)detonate(other);
 tone(120,22,.36,"sawtooth",.11)
}

