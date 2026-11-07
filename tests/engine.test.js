'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Game, cells, fits, connectedGroups, connectedObstacles, obstacleRoll, settle, gravityStep } = require('../src/engine.js');
const { characters, bands } = require('../src/roster.js');
const piece = (number, x, y, bandId = 'a', extra = {}) => ({ id: `${bandId}-${number}`, bandId, number, x, y, horizontal: false, ...extra });
const cast = ['a', 'b'].flatMap(bandId => [1, 2, 3, 4, 5].map(number => ({ id: `${bandId}-${number}`, number, bandId })));
const makeGame = options => new Game({ width: 10, height: 12, bandIds: ['a', 'b'], characters: cast, random: () => 0, ...options });

test('roster: ten bands share Uika, 46 identities, only Michelle occupies 2 x 2', () => {
  assert.equal(bands.length, 10); assert.equal(characters.length, 46);
  assert.equal(new Set(characters.map(c => c.id)).size, 46);
  for (const b of bands) assert.deepEqual(characters.filter(c => c.bandNumbers[b.id] != null).map(c => c.bandNumbers[b.id]), b.id === 'sumimi' ? [1,2] : [1, 2, 3, 4, 5]);
  assert.deepEqual(characters.filter(c => c.square).map(c => c.sourceName), ['hhw-michelle']);
  for (const c of characters) assert.ok(require('node:fs').existsSync(require('node:path').join(__dirname, '..', c.image)), c.image);
});
test('invalid dimensions and empty band selections are rejected', () => {
  assert.throws(() => makeGame({ width: 3 })); assert.throws(() => makeGame({ height: 6.5 })); assert.throws(() => makeGame({ bandIds: [] }));
});
test('production board defaults to 8 columns and 11 rows', () => {
  const game = new Game({ characters, bandIds: [bands[0].id] });
  assert.equal(game.width, 8); assert.equal(game.height, 11);
});
test('coffee probabilities have disjoint 50% one-lane and 30% two-lane ranges', () => {
  const character = { sourceName: 'ag-tsugumi' };
  for (const [roll, count] of [[0,1],[.49999,1],[.5,2],[.79999,2],[.8,0],[.9999,0]]) {
    const values = [roll, .5, .5];
    const drops = obstacleRoll(character, 8, () => values.shift());
    assert.equal(drops.length, count); assert.equal(new Set(drops.map(d=>d.x)).size, count);
    assert.ok(drops.every(d=>d.kind==='coffee' && d.x>=0 && d.x<8));
  }
});
test('bread and cucumber trigger below 80%; other members never trigger', () => {
  for (const [sourceName, kind] of [['ppp-saaya','parfait'],['am-mutsumi','cucumber']]) {
    assert.equal(obstacleRoll({sourceName},8,()=>.79999)[0].kind,kind);
    assert.equal(obstacleRoll({sourceName},8,()=>.8).length,0);
  }
  assert.deepEqual(obstacleRoll({sourceName:'ppp-kasumi'},8,()=>{throw Error('Unexpected roll');}),[]);
});
const food = (id, x, y, obstacle = 'coffee') => ({id:`food-${id}`,x,y,obstacle});
test('obstacles occupy one cell and provide rigid support', () => {
  const coffee=food(1,2,10), domino=piece(1,2,0);
  assert.deepEqual(cells(coffee),[[2,10]]); settle([coffee,domino],11);
  assert.equal(domino.y,8); assert.equal(fits({...domino,y:9},[coffee],8,11),false);
});
test('food chains clear orthogonally, but diagonals and other-band bridges do not', () => {
  const members=[1,2,3,4,5].map((n,i)=>piece(n,i,9));
  const adjacent=[food(1,0,8),food(2,0,7),food(3,1,7)];
  const disconnected=[food(4,2,6),food(5,7,9)];
  const blocker=piece(1,6,9,'b');
  const result=connectedObstacles([...members,...adjacent,...disconnected,blocker],members);
  assert.deepEqual(new Set(result.map(p=>p.id)),new Set(adjacent.map(p=>p.id)));
});
test('food cannot connect otherwise separated band members', () => {
  const pieces=[piece(1,0,9),piece(2,1,9),piece(3,3,9),piece(4,4,9),piece(5,5,9),food(1,2,9)];
  assert.equal(connectedGroups(pieces).length,0);
});
test('obstacles award one bonus each, including shared adjacency', () => {
  const game=makeGame(); game.pieces=[...['a','b'].flatMap((b,i)=>[1,2,3,4,5].map((n,x)=>piece(n,x,7+i*3,b))),food(1,0,9)]; game.status='resolving';
  const event=game.resolveStep(); assert.equal(event.groups,2); assert.equal(event.obstacles,1);
  assert.equal(event.obstaclePoints,200); assert.equal(event.points,2200); assert.equal(game.clearedObstacles,1);
});
test('triggered food falls before clear, cannot be controlled and does not retrigger', () => {
  const game=new Game({characters,bandIds:bands.map(b=>b.id),random:()=>.6}); game.start();
  const tsugumi=characters.find(c=>c.sourceName==='ag-tsugumi');
  game.active={...tsugumi,x:0,y:9,horizontal:false}; game.lock();
  assert.equal(game.pendingObstacles.length,2); assert.equal(game.phase,'obstacles');
  assert.equal(game.move(1),false); assert.equal(game.rotate(),false);
  const event=game.resolveStep(); assert.equal(event.type,'obstacles');
  const drops=game.pieces.filter(p=>p.obstacle); assert.equal(drops.length,2);
  assert.ok(drops.every(p=>p.y===10)); assert.equal(game.pendingObstacles.length,0);
  game.phase='gravity'; game.resolveStep(); assert.equal(game.pendingObstacles.length,0);
});
test('obstacles overflowing the board are cancelled', () => {
  const game=makeGame({height:11}); game.status='resolving'; game.phase='obstacles';
  game.pieces=[piece(1,2,0)]; game.pendingObstacles=[food(1,2,-1)];
  assert.equal(game.resolveStep().type,'obstacles'); assert.equal(game.status,'resolving');
  assert.equal(game.pieces.length,1); game.resolveStep(); assert.equal(game.status,'falling');
});
test('domino and Michelle footprints remain rigid', () => {
  assert.deepEqual(cells(piece(1, 2, 3)), [[2, 3], [2, 4]]);
  assert.deepEqual(cells(piece(1, 2, 3, 'a', { horizontal: true })), [[2, 3], [3, 3]]);
  const square = piece(5, 2, 3, 'a', { square: true });
  assert.equal(cells(square).length, 4);
  assert.deepEqual(cells(square), cells({ ...square, horizontal: true }));
});
test('five orthogonally connected numbers clear, even through branching paths', () => {
  const cluster = [piece(1, 2, 4), piece(2, 1, 4), piece(3, 3, 4), piece(4, 2, 2), piece(5, 2, 6)];
  assert.equal(connectedGroups(cluster).length, 1);
  assert.equal(connectedGroups(cluster.slice(0, 4)).length, 0);
});
test('diagonal contact does not connect characters', () => {
  const diagonal = [1, 2, 3, 4, 5].map((n, i) => piece(n, i, i * 2));
  assert.equal(connectedGroups(diagonal).length, 0);
});
test('a different band cannot bridge a disconnected group', () => {
  const cluster = [piece(1, 0, 10), piece(2, 1, 10), piece(3, 3, 10), piece(4, 4, 10), piece(5, 5, 10), piece(1, 2, 10, 'b')];
  assert.equal(connectedGroups(cluster).length, 0);
});
test('five occupied cells or repeated numbers cannot impersonate five members', () => {
  const pieces = [piece(5, 0, 10, 'a', { square: true }), piece(1, 2, 10), piece(2, 3, 10)];
  assert.equal(connectedGroups(pieces).length, 0);
  const duplicates = [1, 2, 3, 4, 4].map((n, i) => ({ ...piece(n, i, 10), id: `unique-${i}` }));
  assert.equal(connectedGroups(duplicates).length, 0);
});
test('Michelle counts once and connects from any of her four cells', () => {
  const pieces = [piece(5, 0, 10, 'a', { square: true }), ...[1, 2, 3, 4].map((n, i) => piece(n, i + 2, 10))];
  const groups = connectedGroups(pieces); assert.equal(groups.length, 1); assert.equal(groups[0].length, 5);
});
test('gravity preserves a horizontal bridge with only one supported cell', () => {
  const base = piece(1, 0, 10), bridge = piece(2, 0, 9, 'b', { horizontal: true });
  const pieces = [bridge, base]; assert.equal(settle(pieces, 12), 0); assert.equal(bridge.y, 9);
  pieces.splice(1, 1); settle(pieces, 12); assert.equal(bridge.y, 11); assert.equal(cells(bridge).length, 2);
});
test('stacked floating rectangles fall together independent of iteration order', () => {
  for (const reverse of [false, true]) {
    const pieces = [piece(1, 1, 0), piece(2, 1, 2), piece(3, 1, 4)];
    if (reverse) pieces.reverse(); settle(pieces, 12);
    assert.deepEqual(pieces.sort((a,b) => a.number-b.number).map(p => p.y), [6, 8, 10]);
  }
});
test('Michelle stays suspended as a whole if one column is supported', () => {
  const square = piece(5, 0, 6, 'a', { square: true }), support = piece(1, 1, 10, 'b');
  settle([square, support], 12); assert.equal(square.y, 8); assert.equal(cells(square).length, 4);
  assert.equal(fits({ ...square, y: 9 }, [support], 10, 12), false);
});
test('head-pivot rotation respects wall and floor geometry', () => {
  const game = makeGame(); game.start(); game.active = piece(1, 9, 8);
  assert.equal(game.rotate(), true); assert.equal(game.active.x, 8); assert.equal(game.active.horizontal, true);
  game.active = piece(1, 4, 11, 'a', { horizontal: true, rotation: 1 });
  assert.equal(game.rotate(), true); assert.equal(game.active.y, 10);
  game.active = piece(1, 4, 4);
  for (let i = 0; i < 4; i++) assert.equal(game.rotate(), true);
  assert.equal(game.active.rotation, 0); assert.equal(game.active.horizontal, false);
});
test('rotation can fail when both orientations are obstructed', () => {
  const game = makeGame(); game.start(); game.active = piece(1, 4, 4);
  game.pieces = [piece(2, 3, 3), piece(3, 5, 3), piece(4, 6, 4), piece(5, 4, 2, 'b', { horizontal: true })];
  assert.equal(game.rotate(), false); assert.equal(game.active.horizontal, false);
});
test('square rotation keeps exact footprint and respects right wall', () => {
  const game = makeGame(); game.start(); game.active = piece(5, 8, 10, 'a', { square: true });
  const original = cells(game.active); assert.equal(game.rotate(), true); assert.deepEqual(cells(game.active), original);
  assert.equal(game.move(1), false);
});
test('draws are distinct within the current pool across settled, active and next', () => {
  const game = makeGame(); game.start(); assert.notEqual(game.active.id, game.next.id);
  const first = game.active.id, member = game.active.characterId; game.hardDrop(); game.resolveStep();
  assert.notEqual(game.active.characterId, member); assert.notEqual(game.next.characterId, member);
  assert.notEqual(game.active.id, first); assert.notEqual(game.next.id, first);
  assert.equal(new Set([...game.pieces, game.active, game.next].map(p => p.id)).size, 3);
});
test('all members already on the board does not exhaust the character pool', () => {
  const game = makeGame({ bandIds: ['a'] }); game.pieces = [1,2,3,4,5].map((n,i) => piece(n,i*2,10)); game.status = 'resolving';
  game.resolveStep(); assert.equal(game.status, 'falling'); assert.equal(game.reason, null); assert.ok(game.active); assert.ok(game.next);
});
test('characters continue spawning after a full-band clear', () => {
  const game = makeGame({ bandIds: ['a'] }); game.pieces = [1,2,3,4,5].map((n,i) => piece(n,i,10)); game.status = 'resolving';
  assert.equal(game.resolveStep().type, 'clear'); game.resolveStep(); game.resolveStep();
  assert.equal(game.status, 'falling'); assert.ok(game.active); assert.ok(game.next); assert.equal(game.pieces.length, 0);
});
test('a clear then gravity can produce a second chain with increasing score', () => {
  const game = makeGame();
  game.pieces = [...[1,2,3,4,5].map((n,i) => piece(n,i,10)), ...[1,2,3,4,5].map((n,i) => piece(n,i,8-i*2,'b'))]; game.status = 'resolving';
  assert.equal(game.resolveStep().points, 1000); assert.equal(game.resolveStep().type, 'gravity');
  const second = game.resolveStep(); assert.equal(second.points, 2000); assert.equal(second.chain, 2);
  assert.equal(game.score, 3000); assert.equal(game.maxChain, 2); assert.equal(game.clearedBands, 2);
});
test('two simultaneous bands count as one chain round and two clears', () => {
  const game = makeGame(); game.pieces = ['a','b'].flatMap((band,i) => [1,2,3,4,5].map((n,x) => piece(n,x,8+i*2,band))); game.status = 'resolving';
  const event = game.resolveStep(); assert.equal(event.groups, 2); assert.equal(event.chain, 1); assert.equal(game.score, 2000);
});
test('a locked piece above the top loses; a stack exactly h high does not', () => {
  const game = makeGame(); game.start(); game.active = piece(1, 0, 0); game.lock(); assert.equal(game.status, 'resolving');
  game.active = piece(2, 0, -2); game.status = 'falling'; game.tick();
  assert.equal(game.status, 'gameover'); assert.equal(game.reason, 'overflow');
});
test('Michelle ghost and collision account for all four occupied cells', () => {
  const game = makeGame(); game.start(); game.active = piece(5, 3, -2, 'a', { square: true }); game.pieces = [piece(1, 4, 8, 'b')];
  assert.equal(game.ghost().y, 6); game.hardDrop(); assert.equal(game.pieces.at(-1).y, 6); assert.equal(game.score, 26);
});
test('soft drop, hard drop and landing have deterministic scoring', () => {
  const game = makeGame(); game.start(); game.softDrop(); assert.equal(game.score, 1);
  const distance = game.ghost().y - game.active.y; game.hardDrop(); assert.equal(game.score, 1 + distance * 2 + 10);
});
test('randomized sessions maintain unique piece identities, non-overlap and legal bounds', () => {
  let seed = 721;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let session = 0; session < 80; session++) {
    const game = new Game({ width: 10, height: 16, bandIds: bands.map(b => b.id), characters, random }); game.start();
    for (let turn = 0; turn < 150 && game.status !== 'gameover'; turn++) {
      const targetX = Math.floor(random() * 10);
      for (let r = 0, count = Math.floor(random()*4); r < count; r++) game.rotate();
      for (let step = 0; step < 10; step++) game.move(Math.sign(targetX-game.active.x));
      game.hardDrop(); let guard = 0;
      while (game.status === 'resolving') { game.resolveStep(); assert.ok(++guard < 30); }
      const all = [...game.pieces, ...[game.active,game.next].filter(Boolean)]; assert.equal(new Set(all.map(p=>p.id)).size, all.length);
      const occupied = game.pieces.flatMap(cells).map(([x,y])=>`${x},${y}`); assert.equal(new Set(occupied).size, occupied.length);
      for (const [x,y] of game.pieces.flatMap(cells)) { assert.ok(x>=0 && x<10 && y<16); if(game.status!=='gameover') assert.ok(y>=0); }
    }
  }
});

