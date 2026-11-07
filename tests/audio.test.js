'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {AudioDirector,voices,bondVoices,groups,songs}=require('../src/audio');
function setup(random=()=>0){const clips=[];const d=new AudioDirector(()=>{const a={src:'',muted:false,ended:false,loop:false,plays:0,stops:0,play(){this.plays++;return Promise.resolve();},pause(){this.stops++;},removeAttribute(){this.src='';},load(){}};clips.push(a);return a;},random);return {d,clips};}
test('all character variants have 2–5 existing MP3s, all clear tracks exist',()=>{
 assert.equal(Object.keys(voices).length,49);
 for(const list of Object.values(voices)){assert.ok(list.length>=2&&list.length<=5);for(const p of list)assert.ok(fs.existsSync(p));}
 for(const p of [...Object.values(groups),...Object.values(songs).map(s=>s.src)])assert.ok(fs.existsSync(p));
});
test('personal voice waits a random 2–4 seconds, once per active character',()=>{
 for(const roll of [0,.5,.999999]){
  const {d,clips:[v]}=setup(()=>roll),c={id:'1',sourceName:'hhw-michelle',square:false};
  d.spawn(c,100);const due=d.pending.due;assert.equal(due,2100+roll*2000);assert.equal(v.src,'');
  d.spawn(c,500);assert.equal(d.pending.due,due);d.update(c,due-.01);assert.equal(v.plays,0);
  d.update(c,due);assert.ok(voices['hhw-misaki'].includes(v.src));assert.equal(v.plays,1);
  d.update(c,due+5000);assert.equal(v.plays,1);
 }
});

test('landing cancels pending personal voice; spawning alone does not interrupt playing speech',()=>{
 const {d,clips:[v]}=setup(),a={id:'a',sourceName:'pp-hina'},b={id:'b',sourceName:'rose-sayo'};
 d.spawn(a,0);d.update(null,1999);d.update(null,5000);assert.equal(v.plays,0);
 d.spawn(b,5000);d.update(b,7000);const prior=v.src,stops=v.stops;
 const c={id:'c',sourceName:'am-mortis'};d.spawn(c,7100);assert.equal(v.src,prior);assert.equal(v.stops,stops);
 d.update(c,9100);assert.ok(voices['am-mortis'].includes(v.src));assert.ok(v.stops>stops);
});

test('all 26 bonds have two initially empty MP3 placeholders',()=>{
 assert.equal(Object.keys(bondVoices).length,27);
 for(const clips of Object.values(bondVoices)){assert.equal(clips.length,2);for(const p of clips)assert.ok(fs.existsSync(p));}
});

test('bond speech is immediate, interrupts, tries both clips and falls back to the landed character',()=>{
 const {d,clips:[v]}=setup(),c={id:'a',sourceName:'ppp-kasumi'};
 d.spawn(c,0);d.update(c,2000);const stops=v.stops;
 d.bond([{name:'ksar',members:[c]}],c);assert.ok(bondVoices.ksar.includes(v.src));assert.ok(v.stops>stops);assert.equal(d.pending,null);
 const first=v.src;v.onerror();assert.ok(bondVoices.ksar.includes(v.src));assert.notEqual(v.src,first);
 v.onerror();assert.ok(voices['ppp-kasumi'].includes(v.src));
 d.bond([{name:'missing',members:[c]}],c);assert.ok(voices['ppp-kasumi'].includes(v.src));
});

test('stale load failure cannot replace a newer voice and reset cancels delayed speech',()=>{
 const {d,clips:[v]}=setup(),c={id:'a',sourceName:'pp-hina'};
 d.bond([{name:'ksar'}],c);const oldFailure=v.onerror;
 d.bond([{name:'pachu'}],c);const current=v.src;oldFailure();assert.equal(v.src,current);
 d.spawn(c,0);d.reset();assert.equal(d.pending,null);assert.equal(v.src,'');oldFailure();assert.equal(v.src,'');
});

test('pause prevents scheduled playback and speech replaces queued band voice without stopping music',()=>{
 const {d,clips:[v,g]}=setup(),c={id:'a',sourceName:'pp-hina'};
 d.spawn(c,0);d.setPaused(true);d.update(c,2000);assert.equal(v.plays,0);d.setPaused(false);d.update(c,2000);assert.equal(v.plays,1);
 d.clear(['roselia','afterglow']);assert.equal(v.src,'');d.bond([{name:'ksar'}],c);assert.equal(g.src,'');assert.equal(d.queue.length,0);
 d.song('crychic');d.bond([{name:'ksar'}],c);assert.equal(g.src,songs.crychic.src);assert.equal(g.loop,true);
});

test('ordinary clear queue, song loops, mute/pause and reset',()=>{
 const {d,clips:[v,g]}=setup();d.clear(['afterglow','roselia']);assert.equal(g.src,groups.afterglow);g.onended();assert.equal(g.src,groups.roselia);
 d.song('crychic');assert.ok(g.loop);assert.equal(g.src,songs.crychic.src);g.onended();assert.equal(g.src,songs.crychic.src);
 d.setEnabled(true);assert.equal(g.muted,false);d.setPaused(true);const plays=g.plays;d.setPaused(false);assert.equal(g.plays,plays+1);
 d.stopSong();assert.equal(g.loop,false);assert.equal(g.src,'');d.reset();assert.equal(v.src,'');assert.equal(d.lastId,null);
});
