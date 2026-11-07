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
   window.spriteUrls=[];window.beamSizes=[];
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='board'&&img.src?.endsWith('/hina-wave.png'))beamSizes.push([args[2],args[3]]);if(this.canvas.id==='board' && img.src) spriteUrls.push(img.src);return draw.call(this,img,...args);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:value=>{
    const Base=value.Game;value.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};
    engine=value;
   }});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);

  for(const name of ['pp-chisato','pp-hina','rose-sayo']) assert.equal(await page.evaluate(n=>testGame.skills[n],name),false);
  await page.click('#settings-button');
  for(const name of ['pp-chisato','pp-hina','rose-sayo']) await page.check('#skill-options input[value="'+name+'"]');
  await page.click('button[type=submit]');await page.reload();await page.click('#overlay-action');
  for(const name of ['pp-chisato','pp-hina','rose-sayo']) assert.equal(await page.evaluate(n=>testGame.skills[n],name),true);
  await page.evaluate(async()=>{
   await Promise.all([...PicoRoster.characters,...PicoRoster.variants].map(c=>{const img=new Image();img.src=c.image;return img.decode();}));
   window.fixture=(name,x,y,extra={})=>({...PicoRoster.characters.find(c=>c.sourceName===name),id:'fixture-'+name,characterId:PicoRoster.characters.find(c=>c.sourceName===name).id,x,y,rotation:0,horizontal:false,...extra});
   testGame.pieces=[];testGame.active=fixture('rose-sayo',3,5);testGame.status='falling';advance(16);
  });
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('/rose-sayo.png'))));
  await page.evaluate(()=>{spriteUrls=[];});
  await page.keyboard.press('KeyW');await page.evaluate(()=>advance(16));
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('/rose-sayo-floating.png'))));
  assert.equal(await page.evaluate(()=>testGame.active),null);
  assert.ok(await page.evaluate(()=>testGame.pieces[0].floating));
  await page.evaluate(()=>advance(1200));assert.equal(await page.evaluate(()=>testGame.pieces[0].y),5);
  await page.evaluate(()=>{
   testGame.active=fixture('rose-sayo',5,4);testGame.status='falling';
  });
  await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>testGame.pieces.filter(p=>p.floating).length),2);
  await page.evaluate(()=>advance(1200));
  await page.evaluate(()=>{
   testGame.pieces=[];testGame.active=fixture('pp-chisato',2,4,{scale:3});testGame.status='falling';
   testGame.next={...testGame.active};advance(16);
  });
  await page.keyboard.press('KeyA');
  assert.match(await page.locator('#next-character').textContent(),/3 × 6/);
  assert.equal(await page.evaluate(()=>PicoEngine.cells(testGame.active).length),18);
  await page.screenshot({path:'docs/giant-chisato.png',fullPage:true});
  await page.evaluate(()=>{
   testGame.pieces=[fixture('rose-sayo',2,5,{floating:true}),fixture('rose-rinko',7,9)];testGame.active=fixture('pp-hina',4,2);testGame.status='falling';testGame.random=()=>0;
  });
  await page.evaluate(async()=>{const img=new Image();img.src='assets/effects/hina-wave.png';await img.decode();});
  await page.keyboard.press('KeyW');await page.evaluate(()=>advance(120));
  assert.ok(await page.evaluate(()=>beamSizes.length>0));
  assert.ok(await page.evaluate(()=>beamSizes.every(([w,h])=>Math.abs(Math.max(w,h)/(document.querySelector('#board').width/testGame.width)-.7)<1e-6)));
  assert.equal(await page.evaluate(()=>testGame.beam.duration),1000);
  assert.ok(await page.evaluate(()=>testGame.beam));assert.equal(await page.evaluate(()=>testGame.status),'falling');
  await page.evaluate(()=>advance(200));
  assert.deepEqual(await page.evaluate(()=>[testGame.pieces[0].x,testGame.pieces[0].y]),[2,5]);
  await page.screenshot({path:'docs/hina-beam-sayo-float.png',fullPage:true});
  await page.evaluate(()=>advance(400));
  assert.ok(await page.evaluate(()=>testGame.beam));
  assert.deepEqual(await page.evaluate(()=>[testGame.pieces[0].x,testGame.pieces[0].y]),[2,5]);
  await page.evaluate(()=>advance(400));
  assert.equal(await page.evaluate(()=>testGame.beam),null);
  assert.notDeepEqual(await page.evaluate(()=>[testGame.pieces[0].x,testGame.pieces[0].y]),[2,5]);
  assert.ok(await page.evaluate(()=>testGame.pieces[0].floating));
  await page.evaluate(()=>advance(1500));
  assert.equal(await page.evaluate(()=>testGame.active.sourceName),'pp-hina');
  await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>testGame.status),'falling');
  await page.evaluate(()=>{testGame.pieces=[];testGame.active=fixture('mor-mashiro',3,4);testGame.status='falling';});
  await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');
  assert.equal(await page.evaluate(()=>testGame.active),null);
  assert.equal(await page.evaluate(()=>testGame.status),'resolving');
  for(const rotation of [0,1,2,3]) {
    await page.evaluate(r=>{testGame.pieces=[];testGame.active={...fixture('mor-mashiro',3,3),rotation:r,horizontal:r%2===1};testGame.status='falling';},rotation);
    await page.keyboard.press('ArrowDown'); // Reset the natural-fall timer.
    const y=await page.evaluate(()=>testGame.active.y);
    await page.evaluate(()=>advance(352));
    assert.equal(await page.evaluate(()=>testGame.active.y),y+(rotation===2?1:0));
    await page.evaluate(()=>advance(352));
    assert.equal(await page.evaluate(()=>testGame.active.y),y+(rotation===2?3:1));
  }
  assert.deepEqual(errors,[]);
  console.log('New skills browser checks passed: defaults/persistence, W float, giant preview/render, beam before teleport.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
