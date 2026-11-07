'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try {
  const page=await browser.newPage({viewport:{width:1280,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine, frame, time=1;
   requestAnimationFrame=fn=>{frame=fn;};
   window.advance=ms=>{while(ms>0){const dt=Math.min(ms,16);ms-=dt;time+=dt;frame(time);}};
   window.spriteUrls=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='board' && img.src) spriteUrls.push(img.src);return draw.call(this,img,...args);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:value=>{
    const Base=value.Game;value.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};
    engine=value;
   }});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);

  const bytes=[...require('node:fs').readFileSync('assets/audio/characters/ppp-kasumi/voice-1.mp3')];
  const decoded=await page.evaluate(async bytes=>{const ctx=new AudioContext();const audio=await ctx.decodeAudioData(new Uint8Array(bytes).buffer);const peak=Math.max(...audio.getChannelData(0).map(Math.abs));await ctx.close();return {duration:audio.duration,peak};},bytes);
  assert.ok(decoded.duration>1);assert.equal(decoded.peak,0);
  await page.evaluate(async()=>{await Promise.all([...PicoRoster.bands.map(b=>b.id),'crychic'].map(id=>{const img=new Image();img.src='assets/band-logos/'+id+'.png';return img.decode();}));});
  const tracks=await page.evaluate(async()=>Promise.all(Object.values(PicoAudio.songs).map(song=>new Promise((resolve,reject)=>{
   const audio=new Audio();audio.preload='metadata';audio.onloadedmetadata=()=>{const duration=audio.duration;audio.removeAttribute('src');audio.load();resolve({src:song.src,duration});};audio.onerror=()=>reject(Error('Cannot decode '+song.src));audio.src=song.src;
  }))));
  for(const track of tracks)assert.ok(Number.isFinite(track.duration)&&track.duration>1,track.src);
  await page.click('#overlay-action');
  for(const [rule,names] of [
   ['crychic',['am-sakiko','am-mutsumi','mygo-taki','mygo-soyo','mygo-tomori']],
   ['aya-family',['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo']]
  ]){
   await page.evaluate(({rule,names})=>{
    testGame.bandIds=PicoRoster.bands.map(b=>b.id);testGame.skills['aya-family']=true;
    testGame.pieces=names.map((s,i)=>({...PicoRoster.characters.find(c=>c.sourceName===s),id:'fixture-'+i,x:i,y:9,rotation:0}));
    testGame.active=null;testGame.status='resolving';testGame.phase='check';advance(1000);
   },{rule,names});
   assert.equal(await page.locator('#concert').count(),0);assert.match(await page.locator('#current-label').textContent(),/按任意键/);
   assert.ok((await page.locator('#current-label').textContent()).includes(await page.evaluate(r=>PicoAudio.songs[r].title,rule)));
   assert.equal(await page.evaluate(()=>testGame.pieces.length),names.length);
   if(rule==='crychic')await page.screenshot({path:'docs/crychic-concert.png',fullPage:true});
   await page.evaluate(()=>advance(30000));assert.equal(await page.evaluate(()=>testGame.active),null);
   await page.keyboard.press('KeyA');assert.doesNotMatch(await page.locator('#current-label').textContent(),/按任意键/);
   await page.evaluate(()=>advance(2000));assert.ok(await page.evaluate(()=>testGame.active));
  }
  await page.evaluate(()=>{
   testGame.pieces=PicoRoster.characters.slice(0,5).map((c,i)=>({...c,x:i,y:9}));testGame.active=null;testGame.status='resolving';testGame.phase='check';advance(1000);
  });
  assert.ok(await page.locator('#clear-logos img').getAttribute('src').then(s=>s.endsWith('poppin-party.png')));
  assert.equal(await page.locator('#clear-logos').isVisible(),true);
  assert.equal(await page.locator('#clear-logos img').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)');
  await page.screenshot({path:'docs/band-clear-logo.png',fullPage:true});
  await page.evaluate(()=>{
   const names=['am-uika','smm-mana','pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'];
   testGame.pieces=names.map((s,i)=>({...PicoRoster.characters.find(c=>c.sourceName===s),id:'multi-'+i,x:i,y:9,rotation:0}));testGame.active=null;testGame.status='resolving';testGame.phase='check';advance(1000);
  });
  assert.match(await page.locator('#current-label').textContent(),/しゅわりん/);
  await page.keyboard.press('KeyP');await page.evaluate(()=>advance(100));assert.ok(await page.locator('#clear-logos img[alt="sumimi"]').count());
  await page.click('#board');assert.doesNotMatch(await page.locator('#current-label').textContent(),/按任意键/);
  await page.evaluate(()=>advance(2000));assert.ok(await page.evaluate(()=>testGame.active));
  assert.deepEqual(errors,[]);
  console.log('Audio/UI passed: silent MP3 decoding, nine official logos, two song holds/any-key resume, normal clear logo.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
