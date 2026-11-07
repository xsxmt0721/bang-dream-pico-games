'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {Game,obstacleRoll,clearGroups,cells,fits,bandNumber}=require('../src/engine');
const {characters,guests,bands}=require('../src/roster');
const member=(name,x=0,y=9,extra={})=>({...[...characters,...guests].find(c=>c.sourceName===name),x,y,rotation:0,...extra});
const game=(skills={},random=()=>.9)=>new Game({characters:[...characters,...guests],bandIds:bands.map(b=>b.id),skills,random});
test('Hagumi guaranteed first, 50% second, geometric 20% tail and repeated columns',()=>{
 for(const [rolls,count] of [[[.5],1],[[.4999,0],2],[[0,.7999],2],[[0,.8],3],[[0,.96],4],[[0,.99999],9]]){
  const values=[...rolls];const drops=obstacleRoll(member('hhw-hagumi'),6,()=>values.length?values.shift():0);
  assert.equal(drops.length,count);assert.ok(drops.every(p=>p.kind==='croquette'&&p.x===0));
 }
});
test('cucumber belongs only to Mutsumi, respects 80% and skill switch, and Moka eats it',()=>{
 assert.equal(obstacleRoll(member('am-mutsumi'),8,()=>.7999)[0].kind,'cucumber');assert.equal(obstacleRoll(member('am-mutsumi'),8,()=>.8).length,0);assert.equal(obstacleRoll(member('am-mortis'),8,()=>0).length,0);
 for(const enabled of [true,false]){const g=game({'am-mutsumi':enabled},()=>0);g.active=member('am-mutsumi');g.status='falling';g.lock();assert.equal(g.pendingObstacles.length,enabled?1:0);}
 const g=game();g.active=member('ag-moka',3);g.status='falling';g.pieces=[{id:'cucumber',obstacle:'cucumber',x:0,y:10}];g.lock();assert.equal(g.resolveStep().removed[0].obstacle,'cucumber');
});
test('Kanon reverses only manual horizontal input and rotation, with 30% boundary',()=>{
 const g=game({'hhw-kanon':true},()=>.29999);g.active=member('hhw-kanon',3,4);g.status='falling';assert.ok(g.moveHorizontal(1));assert.equal(g.active.x,2);
 assert.ok(g.rotate());assert.equal(g.active.rotation,3);g.random=()=>.3;assert.ok(g.rotate());assert.equal(g.active.rotation,0);
 assert.ok(g.moveHorizontal(1));assert.equal(g.active.x,3);const y=g.active.y;g.tick();assert.equal(g.active.y,y+1);
 g.skills['hhw-kanon']=false;g.random=()=>0;g.moveHorizontal(-1);assert.equal(g.active.x,2);
});
test('4x8 Chisato retains identity, legal footprint and board-bound rotation',()=>{
 const g=game({'pp-chisato':true},()=>.405);g.difficulty='hard';g.next=g.form(member('pp-chisato'));g.spawn();assert.equal(g.active.scale,4);assert.equal(cells(g.active).length,32);assert.equal(g.active.y,-8);
 g.active.x=0;g.active.y=3;g.width=6;assert.equal(g.rotate(),false);assert.ok(fits(g.active,[],6,11));
});
test('each PAREO color substitutes one specific PP member and remains a RAS member',()=>{
 const names=['pp-aya','pp-hina','pp-chisato','pp-maya','pp-ive'];
 for(const [roll,n]of [[.2,1],[.65,4],[.75,3],[.85,2],[.95,5]]){
  const g=game({'ras-pareo':true},()=>roll);const p=g.form(member('ras-pareo',n-1));assert.equal(p.pareoNumber,n);assert.equal(bandNumber(p,'raise-a-suilen'),4);
  const pieces=names.filter((_,j)=>j!==n-1).map(name=>member(name,names.indexOf(name)));pieces.push(p);
  const result=clearGroups(pieces,['pastel-palettes','raise-a-suilen'],{});assert.equal(result[0].id,'pastel-palettes');assert.equal(result[0].members.length,5);
  const ras=characters.filter(c=>c.bandId==='raise-a-suilen'&&c.number!==4).map(c=>({...c,x:c.number-1,y:9}));ras.push({...p,x:3});assert.equal(clearGroups(ras,['raise-a-suilen'],{})[0].id,'raise-a-suilen');
 }
 assert.equal(game().form(member('ras-pareo')).pareoNumber,undefined);
});
test('PAREO copies cannot substitute missing PP roles and PP clear returns to RAS pool',()=>{
 const g=game({'ras-pareo':true},()=>0),p=g.form(member('ras-pareo',0));g.bandPools.get('raise-a-suilen').delete(p.id);
 const incomplete=[p,{...p,id:'copy',x:1},member('pp-chisato',2),member('pp-maya',3),member('pp-ive',4)];assert.equal(clearGroups(incomplete,['pastel-palettes'],{}).length,0);
 g.pieces=[p,member('pp-hina',1),member('pp-chisato',2),member('pp-maya',3),member('pp-ive',4)];g.status='resolving';assert.equal(g.resolveStep().rules[0],'pastel-palettes');assert.ok(g.bandPools.get('raise-a-suilen').has(p.id));
});
test('Asuka opt-in pool is singleton without refill and supports both bond clears',()=>{
 assert.ok(!game().characters.some(c=>c.guest));const g=game({'toyama-asuka':true},()=>.99999);const asuka=g.choose();assert.equal(asuka.sourceName,'toyama-asuka');g.pieces=[{...asuka,x:7,y:9}];
 for(let i=0;i<60;i++)assert.notEqual(g.choose().sourceName,'toyama-asuka');assert.equal(g.bandPools.get('guest').size,0);
 for(const [id,names]of [['toyama-sisters',['toyama-asuka','ppp-kasumi']],['haneoka-trio',['toyama-asuka','rose-ako','ras-lock']]]){
  g.pieces=names.map((name,i)=>member(name,i));g.status='resolving';g.phase='check';assert.deepEqual(g.resolveStep().rules,[id]);assert.ok(g.bandPools.get('guest').has('guest-asuka'));
 }
 const both=[member('toyama-asuka',0),member('ppp-kasumi',1),member('rose-ako',0,7),member('ras-lock',1,7)];assert.deepEqual(clearGroups(both,g.bandIds,g.skills).map(g=>g.id),['toyama-sisters']);
});