test('custom dimensions accept minimums and larger boards; reject fractions and nonfinite values', () => {
  for (const [width,height] of [[6,8],[21,31],[40,60]]) assert.doesNotThrow(()=>makeGame({width,height}));
  for (const width of [0,5,6.5,NaN,Infinity]) assert.throws(()=>makeGame({width}));
  for (const height of [0,7,8.5,NaN,Infinity]) assert.throws(()=>makeGame({height}));
});

const realGame = (sourceName, skills = {}, random = () => .7) => {
  const game = new Game({characters, bandIds: bands.map(b=>b.id), skills, random});
  game.start();
  game.active = {...characters.find(c=>c.sourceName===sourceName), x:3,y:4,rotation:0,horizontal:false};
  return game;
};

test('head rotation preserves the head cell for all four orientations', () => {
  const {ends}=require('../src/engine.js');
  const game=realGame('ppp-kasumi'), head=ends(game.active)[0];
  for(let i=0;i<4;i++) { assert.equal(game.rotate(),true); assert.deepEqual(ends(game.active)[0],head); }
  assert.deepEqual([game.active.x,game.active.y,game.active.rotation],[3,4,0]);
  game.active.x=0; assert.equal(game.rotate(),false);
});

test('Kokoro Q/E rises one cell without rotation, respecting collisions and switch',()=>{
 const game=realGame('hhw-kokoro');game.active.y=3;const original={...game.active};
 assert.equal(game.rise(),true);assert.equal(game.active.y,2);assert.equal(game.active.rotation,original.rotation);
 game.pieces=[{id:'block',obstacle:'stone',x:game.active.x,y:1}];assert.equal(game.rise(),false);
 game.pieces=[];game.active.y=-2;assert.equal(game.rise(),false);
 game.active.y=3;game.skills['hhw-kokoro']=false;assert.equal(game.rise(),false);assert.equal(game.rotate(),true);
});

