const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const ui={getContext:()=>({}),querySelector:()=>({})};const c=vm.createContext({W:48,H:22,document:{querySelector:()=>ui},Image:class{}});vm.runInContext(fs.readFileSync('game/game.js','utf8'),c);
const result=vm.runInContext(`
reset();mode="play";let targets=[[0,12],[8,12],[32,12],[32,5],[32,12],[48,12],[48,24]],route=0,gunsUsed=new Set(),walking=false,depotStarted=false,waitFrames=0;
for(let frame=0;frame<30000&&mode==="play";frame++){
 if(locationId===2&&!depotStarted){
  depotStarted=true;route=0;targets=[[6,9],[6,2],[18,2],[19,2],[19,16],[18,16],[19,16],[19,9],[26,9]];
  if(player.owned.length!==3||kills!==96||road(12,9))throw Error("Invalid depot entry");
 }
 keys.clear();keys.add("Space");let goal=targets[route];
 if(goal){
  let dx=goal[0]-player.x,dy=goal[1]-player.y;
  if(Math.abs(dx)<.08&&Math.abs(dy)<.08){
   if(depotStarted&&(route===2||route===5)&&waitFrames++<66){}else{waitFrames=0;route++}
  }
  else if(Math.abs(dx)>.07){keys.add(dx>0?"KeyD":"KeyA");keys.add(dx>0?"KeyS":"KeyW")}
  else{keys.add(dy>0?"KeyA":"KeyD");keys.add(dy>0?"KeyS":"KeyW")}
 }
 if(foes.some(e=>Math.hypot(e.x-player.x,e.y-player.y)<2))pulse();
 gunsUsed.add(player.slot);step(1/60);
 walking ||=foes.some(e=>e.gait>1);
 if(!road(player.x,player.y))throw Error("left road");
}
;({mode,kills,locationId,drained:drained(),route,owned:player.owned,gunsUsed:[...gunsUsed],walking,remaining:foes.map(e=>[e.x,e.y]),hp:player.hp})
`,c);console.log(result);assert.equal(result.mode,'win');assert.equal(result.locationId,2);assert(result.drained);assert(result.kills>=96);assert.equal(result.gunsUsed.length,3);assert(result.walking);