test('Aya family accepts only original or explicitly pink-blue PAREO',()=>{
 const names=['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'];
 for(const color of [undefined,'pink-blue','black-white','green-white','yellow-red','blue-white','purple-white']){
  const pieces=names.map((name,i)=>member(name,i));pieces[4].pareoColor=color;
  const matches=clearGroups(pieces,[],{'aya-family':true});
  assert.equal(matches.length,color===undefined||color==='pink-blue'?1:0,String(color));
 }
});

test('other PAREO colors cannot bridge or be consumed by an Aya family clear',()=>{
 const pieces=['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'].map((name,i)=>member(name,i));
 pieces[4].pareoColor='pink-blue';
 const other={...member('ras-pareo',5),id:'other-pareo',pareoColor:'blue-white'};
 const matches=clearGroups([...pieces,other],[],{'aya-family':true});
 assert.equal(matches[0].members.length,5);assert.ok(!matches[0].members.includes(other));
 pieces[4].x=6;
 assert.equal(clearGroups([...pieces,other],[],{'aya-family':true}).length,0);
});

test('Yukina power saving counts distinct other Roselia members and exact probability boundaries',()=>{
 const names=['rose-sayo','rose-risa','rose-ako','rose-rinko'];
 for(let count=0;count<=4;count++)for(const roll of [0,.249999,.25,.499999,.5,.749999,.75,.99]){
  const g=game({'rose-yukina':true},()=>roll);
  g.pieces=names.slice(0,count).flatMap((name,i)=>[member(name,i),member(name,i,7,{id:name+'-copy'})]);
  g.pieces.push(member('rose-yukina',6),member('pp-hina',7));
  g.next=member('rose-yukina');g.choose=()=>member('pp-aya');
  const probability=[0,0,.25,.5,.75][count];assert.equal(g.powerSavingChance(),probability);
  g.spawn();assert.equal(g.blackout,roll<probability,`count=${count}, roll=${roll}`);
 }
});

test('Yukina blackout is rolled once per spawn and ends on landing, game over or another character',()=>{
 const g=game({'rose-yukina':true},()=>0);g.pieces=[member('rose-sayo',0),member('rose-risa',1)];
 g.next=member('rose-yukina');g.choose=()=>member('pp-aya');g.spawn();assert.equal(g.blackout,true);
 g.random=()=>{throw Error('must not reroll while falling');};g.move(0,4);g.rotate();g.tick();assert.equal(g.blackout,true);
 g.hardDrop();assert.equal(g.blackout,false);g.spawn();assert.equal(g.blackout,false);
 for(const skills of [{},{'rose-yukina':false}]){
  const off=game(skills,()=>0);off.pieces=[member('rose-sayo',0),member('rose-risa',1),member('rose-ako',2),member('rose-rinko',3)];
  off.next=member('rose-yukina');off.choose=()=>member('pp-aya');off.spawn();assert.equal(off.blackout,false);
 }
 const loss=game({'rose-yukina':true},()=>0);loss.pieces=[member('rose-sayo',0),member('rose-risa',1)];loss.next=member('rose-yukina');loss.spawn();assert.equal(loss.blackout,true);loss.lock();assert.equal(loss.status,'gameover');assert.equal(loss.blackout,false);
});