test('Misaki forms share identity and HHW membership; disabled skill always selects human', () => {
  const c=characters.find(c=>c.sourceName==='hhw-michelle'), game=realGame('hhw-kokoro');
  game.random=()=>0; const bear=game.form(c); assert.equal(bear.square,true);
  game.random=()=>.9; const human=game.form(c); assert.equal(human.square,false);
  assert.equal(human.id,bear.id); assert.equal(human.number,5);
  assert.ok(require('node:fs').existsSync(human.image));
  game.skills[c.sourceName]=false; game.random=()=>0; assert.equal(game.form(c).square,false);
  for(const form of [bear,human]) {
    game.pieces=[{...form,x:0,y:9}]; assert.ok(game.available().some(p=>p.id===c.id));
    const group=[{...form,x:0,y:9},...characters.filter(p=>p.bandId===c.bandId && p.number<5).map((p,i)=>({...p,x:i+(form.square?2:1),y:9}))];
    assert.equal(connectedGroups(group).length,1);
  }
});

test('all three food-producing skills can be disabled independently', () => {
  for(const source of ['ag-tsugumi','ppp-saaya','hhw-hagumi']) {
    const game=realGame(source,{[source]:false},()=>0);
    game.active.y=9; game.lock(); assert.deepEqual(game.pendingObstacles,[]);
    const enabled=realGame(source,{},()=>0); enabled.active.y=9; enabled.lock();
    assert.ok(enabled.pendingObstacles.length>0);
  }
});

