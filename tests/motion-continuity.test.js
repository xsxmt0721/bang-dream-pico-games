'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {Game,ends}=require('../src/engine');
const source=fs.readFileSync(require.resolve('../src/game.js'),'utf8');
function setup(name='ppp-kasumi'){
 const character={id:name,sourceName:name,bandId:'test',number:1};
 const game=new Game({bandIds:['test'],characters:[character],skills:{'rose-sayo':true}});
 game.status='falling';game.active={...character,x:3,y:4,rotation:0,horizontal:false};
 const context=vm.createContext({game,paused:false,concertQueue:[],clock:140,pendingFloat:null,resolutionTime:0,fallTime:0,fallMotion:{id:name,from:3,to:4,fromX:3,toX:3,start:0,duration:400},$:()=>({open:false}),sound:()=>{},sync:()=>{},unlock:()=>{}});
 vm.runInContext(source.slice(source.indexOf('  function action(name)'),source.indexOf('  function rounded(')),context);
 return {game,run:code=>vm.runInContext(code,context)};
}
test('rotation preserves falling head position and fall clock',()=>{
 const {game,run}=setup();const initial=ends({...game.active,y:run('visualY(game.active)')})[0][1];
 for(let i=0;i<4;i++){run("action('rotate')");assert.equal(ends({...game.active,y:run('visualY(game.active)')})[0][1],initial);}
 run('clock+=40');assert.ok(Math.abs(run('visualY(game.active)')-3.45)<1e-9);
});
test('horizontal movement preserves fractional height',()=>{
 const {run}=setup();const y=run('visualY(game.active)');run("action('left')");assert.equal(run('visualY(game.active)'),y);run("action('right')");assert.equal(run('visualY(game.active)'),y);
});
test('Kokoro rises exactly one cell and continues existing fall',()=>{
 const {run}=setup('hhw-kokoro');const y=run('visualY(game.active)');run("action('skill')");assert.equal(run('visualY(game.active)'),y-1);run('clock+=40');assert.ok(Math.abs(run('visualY(game.active)')-(y-.9))<1e-9);
});
test('rejected rotation leaves animation untouched',()=>{
 const {game,run}=setup();game.active.shopping=true;const y=run('visualY(game.active)');run("action('rotate')");assert.equal(run('visualY(game.active)'),y);
});

test('Sayo waits for the current boundary without cancelling descent',()=>{
 const {game,run}=setup('rose-sayo');const y=run('visualY(game.active)');
 run("action('skill')");assert.equal(game.status,'falling');assert.equal(run('pendingFloat'),'rose-sayo');assert.equal(run('visualY(game.active)'),y);
 run('clock+=40');assert.ok(run('visualY(game.active)')>y);
});
test('Sayo can float immediately at an exact boundary',()=>{
 const {game,run}=setup('rose-sayo');run('clock=400');run("action('skill')");assert.equal(game.status,'resolving');assert.equal(game.pieces[0].floating,true);
});
