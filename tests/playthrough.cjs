const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const ui={getContext:()=>({}),querySelector:()=>({})};const c=vm.createContext({W:48,H:22,document:{querySelector:()=>ui},Image:class{}});vm.runInContext(fs.readFileSync('game/game.js','utf8'),c);
const result=vm.runInContext(`
reset();mode="play";let targets=[[0,12],[8,12],[32,12],[32,5],[32,12],[48,12],[48,24]],route=0,gunsUsed=new Set(),walking=false;
for(let frame=0;frame<30000&&mode==="play";frame++){
 keys.clear();keys.add("Space");let goal=targets[route];
 if(goal){
  let dx=goal[0]-player.x,dy=goal[1]-player.y;
  if(Math.abs(dx)<.08&&Math.abs(dy)<.08)route++;
  else if(Math.abs(dx)>.07){keys.add(dx>0?"KeyD":"KeyA");keys.add(dx>0?"KeyS":"KeyW")}
  else{keys.add(dy>0?"KeyA":"KeyD");keys.add(dy>0?"KeyS":"KeyW")}
 }
 if(foes.some(e=>Math.hypot(e.x-player.x,e.y-player.y)<2))pulse();
 gunsUsed.add(player.slot);step(1/60);
 walking ||=foes.some(e=>e.gait>1);
 if(!road(player.x,player.y))throw Error("left road");
}
;({mode,kills,route,owned:player.owned,gunsUsed:[...gunsUsed],walking,remaining:foes.map(e=>[e.x,e.y]),hp:player.hp})
`,c);console.log(result);assert.equal(result.mode,'win');assert.equal(result.route,7);assert.equal(result.kills,96);assert.equal(result.gunsUsed.length,3);assert(result.walking);