test('Rimi eats exactly one random cornet and then settles unsupported pieces', () => {
  const game=realGame('ppp-rimiri',{},()=>.9);
  game.pieces=[food(1,0,10,'cornet'),food(2,2,10,'cornet'),food(3,4,10,'coffee'),piece(1,2,8,'b')];
  game.active.x=6; game.active.y=9; game.lock();
  const event=game.resolveStep(); assert.equal(event.skill,'巧克力螺！');
  assert.equal(event.removed[0].id,'food-2'); assert.equal(game.clearedObstacles,1);
  assert.equal(game.resolveStep().type,'gravity');
  assert.equal(game.pieces.find(p=>p.id==='b-1').y,9);
  assert.equal(game.pieces.filter(p=>p.obstacle==='cornet').length,1);
  for(const disabled of [false,true]) {
    const g=realGame('ppp-rimiri',{'ppp-rimiri':!disabled});
    if(disabled) g.pieces=[food(1,0,10,'cornet')];
    g.active.y=9; g.lock(); assert.equal(g.phase,'check');
  }
});

test('Mashiro spawns inverted, always falls down and triples speed only head-down', () => {
  const game=realGame('mor-mashiro');
  game.active=null; game.next=characters.find(c=>c.sourceName==='mor-mashiro'); game.spawn();
  assert.equal(game.active.rotation,2); assert.deepEqual(game.direction(),[0,1]);
  for(const [rotation,dir] of [[0,[0,1]],[1,[0,1]],[2,[0,1]],[3,[0,1]]]) {
    game.active={...game.active,x:3,y:4,rotation,horizontal:rotation%2===1}; game.status='falling';
    assert.equal(game.fallInterval(700),rotation===2?700/3:700);
    const ghost=game.ghost(); assert.ok(fits(ghost,[],game.width,game.height));
    game.tick(); assert.deepEqual([game.active.x,game.active.y],[3+dir[0],4+dir[1]]);
    game.hardDrop(); assert.ok(['resolving','gameover'].includes(game.status));
    game.pieces=[];
    game.active={...characters.find(c=>c.sourceName==='mor-mashiro'),x:3,y:4};
  }
  const disabled=realGame('mor-mashiro',{'mor-mashiro':false});
  assert.deepEqual(disabled.direction(),[0,1]);
  disabled.active.rotation=2;assert.equal(disabled.fallInterval(700),700);
  const floating={...disabled.active,rotation:0}; settle([floating],11); assert.equal(floating.y,9);
});

