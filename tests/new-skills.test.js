'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,cells,dimensions,ends,fits,settle,clearGroups}=require('../src/engine');
const {characters,bands,skills}=require('../src/roster');
const member=(name,x=0,y=0)=>({...characters.find(c=>c.sourceName===name),x,y,rotation:0,horizontal:false});
const game=(settings={},random=()=>0)=>new Game({characters,bandIds:bands.map(b=>b.id),skills:settings,random});
test('three new skills default off in UI and engine; Chisato disjoint probability boundaries',()=>{
 for(const name of ['pp-chisato','pp-hina','rose-sayo']){
  assert.equal(skills.find(s=>s.sourceName===name).defaultEnabled,false);assert.equal(game().skill(member(name)),false);
 }
 for(const [roll,scale] of [[0,2],[.23999,2],[.24,3],[.28999,3],[.29,1],[.29999,1],[.3,1],[.999,1]]){
  const g=game({'pp-chisato':true},()=>roll),p=g.form(member('pp-chisato'));
  assert.equal(p.scale,scale);assert.equal(cells(p).length,2*scale*scale);
 }
 assert.equal(game().form(member('pp-chisato')).scale,undefined);
});
test('giant spawn, four rotations, boundaries, support and distinct membership',()=>{
 const g=game({'pp-chisato':true},()=>.26);
 g.next=g.form(member('pp-chisato'));g.spawn();assert.equal(g.active.y,-6);
 g.width=20;g.height=20;g.active.x=8;g.active.y=8;const original={...g.active};
 for(let i=0;i<4;i++){const head=ends(g.active)[0];assert.ok(g.rotate());assert.deepEqual(ends(g.active)[0],head);assert.equal(cells(g.active).length,18);}
 assert.deepEqual(g.active,original);
 assert.equal(fits({...g.active,x:7},[],8,11),false);
 const giant={...original,x:0,y:0},support={id:'stone',obstacle:'stone',x:2,y:10};settle([giant,support],11);assert.equal(giant.y,4);
 assert.equal(clearGroups([giant],g.bandIds,{}).length,0);
});
test('Sayo floats once, supports stacks, clears normally, and releases supported pieces',()=>{
 const g=game({'rose-sayo':true});g.active=member('rose-sayo',2,5);g.status='falling';assert.ok(g.float());
 const sayo=g.pieces[0],above=member('ag-ran',2,0);g.pieces.push(above);settle(g.pieces,11);
 assert.equal(sayo.y,5);assert.equal(above.y,3);assert.equal(g.float(),false);
 g.pieces.push(...['rose-yukina','rose-risa','rose-ako','rose-rinko'].map((s,i)=>member(s,i<2?i:i+1,5)));
 assert.equal(g.resolveStep().type,'clear');assert.ok(!g.pieces.includes(sayo));g.resolveStep();assert.equal(above.y,9);
 const off=game();off.active=member('rose-sayo',2,5);off.status='falling';assert.equal(off.float(),false);
 const top=game({'rose-sayo':true});top.active=member('rose-sayo',2,-1);top.status='falling';top.float();assert.equal(top.status,'gameover');
});
test('Hina joins isolated teammates, continues same fall, and can fire only once',()=>{
 const g=game({'pp-hina':true});const target={...member('rose-sayo',2,5),floating:true};
 g.pieces=[target,member('rose-rinko',6,9),{id:'stone',obstacle:'stone',x:0,y:10}];g.active=member('pp-hina',4,2);g.status='falling';
 assert.ok(g.fireBeam());assert.equal(g.status,'falling');assert.equal(target.y,5);g.tick();assert.equal(g.active.y,3);
 assert.ok(g.finishBeam());assert.ok(g.connectedToTeam(target));assert.ok(target.floating);
 while(g.status==='resolving')g.resolveStep();assert.equal(g.active.sourceName,'pp-hina');assert.equal(g.active.y,3);assert.equal(g.fireBeam(),false);
});
test('Hina probability boundary, repeated attempts, landing, no isolated teammate/no room',()=>{
 const g=game({'pp-hina':true},()=>.15);g.pieces=[member('ag-ran',0,9),member('ag-moka',6,9)];g.active=member('pp-hina',3,2);g.status='falling';
 assert.equal(g.fireBeam(),false);assert.ok(!g.active.beamUsed);g.random=()=>.14999;assert.ok(g.fireBeam());
 for(const connected of [true,false]){
  const h=game({'pp-hina':true});h.active=member('pp-hina',3,2);h.status='falling';
  h.pieces=connected?[member('ag-ran',0,9),member('ag-moka',1,9)]:[member('ag-ran',0,9)];assert.equal(h.fireBeam(),false);
  h.lock();assert.equal(h.phase,'check');
 }
 const h=game({'pp-hina':true});h.active=member('pp-hina',3,-2);h.status='falling';
 h.pieces=[member('ag-ran',0,9),member('ag-moka',7,9)];
 for(let y=0;y<11;y++)for(let x=0;x<8;x++)if(!((x===0||x===7)&&y>=9))h.pieces.push({id:`r-${x}-${y}`,obstacle:'stone',x,y});
 assert.equal(h.fireBeam(),false);
});
test('Tomori clears every stone with MyGO or CRYCHIC, including distant stones',()=>{
 for(const names of [['mygo-tomori','mygo-anon','mygo-rana','mygo-soyo','mygo-taki'],['am-sakiko','am-mutsumi','mygo-taki','mygo-soyo','mygo-tomori']]){
  const g=game();g.pieces=names.map((n,i)=>member(n,i,9));g.pieces.push({id:'s1',obstacle:'stone',x:7,y:10},{id:'s2',obstacle:'stone',x:7,y:9});
  g.status='resolving';const e=g.resolveStep();assert.equal(e.obstacles,2);assert.equal(e.points,1400);assert.ok(!g.pieces.some(p=>p.obstacle==='stone'));
 }
});
test('Mortis clearing Tomori also removes all stones without awarding points',()=>{
 const g=game({'am-mortis':true});g.active={...member('am-mutsumi',0,9),sourceName:'am-mortis'};g.pieces=[member('mygo-tomori',0,7),{id:'s',obstacle:'stone',x:7,y:10}];g.lock();
 assert.equal(g.resolveStep().points,0);assert.equal(g.pieces.length,0);
});
test('trapped head-up Mashiro locks normally even when both rotations are blocked',()=>{
 const g=game();g.active=member('mor-mashiro',3,9);g.status='falling';
 g.pieces=[member('ag-ran',2,9),member('ag-moka',4,9)];
 assert.equal(g.rotate('head',1),false);assert.equal(g.rotate('head',-1),false);
 g.tick();assert.equal(g.active,null);assert.equal(g.status,'resolving');
 assert.ok(g.pieces.some(p=>p.sourceName==='mor-mashiro'));assert.equal(g.score,10);
});

test('landing stops Q/E attempts while an existing projectile finishes safely',()=>{
 const g=game({'pp-hina':true});g.pieces=[member('ag-ran',0,9),member('ag-moka',7,9)];g.active=member('pp-hina',3,7);g.status='falling';assert.ok(g.fireBeam());
 g.hardDrop();let rolls=0;g.random=()=>{rolls++;return 0;};assert.equal(g.fireBeam(),false);assert.equal(rolls,0);assert.equal(g.resolveStep(),null);
 assert.ok(g.finishBeam());assert.equal(g.resolveStep().type,'gravity');
 const h=game({'pp-hina':true});h.active=member('pp-hina',3,9);h.status='falling';h.lock();h.random=()=>{throw Error('must not roll after landing');};assert.equal(h.fireBeam(),false);
});
test('beam destination is revalidated against the moving active character',()=>{
 const g=game({'pp-hina':true});g.pieces=[member('ag-ran',0,9),member('ag-moka',7,9)];g.active=member('pp-hina',3,2);g.status='falling';assert.ok(g.fireBeam());
 Object.assign(g.active,g.beam.destination);assert.ok(g.finishBeam());assert.ok(fits(g.active,g.pieces,8,11));
});
