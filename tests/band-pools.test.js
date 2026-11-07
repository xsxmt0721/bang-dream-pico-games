'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game}=require('../src/engine'),{characters,bands}=require('../src/roster');
const make=(ids=bands.map(b=>b.id),random=()=>0)=>new Game({characters,bandIds:ids,random});
const member=(s,x=0,y=9,suffix='')=>({...characters.find(c=>c.sourceName===s),characterId:characters.find(c=>c.sourceName===s).id,id:s+suffix,x,y,rotation:0});
test('exhausted band replenishes independently while other bands remain full',()=>{
 const g=make(['poppin-party','afterglow']);const first=Array.from({length:5},()=>g.choose());g.pieces=first.map((c,i)=>({...c,x:i,y:9}));
 assert.equal(g.bandPools.get('afterglow').size,5);assert.equal(g.bandPools.get('poppin-party').size,0);
 assert.equal(g.choose().characterId,first[0].characterId);assert.equal(g.bandPools.get('afterglow').size,5);
});
test('partial return prevents refill and remaining board/NEXT copies do not return',()=>{
 const g=make(['poppin-party']);g.bandPools.get('poppin-party').clear();
 const cast=characters.filter(c=>c.bandId==='poppin-party');g.pieces=cast.map((c,i)=>({...c,id:'clear-'+i,characterId:c.id,x:i,y:9}));
 g.pieces.push({...cast[0],id:'survivor',characterId:cast[0].id,x:7,y:9});g.next={...cast[1],id:'preview',characterId:cast[1].id};g.status='resolving';
 assert.equal(g.resolveStep().type,'clear');assert.deepEqual([...g.bandPools.get('poppin-party')],cast.slice(2).map(c=>c.id));
 assert.equal(g.choose().characterId,cast[2].id);assert.ok(!g.pool.has(cast[0].id));assert.ok(!g.pool.has(cast[1].id));
});
test('weighted band draw gives each available identity one equal interval',()=>{
 const hits=[];for(let i=0;i<6;i++){
  const g=make(['poppin-party','afterglow'],()=>(i+.5)/6);g.bandPools.set('poppin-party',new Set(['poppin-party-1']));hits.push(g.choose().characterId);
 }
 assert.equal(new Set(hits).size,6);assert.equal(hits.filter(id=>id.startsWith('afterglow')).length,5);
});
test('CRYCHIC returns absent members to both original pools and leaves unrelated pools alone',()=>{
 const g=make();for(const pool of g.bandPools.values())pool.clear();
 const names=['am-sakiko','am-mutsumi','mygo-taki','mygo-soyo','mygo-tomori'];g.pieces=names.map((s,i)=>member(s,i));
 g.pieces.push({...member('am-mutsumi',7,9,'-mortis'),sourceName:'am-mortis'});g.status='resolving';
 assert.deepEqual(g.resolveStep().rules,['crychic']);assert.equal(g.bandPools.get('mygo').size,5);assert.equal(g.bandPools.get('ave-mujica').size,4);
 assert.ok(!g.pool.has('ave-mujica-2'));assert.equal(g.bandPools.get('sumimi').size,0);assert.equal(g.bandPools.get('afterglow').size,0);
});
test('with Mujica enabled sumimi contains only Mana and never resets',()=>{
 const g=make(['ave-mujica','sumimi'],()=>.9999);assert.deepEqual([...g.bandPools.get('sumimi')],['sumimi-2']);
 const mana=g.choose();assert.equal(mana.sourceName,'smm-mana');g.pieces=[{...mana,x:0,y:9}];
 for(let i=0;i<15;i++)assert.notEqual(g.choose().sourceName,'smm-mana');assert.equal(g.bandPools.get('sumimi').size,0);
 g.pieces.push(member('am-uika',1));g.status='resolving';assert.deepEqual(g.resolveStep().rules,['sumimi']);assert.ok(g.pool.has('sumimi-2'));assert.ok(g.pool.has('ave-mujica-1'));
});
test('sumimi-only puts Uika and Mana in one pool and refills both when exhausted',()=>{
 const g=make(['sumimi'],()=>0);assert.equal(g.bandPools.has('ave-mujica'),false);assert.deepEqual([...g.bandPools.get('sumimi')],['ave-mujica-1','sumimi-2']);
 const first=[g.choose(),g.choose()];assert.deepEqual(first.map(c=>c.sourceName),['am-uika','smm-mana']);assert.equal(g.pool.size,0);
 g.pieces=first.map((c,i)=>({...c,x:i*7,y:9}));const second=[g.choose(),g.choose()];assert.deepEqual(second.map(c=>c.characterId),first.map(c=>c.characterId));
});
test('shared forms still prevent early return while the alternate form remains',()=>{
 for(const [band,source,alternate] of [['ave-mujica','am-mutsumi','am-mortis'],['hello-happy-world','hhw-michelle','hhw-misaki']]){
  const g=make([band]);g.bandPools.get(band).clear();const c=member(source);g.pieces=[{...c,id:'copy',sourceName:alternate}];g.returnToPool([c]);assert.ok(!g.pool.has(c.characterId));
 }
});