test('repeated members collide and stack as separate pieces', () => {
  const game=makeGame({characters:[cast[0]]}); game.start();
  const first=game.active; game.hardDrop(); game.resolveStep();
  assert.equal(game.active.characterId,first.characterId);
  assert.notEqual(game.active.id,first.id);
  assert.equal(game.ghost().y,8);
  game.hardDrop();
  assert.deepEqual(game.pieces.map(p=>p.y),[10,8]);
  assert.equal(new Set(game.pieces.flatMap(cells).map(String)).size,4);
});
const repeatedGroup = numbers => numbers.map((n,i)=>piece(n,i,10,'a',{id:'copy-'+i}));
test('connected duplicates cannot substitute for missing members', () => {
  for(const numbers of [[1,1,1,2],[1,2,2],[1,3,1],[1,1,2,2,3,4],[1,1,1,1,1]]) {
    assert.equal(connectedGroups(repeatedGroup(numbers)).length,0);
  }
});
test('a complete connected group clears all copies but leaves disconnected copies', () => {
  const game=makeGame({width:14});
  const connected=repeatedGroup([1,1,2,2,3,4,5,5]);
  const isolated=piece(1,12,10,'a',{id:'isolated-copy'});
  const other=piece(2,10,10,'b',{id:'other-band'});
  game.pieces=[...connected,isolated,other,food(9,7,9)];
  game.status='resolving';
  const event=game.resolveStep();
  assert.equal(event.groups,1); assert.equal(event.points,1200);
  assert.equal(event.removed.length,9);
  assert.deepEqual(new Set(event.removed.map(p=>p.id)),new Set([...connected.map(p=>p.id),'food-9']));
  assert.deepEqual(game.pieces.map(p=>p.id),['isolated-copy','other-band']);
});
test('duplicate Misaki and Michelle count as one distinct member and all clear with HHW', () => {
  const c=characters.find(c=>c.sourceName==='hhw-michelle');
  const human={...c,square:false,id:'human',x:0,y:9};
  const bear={...c,square:true,id:'bear',x:1,y:9};
  const members=characters.filter(p=>p.bandId===c.bandId && p.number<5).map((p,i)=>({...p,x:i+3,y:9}));
  assert.equal(connectedGroups([human,bear,...members.slice(0,3)]).length,0);
  const groups=connectedGroups([human,bear,...members]);
  assert.equal(groups.length,1); assert.equal(groups[0].length,6);
});

