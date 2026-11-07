'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine,audio,frame,time=1;requestAnimationFrame=fn=>{frame=fn;};window.advance=ms=>{while(ms>0){const dt=Math.min(ms,16);ms-=dt;time+=dt;frame(time);}};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});
   Object.defineProperty(window,'PicoAudio',{get:()=>audio,set:v=>{const Base=v.AudioDirector;v.AudioDirector=class extends Base{constructor(){super(()=>new Audio(),()=>0);window.testAudio=this;window.bondCalls=[];}bond(hits,c){bondCalls.push({names:hits.map(h=>h.name),character:c?.sourceName});super.bond(hits,c);window.initialBondSrc=this.voice.src;}};audio=v;}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.click('#overlay-action');
  await page.evaluate(()=>{
   window.fixture=(name,id,x=3,y=0)=>{const c=PicoRoster.characters.find(c=>c.sourceName===name);return {...c,id,characterId:c.id,x,y,rotation:0,horizontal:false};};
   testAudio.reset();testGame.pieces=[];testGame.active=fixture('ppp-kasumi','first');testGame.status='falling';
  });
  await page.keyboard.press('ArrowLeft');await page.evaluate(()=>advance(1900));assert.equal(await page.evaluate(()=>testAudio.voice.getAttribute('src')),null);
  await page.evaluate(()=>advance(150));assert.match(await page.evaluate(()=>testAudio.voice.src),/characters\/ppp-kasumi\/voice-/);
  await page.evaluate(()=>{testAudio.reset();testGame.pieces=[];testGame.active=fixture('ppp-otae','early');testGame.status='falling';});
  await page.keyboard.press('ArrowLeft');await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>testAudio.pending),null);
  await page.evaluate(()=>{testGame.status='ready';advance(4500);});assert.equal(await page.evaluate(()=>testAudio.voice.getAttribute('src')),null);
  await page.evaluate(()=>{testAudio.reset();testGame.skills.bonds=true;testGame.pieces=[fixture('ppp-arisa','arisa',4,9)];testGame.active=fixture('ppp-kasumi','bond-kasumi',3,7);testGame.status='falling';});
  await page.keyboard.press('Space');await page.evaluate(()=>advance(400));
  assert.deepEqual(await page.evaluate(()=>bondCalls.at(-1)),{names:['ksar'],character:'ppp-kasumi'});
  assert.match(await page.evaluate(()=>initialBondSrc),/bonds\/ksar\/voice-/);
  await page.waitForFunction(()=>testAudio.voice.src.includes('/characters/ppp-kasumi/'));
  assert.equal(await page.evaluate(()=>testAudio.pending),null);
  assert.deepEqual(errors,[]);console.log('Voice integration passed: delayed personal speech, early-landing cancellation, immediate bond selection and real empty-MP3 fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