test('Saaya food probabilities and footprints cover each boundary with legal columns',()=>{
 const {dimensions}=require('../src/engine');
 for(const [roll,kind,size,horizontal] of [[0,'cornet',[1,1]],[.39999,'cornet',[1,1]],[.4,'baguette',[2,1],true],[.54999,'baguette',[2,1],true],[.55,'baguette',[1,2],false],[.69999,'baguette',[1,2],false],[.7,'parfait',[1,2]],[.79999,'parfait',[1,2]]]){
  let first=true;const drop=obstacleRoll(member('ppp-saaya'),8,()=>first?(first=false,roll):.99999)[0];
  assert.equal(drop.kind,kind);assert.deepEqual(dimensions({obstacle:kind,horizontal:drop.horizontal}),size);
  assert.equal(drop.x,8-size[0]);if(kind==='baguette')assert.equal(drop.horizontal,horizontal);
 }
 assert.deepEqual(obstacleRoll(member('ppp-saaya'),8,()=>.8),[]);
});

test('two-cell foods land as rigid bodies, respect both columns and clear as one food',()=>{
 const {dimensions,settle,connectedObstacles}=require('../src/engine');
 for(const [kind,horizontal]of [['baguette',true],['baguette',false],['parfait',false]]){
  const g=game();g.status='resolving';g.phase='obstacles';g.pieces=[member('ag-ran',1,9)];
  g.pendingObstacles=[{id:'large-food',obstacle:kind,horizontal,x:0,y:-dimensions({obstacle:kind,horizontal})[1]}];
  assert.equal(g.resolveStep().type,'obstacles');const food=g.pieces[1];assert.equal(food.y,horizontal?8:9);
  assert.equal(new Set(g.pieces.flatMap(cells).map(String)).size,g.pieces.flatMap(cells).length);
  const above=member('ppp-kasumi',0,0);settle([food,above],11);assert.equal(above.y,food.y-2);
  assert.deepEqual(connectedObstacles([food,above],[above]),[food]);
 }
});

test('Moka eats either new food for 200, Rimi only eats cornet',()=>{
 for(const kind of ['baguette','parfait']){
  const food={id:'new-food',obstacle:kind,x:0,y:9};
  const g=game();g.pieces=[food];g.active=member('ag-moka',4);g.status='falling';g.lock();assert.equal(g.resolveStep().points,200);assert.equal(g.pieces.some(p=>p.obstacle),false);
  const h=game();h.pieces=[food];h.active=member('ppp-rimiri',4);h.status='falling';h.lock();assert.equal(h.phase,'check');assert.ok(h.pieces.includes(food));
 }
});

test('Rana replaces a parfait behind blockers, scores once and preserves its exact footprint',()=>{
 const g=game({'mygo-rana':true,bonds:true},()=>0);
 const dessert={id:'dessert',obstacle:'parfait',x:6,y:9};
 g.pieces=[dessert,member('mygo-taki',5),...Array.from({length:8},(_,x)=>({id:'wall-'+x,obstacle:'stone',x,y:5}))];
 g.active=member('mygo-rana',3,-2);g.status='falling';g.tick();
 const rana=g.pieces.find(p=>p.sourceName==='mygo-rana');assert.deepEqual(cells(rana),cells(dessert));assert.equal(g.active,null);
 assert.equal(g.score,210);assert.equal(g.clearedObstacles,1);assert.equal(g.status,'resolving');
 assert.equal(g.resolveStep().type,'bond');assert.equal(g.score,310);assert.equal(g.eatParfait(),false);
});

test('Rana chooses one dessert, ignores other foods and stays controllable without a dessert',()=>{
 for(const enabled of [true,false]){
  const g=game({'mygo-rana':enabled},()=>.9999);g.active=member('mygo-rana',3,2);g.status='falling';
  g.pieces=[{id:'bread',obstacle:'baguette',x:0,y:9}];
  assert.ok(g.moveHorizontal(1));assert.ok(g.rotate());const y=g.active.y;g.softDrop();assert.equal(g.active.y,y+1);g.hardDrop();assert.equal(g.status,'resolving');
 }
 const g=game({'mygo-rana':true},()=>.9999);g.active=member('mygo-rana',3,0);g.status='falling';
 g.pieces=[{id:'a',obstacle:'parfait',x:0,y:9},{id:'b',obstacle:'parfait',x:7,y:9}];g.hardDrop();
 assert.ok(g.pieces.some(p=>p.id==='a'));assert.ok(!g.pieces.some(p=>p.id==='b'));assert.equal(g.pieces.find(p=>p.sourceName==='mygo-rana').x,7);
 const off=game({'mygo-rana':false});off.active=member('mygo-rana',3,0);off.status='falling';off.pieces=[{id:'a',obstacle:'parfait',x:0,y:9}];off.tick();assert.equal(off.active.y,1);assert.equal(off.clearedObstacles,0);
 const skills=require('../src/roster').skills;for(const name of ['mygo-rana','rose-yukina'])assert.equal(skills.find(s=>s.sourceName===name).defaultEnabled,false);
});

