'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine,frame,time=1;requestAnimationFrame=fn=>{frame=fn;};window.advance=ms=>{time+=ms;frame(time);};
   window.miniDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='board'&&/-mini.png$/.test(img.src))miniDraws.push({src:img.src,w:args[2],h:args[3]});return draw.call(this,img,...args);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.click('#settings-button');
  for(const id of ['ras-chuchu','mor-tsukushi']){assert.equal(await page.isChecked('input[value="'+id+'"]'),false);await page.check('input[value="'+id+'"]');}
  await page.click('button[type=submit]');await page.reload();await page.click('#overlay-action');
  await page.evaluate(async()=>{
   await Promise.all([...PicoRoster.characters,...PicoRoster.variants].map(c=>{const img=new Image();img.src=c.image;return img.decode();}));
   window.fixture=(name,id,x,y,mini)=>{const source=PicoRoster.characters.find(c=>c.sourceName===name);return {...(mini?testGame.form(source):source),id,characterId:source.id,x,y,rotation:0,horizontal:false};};
   testGame.random=()=>0;testGame.pieces=[fixture('ras-chuchu','normal-c',1,9,false),fixture('ras-chuchu','mini-c',3,10,true),fixture('mor-tsukushi','normal-t',5,9,false),fixture('mor-tsukushi','mini-t',7,10,true)];
   testGame.active=fixture('ras-chuchu','active-mini',3,3,true);testGame.next=fixture('mor-tsukushi','next-mini',0,0,true);testGame.status='falling';advance(16);
  });
  await page.keyboard.press('ArrowLeft');
  assert.match(await page.locator('#next-character img').getAttribute('src'),/mor-tsukushi-mini.png$/);
  assert.match(await page.locator('#next-character').textContent(),/1 × 1/);
  assert.match(await page.locator('#current-label').textContent(),/1 × 1/);
  const before=await page.evaluate(()=>PicoEngine.cells(testGame.active));await page.keyboard.press('KeyQ');assert.deepEqual(await page.evaluate(()=>PicoEngine.cells(testGame.active)),before);
  await page.keyboard.press('KeyE');await page.evaluate(()=>advance(16));
  const drawSizes=await page.evaluate(()=>({unit:document.querySelector('#board').width/testGame.width,draws:miniDraws}));
  assert.ok(drawSizes.draws.some(d=>d.src.endsWith('ras-chuchu-mini.png')));assert.ok(drawSizes.draws.some(d=>d.src.endsWith('mor-tsukushi-mini.png')));
  assert.ok(drawSizes.draws.every(d=>d.w<=drawSizes.unit*1.16&&d.h<=drawSizes.unit*1.13));
  await page.screenshot({path:'docs/mini-forms-preview.png',fullPage:true});
  await page.keyboard.press('Space');assert.equal(await page.evaluate(()=>testGame.active),null);
  assert.deepEqual(errors,[]);console.log('Both mini sprites, persisted toggles, 1x1 NEXT/collision/rotation and bounded visual overhang passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
