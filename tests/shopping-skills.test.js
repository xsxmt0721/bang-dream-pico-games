const test=require('node:test'),assert=require('node:assert/strict');
const {Game,cells,fits,obstacleRoll,connectedObstacles,settle}=require('../src/engine');
const {characters,bands,skills}=require('../src/roster');
const char=n=>characters.find(c=>c.sourceName===n);
const game=(difficulty='easy',random=()=>0)=>new Game({characters,bandIds:bands.map(b=>b.id),difficulty,random,skills:{'am-umiri':true,'pp-chisato':true}});
const sequence=values=>()=>values.shift()??0;
test('Taki independent events allow both, neither, coffee alone and parfait alone',()=>{
 for(const [a,b,kinds] of [[.1,.1,['coffee','parfait']],[.9,.9,[]],[.1,.9,['coffee']],[.9,.1,['parfait']]])assert.deepEqual(obstacleRoll(char('mygo-taki'),8,sequence([a,b])).map(p=>p.kind),kinds);
 assert.deepEqual(obstacleRoll(char('mygo-taki'),8,sequence([.1,.29,.49]),[],'hard').map(p=>p.kind),['coffee','coffee','parfait']);
});
test('shopping defaults off and shape leaves bottom corners available, cannot rotate',()=>{
 assert.equal(skills.find(s=>s.sourceName==='am-umiri').defaultEnabled,false);
 for(const n of ['am-sakiko','mygo-taki'])assert.notEqual(skills.find(s=>s.sourceName===n).defaultEnabled,false);
 const g=game(),p={...g.form(char('am-umiri')),id:'u',x:2,y:3};
 assert.deepEqual(cells(p),[[2,3],[3,3],[4,3],[3,4]]);
 assert.equal(fits({id:'o',obstacle:'stone',x:2,y:4},[p],8,11),true);
 g.active=p;g.status='falling';assert.equal(g.rotate(),false);
 g.pieces=[];g.leaveShoppingBags([p]);assert.equal(g.pieces.length,2);assert.ok(g.pieces.every(p=>p.obstacle==='shopping-bag'));settle(g.pieces,11);assert.ok(g.pieces.every(p=>p.y===10));
 assert.equal(connectedObstacles([...g.pieces,{id:'c',x:3,y:9}], [{id:'c',x:3,y:9}]).length,2);
});
test('shopping and giant thresholds differ by difficulty',()=>{
 for(const [d,edge] of [['easy',.15],['hard',.3]]){assert.equal(game(d,()=>edge-.001).form(char('am-umiri')).shopping,true);assert.equal(game(d,()=>edge).form(char('am-umiri')).shopping,undefined);}
 for(const [roll,size] of [[.319,2],[.32,3],[.399,3],[.4,4],[.40999,4],[.41,1],[.42,1]])assert.equal(game('hard',()=>roll).form(char('pp-chisato')).scale,size);
});
test('Sakiko eats one food only, respects chance and never eats shopping bags',()=>{
 for(const [difficulty,roll,eats] of [['easy',.49,true],['easy',.5,false],['hard',.99,true]]){
  const g=game(difficulty,()=>roll);g.active={...char('am-sakiko'),id:'s',x:5,y:9};g.status='falling';
  g.pieces=[{id:'bag',obstacle:'shopping-bag',x:0,y:10},{id:'food',obstacle:'coffee',x:1,y:10},{id:'food2',obstacle:'cornet',x:2,y:10}];g.lock();
  assert.equal(g.phase==='skill',eats);if(eats){const e=g.resolveStep();assert.equal(e.removed.length,1);assert.notEqual(e.removed[0].obstacle,'shopping-bag');assert.equal(g.phase,'gravity');assert.equal(g.pieces.filter(p=>p.obstacle).length,2);}
 }
});
test('each shopping bag uses an independent difficulty-specific roll',()=>{
 for(const [d,rolls] of [['easy',[.49,.5]],['hard',[.79,.8]]]){const g=game(d,sequence(rolls));g.leaveShoppingBags([{shopping:true,x:2,y:4}]);assert.deepEqual(g.pieces.map(p=>[p.x,p.y]),[[2,4]]);}
});

test('Rana and parfaits pair one-to-one and each individual eats only once',()=>{
 for(const [cats,desserts] of [[3,2],[2,3],[2,2]]){
  const g=game();g.skills['mygo-rana']=true;g.status='resolving';g.phase='parfait-arrived';
  g.pieces=[...Array.from({length:cats},(_,i)=>({...char('mygo-rana'),id:'cat'+i,x:i,y:9})),...Array.from({length:desserts},(_,i)=>({id:'p'+i,obstacle:'parfait',x:i+4,y:9}))];
  g.resolveStep();const count=Math.min(cats,desserts);assert.equal(g.clearedObstacles,count);assert.equal(g.pieces.filter(p=>p.ateParfait).length,count);assert.equal(g.pieces.filter(p=>p.obstacle==='parfait').length,desserts-count);
  const fed=g.pieces.filter(p=>p.ateParfait).map(p=>[p.id,p.x,p.y]);g.pieces.push({id:'later',obstacle:'parfait',x:7,y:9});g.phase='parfait-arrived';g.resolveStep();
  for(const [id,x,y] of fed){const p=g.pieces.find(p=>p.id===id);assert.deepEqual([p.x,p.y],[x,y]);}
 }
});
test('active Rana retains the consumed flag after landing and ignores later parfaits',()=>{
 const g=game();g.skills['mygo-rana']=true;g.status='falling';g.active={...char('mygo-rana'),id:'cat',x:0,y:0};g.pieces=[{id:'p',obstacle:'parfait',x:4,y:9}];
 assert.equal(g.eatParfait(),true);assert.equal(g.pieces.find(p=>p.id==='cat').ateParfait,true);
 g.pieces.push({id:'later',obstacle:'parfait',x:7,y:9});g.phase='parfait-arrived';g.resolveStep();assert.equal(g.clearedObstacles,1);assert.ok(g.pieces.some(p=>p.id==='later'));
});