test('CHUCHU and Tsukushi mini forms have independent 30% boundaries and preserve identity',()=>{
 const {dimensions}=require('../src/engine');
 for(const name of ['ras-chuchu','mor-tsukushi']){
  for(const roll of [0,.299999,.3,.999]){
   const g=game({[name]:true},()=>roll),source=member(name),form=g.form(source);
   assert.equal(!!form.mini,roll<.3);assert.deepEqual(dimensions(form),roll<.3?[1,1]:[1,2]);
   assert.equal(form.id,source.id);assert.equal(form.sourceName,name);assert.equal(form.number,source.number);
   assert.equal(form.image,roll<.3?`assets/characters/front/${name}-mini.png`:source.image);
  }
  const disabled=game({[name]:false},()=>0);assert.equal(disabled.form(member(name)).mini,undefined);
  assert.equal(game({},()=>0).form(member(name)).mini,undefined);
 }
 const g=game({'ras-chuchu':true,'mor-tsukushi':true},()=>0);assert.equal(g.form(member('ras-chuchu')).mini,true);g.random=()=>.3;assert.equal(g.form(member('mor-tsukushi')).mini,false);
});

test('mini bodies rotate in a single cell, fit one-cell gaps, land at the floor and retain clear membership',()=>{
 const {dimensions,ends}=require('../src/engine');
 for(const name of ['ras-chuchu','mor-tsukushi']){
  const g=game({[name]:true},()=>0);g.next=g.form(member(name));g.spawn();assert.equal(g.active.y,-1);
  g.active.x=7;g.active.y=10;const footprint=cells(g.active);
  g.pieces=[{id:'left',obstacle:'stone',x:6,y:10},{id:'above',obstacle:'stone',x:7,y:9}];
  for(let i=0;i<4;i++){assert.ok(g.rotate());assert.deepEqual(cells(g.active),footprint);assert.deepEqual(ends(g.active),[[7,10],[7,10]]);}
  assert.deepEqual(dimensions(g.active),[1,1]);g.tick();assert.equal(g.status,'resolving');
  const mini=g.pieces.find(p=>p.sourceName===name);assert.equal(mini.y,10);
  const band=mini.bandId,cast=characters.filter(c=>c.bandId===band).map((c,i)=>({...c,id:'team-'+i,x:i,y:10,mini:true}));
  assert.equal(clearGroups(cast,[band])[0].members.length,5);
 }
});


test('PAREO weighted boundaries and RAS-only black-white',()=>{
 const ranges=[[0,.4,'pink-blue',1],[.4,.6,'black-white',null],[.6,.7,'green-white',4],[.7,.8,'yellow-red',3],[.8,.9,'blue-white',2],[.9,1,'purple-white',5]];
 for(const [lo,hi,color,number] of ranges)for(const roll of [lo,hi-1e-9]){
  const p=game({'ras-pareo':true},()=>roll).form(member('ras-pareo'));
  assert.equal(p.pareoColor,color);assert.equal(bandNumber(p,'pastel-palettes'),number);assert.equal(bandNumber(p,'raise-a-suilen'),4);
 }
 const p=game({'ras-pareo':true},()=>.5).form(member('ras-pareo',4));
 const pp=['pp-aya','pp-hina','pp-chisato','pp-maya'].map((name,i)=>member(name,i));
 assert.equal(clearGroups([...pp,p],['pastel-palettes'],{}).length,0);
 const ras=characters.filter(c=>c.bandId==='raise-a-suilen'&&c.number!==4).map((c,i)=>({...c,x:i,y:9}));
 assert.equal(clearGroups([...ras,p],['raise-a-suilen'],{})[0].members.length,5);
 const complete=[...pp,member('pp-ive',5)];
 assert.equal(clearGroups([...complete,p],['pastel-palettes'],{}).length,0,'black-white cannot bridge PP');
 complete[4].x=4;p.x=5;
 assert.equal(clearGroups([...complete,p],['pastel-palettes'],{})[0].members.includes(p),false);
});