const {clearGroups,bandNumber}=require('../src/engine.js');
const named=(source,x,y=10,id=source)=>({...characters.find(c=>c.sourceName===source),id,x,y,rotation:0,horizontal:false});
const mujicaNames=['am-uika','am-sakiko','am-umiri','am-nyamu','am-mutsumi'];
const cryNames=['am-sakiko','am-mutsumi','mygo-taki','mygo-soyo','mygo-tomori'];
test('Uika appears once in the pool when either or both bands are enabled',()=>{
  for(const bandIds of [['sumimi'],['ave-mujica'],['sumimi','ave-mujica']]){
    const game=new Game({characters,bandIds});
    assert.equal(game.characters.filter(c=>c.sourceName==='am-uika').length,1);
    assert.equal(game.characters.length,bandIds.length===2?6:bandIds[0]==='sumimi'?2:5);
    if(bandIds.length===1 && bandIds[0]==='sumimi') assert.ok(game.characters.every(c=>c.bandId==='sumimi'));
  }
  assert.ok(!new Game({characters,bandIds:['mygo']}).characters.some(c=>c.sourceName==='am-uika'));
});
test('Mutsumi and Mortis have 50/50 forms independent of the destructive skill switch',()=>{
  for(const enabled of [true,false]){
    const game=new Game({characters,bandIds:['ave-mujica'],skills:{'am-mortis':enabled}});
    const c=characters.find(c=>c.sourceName==='am-mutsumi');
    game.random=()=>.49999; const mortis=game.form(c);
    assert.equal(mortis.sourceName,'am-mortis'); assert.equal(bandNumber(mortis,'ave-mujica'),2);
    game.random=()=>.5; assert.equal(game.form(c).sourceName,'am-mutsumi');
    assert.ok(require('node:fs').existsSync(mortis.image));
  }
});
test('Mujica clears with either Mutsumi or Mortis, including duplicate forms',()=>{
  for(const isMortis of [true,false]){
    const pieces=mujicaNames.map((s,i)=>named(s,i));
    if(isMortis)pieces[4].sourceName='am-mortis';
    pieces.push({...named('am-mutsumi',5),sourceName:'am-mortis',id:'extra'});
    const groups=clearGroups(pieces,['ave-mujica']);
    assert.equal(groups.length,1); assert.equal(groups[0].members.length,6);
  }
});
test('sumimi only clears when enabled and requires both identities, not two Uikas',()=>{
  const pair=[named('am-uika',0),named('smm-mana',1)];
  assert.equal(clearGroups(pair,['sumimi']).length,1);
  assert.equal(clearGroups(pair,['ave-mujica']).length,0);
  assert.equal(clearGroups([pair[0],named('am-uika',1,10,'copy')],['sumimi']).length,0);
  assert.equal(clearGroups([pair[0],named('smm-mana',2)],['sumimi']).length,0);
});
test('Mujica consumes shared Uika first and leaves Mana for a later turn',()=>{
  const game=new Game({width:10,height:12,characters,bandIds:['ave-mujica','sumimi']});
  game.pieces=[...mujicaNames.map((s,i)=>named(s,i)),named('smm-mana',0,8)];
  game.status='resolving'; const event=game.resolveStep();
  assert.deepEqual(event.rules,['ave-mujica']); assert.equal(event.points,1000);
  assert.deepEqual(game.pieces.map(p=>p.sourceName),['smm-mana']);
  game.resolveStep(); game.resolveStep(); assert.equal(game.status,'falling');
});
test('independent sumimi block may clear alongside Mujica; shared identities are not double-counted',()=>{
  const pieces=[...mujicaNames.map((s,i)=>named(s,i)),named('am-uika',7,10,'uika-copy'),named('smm-mana',8)];
  const matches=clearGroups(pieces,['sumimi','ave-mujica']);
  assert.deepEqual(matches.map(g=>g.id),['ave-mujica','sumimi']);
  assert.equal(new Set(matches.flatMap(g=>g.members).map(p=>p.id)).size,7);
});
test('CRYCHIC requires the five actual members and excludes Mortis as member or bridge',()=>{
  const pieces=cryNames.map((s,i)=>named(s,i));
  assert.equal(clearGroups(pieces,['ave-mujica','mygo']).at(0).id,'crychic');
  assert.equal(clearGroups(pieces,['ave-mujica','mygo'],{crychic:false}).length,0);
  const mortis=pieces.map(p=>({...p})); mortis[1].sourceName='am-mortis';
  assert.equal(clearGroups(mortis,['ave-mujica','mygo']).length,0);
  const broken=pieces.map((p,i)=>({...p,x:i>0?i+1:i}));
  broken.push({...named('am-mutsumi',1),sourceName:'am-mortis',id:'bridge'});
  assert.equal(clearGroups(broken,['ave-mujica','mygo']).length,0);
});
test('CRYCHIC clears duplicate members as a whole and awards one group',()=>{
  const game=new Game({width:10,height:12,characters,bandIds:['ave-mujica','mygo']});
  game.pieces=[...cryNames.map((s,i)=>named(s,i)),named('mygo-tomori',5,10,'copy')];
  game.status='resolving';const event=game.resolveStep();
  assert.deepEqual(event.rules,['crychic']);assert.equal(event.removed.length,6);assert.equal(event.points,1000);
});
test('Mortis 3x3 clears every overlapping character, without clear score',()=>{
  const game=new Game({width:10,height:12,characters,bandIds:['ave-mujica'],random:()=>.19999});
  game.status='falling';game.active={...named('am-mutsumi',3,8,'mortis'),sourceName:'am-mortis'};
  game.pieces=[named('am-uika',2,8,'left'),named('am-sakiko',3,6,'top'),
    named('am-nyamu',4,9,'right'),named('am-umiri',3,10,'bottom'),
    named('am-uika',1,8,'indirect'),named('am-sakiko',1,6,'diagonal'),
    food(1,4,8,'cornet')];
  game.lock(); assert.equal(game.score,10);
  const event=game.resolveStep();assert.equal(event.skill,'全都不会弹');assert.equal(event.points,0);
  assert.deepEqual(new Set(event.removed.map(p=>p.id)),new Set(['mortis','left','top','right']));
  assert.equal(game.score,10);assert.equal(game.clearedBands,0);assert.equal(game.clearedObstacles,0);
  assert.equal(game.resolveStep().type,'gravity');assert.equal(game.phase,'check');
});
test('Mortis effect does not trigger at 70%, when disabled, or for ordinary Mutsumi',()=>{
  for(const [source,roll,enabled] of [['am-mortis',.7,true],['am-mortis',0,false],['am-mutsumi',0,true]]){
    const game=new Game({characters,bandIds:['ave-mujica'],skills:{'am-mortis':enabled},random:()=>roll});
    game.active={...named('am-mutsumi',3,9),sourceName:source};game.status='falling';game.lock();
    assert.equal(game.phase,source==='am-mutsumi'?'obstacles':'check');assert.equal(game.pieces.length,1);
  }
});

