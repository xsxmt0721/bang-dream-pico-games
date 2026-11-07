'use strict';
const fs=require('fs'),assert=require('node:assert/strict');
const {Game,obstacleRoll,cells,dimensions,fits}=require('../src/engine');
const {characters,bands}=require('../src/roster');
let seed=20261027;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const saaya=characters.find(c=>c.sourceName==='ppp-saaya');
const label=d=>!d?'none':d.kind==='baguette'?(d.horizontal?'horizontalBaguette':'verticalBaguette'):d.kind;
const counts={cornet:0,horizontalBaguette:0,verticalBaguette:0,parfait:0,none:0};
for(let i=0;i<100000;i++)counts[label(obstacleRoll(saaya,8,random)[0])]++;
const landed={cornet:0,horizontalBaguette:0,verticalBaguette:0,parfait:0,none:0};
for(let i=0;i<3000;i++){
 const g=new Game({characters,bandIds:bands.map(b=>b.id),random,skills:{'ppp-saaya':true}});
 for(let x=0;x<8;x++){const height=Math.floor(random()*7);for(let j=0;j<height;j++)g.pieces.push({id:`s-${x}-${j}`,obstacle:'stone',x,y:10-j});}
 g.active={...saaya,characterId:saaya.id,id:'saaya',x:Math.floor(random()*8),y:-2,horizontal:false,rotation:0};g.status='falling';g.hardDrop();
 const pending=g.pendingObstacles[0];landed[label(pending&&{kind:pending.obstacle,horizontal:pending.horizontal})]++;
 if(pending){
  assert.equal(g.resolveStep().type,'obstacles');const p=g.pieces.find(p=>p.id===pending.id);
  assert.ok(fits(p,g.pieces,8,11));assert.ok(!fits({...p,y:p.y+1},g.pieces,8,11));
  const footprint=g.pieces.flatMap(cells).map(String);assert.equal(new Set(footprint).size,footprint.length);
  assert.equal(cells(p).length,p.obstacle==='cornet'?1:2);
 }
}
const boundaries=[];
for(const roll of [.399999,.4,.549999,.55,.699999,.7,.799999,.8]){
 const values=[roll,.999999];const drop=obstacleRoll(saaya,8,()=>values.shift())[0];boundaries.push({roll,type:label(drop),x:drop?.x,dimensions:drop?dimensions({obstacle:drop.kind,horizontal:drop.horizontal}):null});
}
const report={seed:20261027,rolls:100000,counts,rates:Object.fromEntries(Object.entries(counts).map(([k,v])=>[k,v/1000+'%'])),landingScenarios:3000,landed,boundaries,overlapOrOutOfBoundsFailures:0};
fs.writeFileSync('docs/saaya-simulation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
