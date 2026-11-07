'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,clearGroups,ends}=require('../src/engine');
const {characters,bands,skills}=require('../src/roster');
const bonds=require('../src/bonds');
const p=(sourceName,x,y=9,id=sourceName)=>({...characters.find(c=>c.sourceName===sourceName),sourceName,id,x,y,rotation:0});
const game=(random=()=>.9)=>new Game({characters,bandIds:bands.map(b=>b.id),skills:{bonds:true},random});
test('every listed pair pays its exact score without clearing and never repeats',()=>{
 for(const rule of bonds.filter(r=>!r.triple))for(const name of [].concat(rule.b)){
  const g=game();g.pieces=[p(rule.a,0),p(name,1)];
  assert.equal(g.scoreBonds().points,rule.points,rule.name);assert.equal(g.pieces.length,2);assert.equal(g.chain,0);assert.equal(g.scoreBonds(),null);
 }
});
test('negative branch boundary, switch, diagonal and indirect contacts',()=>{
 const g=game(()=>.1999);g.pieces=[p('hhw-kaoru',0),p('pp-chisato',1)];assert.equal(g.scoreBonds().points,-100);assert.equal(g.score,-100);
 const h=game(()=>.2);h.pieces=g.pieces;assert.equal(h.scoreBonds().points,100);
 for(const [x,y]of [[1,7],[2,9]]){const h=game();h.pieces=[p('ppp-kasumi',0),p('ppp-arisa',x,y),p('ppp-otae',1,9)];assert.equal(h.scoreBonds(),null);}
 const off=game();off.skills.bonds=false;off.pieces=[p('ppp-kasumi',0),p('ppp-arisa',1)];assert.equal(off.scoreBonds(),null);
});
test('sandwich requires the same Tsugumi touching both twins; distinct copies score separately',()=>{
 const g=game();g.pieces=[p('ag-tsugumi',1),p('pp-hina',0),p('rose-sayo',2)];assert.equal(g.scoreBonds().points,100);
 const h=game();h.pieces=[p('ag-tsugumi',0),p('pp-hina',1),p('rose-sayo',2)];assert.equal(h.scoreBonds().points,300);
 const k=game();k.pieces=[p('ppp-kasumi',1),p('ppp-arisa',0),p('ppp-arisa',2,9,'copy')];assert.equal(k.scoreBonds().points,400);
});
test('bonds precede normal clears and Mortis removal; gravity can form new bonds',()=>{
 const g=game();g.pieces=characters.filter(c=>c.bandId==='poppin-party').map((c,i)=>({...c,x:i,y:9}));g.status='resolving';
 assert.equal(g.resolveStep().type,'bond');assert.equal(g.resolveStep().type,'clear');
 const h=game(()=>0);h.pieces=[p('am-nyamu',0)];h.active=p('am-mortis',1);h.status='falling';h.lock();assert.equal(h.resolveStep().points,100);assert.equal(h.resolveStep().skill,'全都不会弹');
 const k=game();k.pieces=[p('ppp-kasumi',0),p('ppp-arisa',1,0)];k.status='resolving';k.phase='gravity';assert.equal(k.resolveStep().type,'gravity');assert.equal(k.resolveStep().type,'bond');
});
test('RAS beats PP for a shared PAREO regardless of configured band order',()=>{
 const pieces=[p('ras-pareo',4),...['ras-layer','ras-lock','ras-masking','ras-chuchu'].map((n,i)=>p(n,i)),...['pp-hina','pp-chisato','pp-maya','pp-ive'].map((n,i)=>p(n,i+5))];pieces[0].pareoNumber=1;
 for(const ids of [['pastel-palettes','raise-a-suilen'],['raise-a-suilen','pastel-palettes']])assert.deepEqual(clearGroups(pieces,ids).map(r=>r.id),['raise-a-suilen']);
});
test('both head rotations retain anchor and settings expose qualitative and detailed descriptions',()=>{
 const g=game();g.active=p('pp-hina',3,4);g.status='falling';const head=ends(g.active)[0];g.rotate('head',1);assert.deepEqual(ends(g.active)[0],head);assert.equal(g.active.rotation,1);g.rotate('head',-1);assert.equal(g.active.rotation,0);
 assert.ok(skills.every(s=>s.summary&&s.description));assert.equal(skills.find(s=>s.sourceName==='bonds').defaultEnabled,false);
});