test('draw pool samples without replacement, then resets even while copies remain on stage',()=>{
  const game=makeGame({bandIds:['a']});
  const first=Array.from({length:5},()=>game.choose());
  assert.equal(new Set(first.map(p=>p.characterId)).size,5);assert.equal(game.pool.size,0);
  game.pieces=first.map((p,i)=>({...p,x:i*2,y:10}));
  const second=Array.from({length:5},()=>game.choose());
  assert.equal(new Set(second.map(p=>p.characterId)).size,5);
  assert.deepEqual(first.map(p=>p.characterId),second.map(p=>p.characterId));
  assert.equal(new Set([...first,...second].map(p=>p.id)).size,10);
});
test('active and NEXT consume one pool slot each before landing',()=>{
  const game=makeGame();game.start();assert.equal(game.pool.size,8);
  assert.ok(!game.pool.has(game.active.characterId));assert.ok(!game.pool.has(game.next.characterId));
});
test('alternate forms share one slot in each band pool; Uika is absent from sumimi pool',()=>{
 const game=new Game({characters,bandIds:['hello-happy-world','ave-mujica','sumimi'],random:()=>0});
 assert.equal(game.bandPools.get('hello-happy-world').size,5);assert.equal(game.bandPools.get('ave-mujica').size,5);
 assert.deepEqual([...game.bandPools.get('sumimi')],['sumimi-2']);
 for(const id of ['hello-happy-world','ave-mujica']){
  const solo=new Game({characters,bandIds:[id],random:()=>0});
  assert.equal(new Set(Array.from({length:5},()=>solo.choose().characterId)).size,5);
 }
});

test('completed group returns members to a nonempty pool without duplicate weight',()=>{
  const game=makeGame();const members=Array.from({length:5},()=>game.choose());
  assert.equal(game.pool.size,5);
  game.pieces=members.map((p,i)=>({...p,x:i,y:10}));game.status='resolving';
  assert.equal(game.resolveStep().type,'clear');assert.equal(game.pool.size,10);
  game.returnToPool([...members,...members]);assert.equal(game.pool.size,10);
});
test('cleared Mortis returns Mutsumi shared identity; group skill members also return',()=>{
  const game=new Game({characters,bandIds:bands.map(b=>b.id),skills:{'aya-family':true}});
  for(const pool of game.bandPools.values())pool.clear();
  game.returnToPool([{...named('am-mutsumi',0),id:'instance',sourceName:'am-mortis'}]);
  assert.ok(game.pool.has('ave-mujica-2'));assert.equal(game.pool.size,5);
  const names=['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'];
  game.pieces=names.map((s,i)=>named(s,i,9));game.status='resolving';
  assert.deepEqual(game.resolveStep().rules,['aya-family']);assert.equal(game.pool.size,30);
});
test('Aya family is disabled by default, requires all five identities, clears copies',()=>{
  const names=['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'];
  const pieces=names.map((s,i)=>named(s,i));
  const ids=bands.map(b=>b.id);
  assert.equal(clearGroups(pieces,ids).length,0);
  assert.equal(clearGroups(pieces,ids,{'aya-family':false}).length,0);
  assert.equal(clearGroups(pieces.slice(0,4),ids,{'aya-family':true}).length,0);
  pieces.push(named('pp-aya',5,10,'copy'));
  const group=clearGroups(pieces,ids,{'aya-family':true})[0];
  assert.equal(group.id,'aya-family');assert.equal(group.members.length,6);
});
test('Moka always eats exactly one food of any kind, never a stone',()=>{
  for(const kind of ['coffee','cornet','croquette']){
    const game=realGame('ag-moka',{},()=>.99);
    game.active.y=9;game.pieces=[food(1,0,10,'stone'),food(2,1,10,kind),food(3,2,10,kind)];game.lock();
    const event=game.resolveStep();assert.equal(event.skill,'商店街荣誉市民');assert.equal(event.removed.length,1);
    assert.equal(event.removed[0].obstacle,kind);assert.ok(game.pieces.some(p=>p.obstacle==='stone'));
    assert.equal(event.points,200);assert.equal(game.resolveStep().type,'gravity');
  }
  for(const enabled of [true,false]){
    const game=realGame('ag-moka',{'ag-moka':enabled});game.active.y=9;
    game.pieces=[food(1,0,10,enabled?'stone':'coffee')];game.lock();assert.equal(game.phase,'check');
  }
});
test('Rimi always eats a cornet at any random roll, leaving all other obstacles',()=>{
  for(const roll of [0,.5,.99999]){
    const game=realGame('ppp-rimiri',{},()=>roll);game.active.y=9;
    game.pieces=['coffee','croquette','stone','cornet'].map((kind,i)=>food(i,i,10,kind));game.lock();
    const event=game.resolveStep();assert.equal(event.removed[0].obstacle,'cornet');assert.equal(event.removed.length,1);
    assert.equal(game.pieces.filter(p=>p.obstacle).length,3);
  }
});
test('Tomori drops a stone only below 80%, obeys switch, then uses normal obstacle gravity',()=>{
  assert.equal(obstacleRoll({sourceName:'mygo-tomori'},8,()=>.79999)[0].kind,'stone');
  assert.equal(obstacleRoll({sourceName:'mygo-tomori'},8,()=>.8).length,0);
  const game=realGame('mygo-tomori',{},()=>0);game.active.x=3;game.active.y=9;game.lock();
  assert.equal(game.phase,'obstacles');assert.equal(game.pendingObstacles[0].obstacle,'stone');
  const event=game.resolveStep();assert.equal(event.type,'obstacles');assert.equal(game.pieces.find(p=>p.obstacle).y,10);
  const disabled=realGame('mygo-tomori',{'mygo-tomori':false},()=>0);disabled.active.y=9;disabled.lock();
  assert.equal(disabled.pendingObstacles.length,0);
});
test('stones provide support but block adjacent food clear propagation',()=>{
  const game=makeGame();game.pieces=[...[1,2,3,4,5].map((n,i)=>piece(n,i,10)),food(1,0,9,'stone'),food(2,0,8,'coffee')];
  game.status='resolving';const event=game.resolveStep();assert.equal(event.obstacles,0);assert.equal(event.points,1000);
  const stone=food(1,2,10,'stone'),member=piece(1,2,0);settle([stone,member],11);assert.equal(member.y,8);
});
