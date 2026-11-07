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
  assert.ok(await page.evaluate(()=>testGame.bandIds.includes('ave-mujica')));
  assert.equal(await page.evaluate(()=>testGame.skills['aya-family']),false);
  assert.equal(await page.evaluate(()=>testGame.skills['ag-moka']),true);
  assert.equal(await page.evaluate(()=>testGame.skills['mygo-tomori']),true);
  await page.click('#overlay-action');
  assert.match(await page.locator('#pool-note').textContent(),/43 \/ 45/);
  await page.evaluate(async()=>{
   await Promise.all(PicoRoster.obstacles.map(c=>{const img=new Image();img.src=c.image;return img.decode();}));
   const c=PicoRoster.characters.find(c=>c.sourceName==='mygo-tomori');
   testGame.random=()=>0;testGame.pieces=[];
   testGame.active={...c,id:'tomori-fixture',characterId:c.id,x:3,y:9,rotation:0};
   testGame.lock();advance(16);
  });
  assert.equal(await page.evaluate(()=>testGame.lastEvent.type),'obstacles');
  await page.evaluate(()=>advance(1400));
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('/stone.png'))));
  assert.ok(await page.evaluate(()=>testGame.pieces.some(p=>p.obstacle==='stone')));
  await page.evaluate(()=>{
   const c=PicoRoster.characters.find(c=>c.sourceName==='ag-moka');
   testGame.pieces=[{id:'stone-fixture',obstacle:'stone',x:0,y:10},{id:'coffee-fixture',obstacle:'coffee',x:1,y:10}];
   testGame.active={...c,id:'moka-fixture',characterId:c.id,x:3,y:9,rotation:0};
   testGame.status='falling';testGame.lock();advance(16);
  });
  assert.equal(await page.evaluate(()=>testGame.lastEvent.skill),'商店街荣誉市民');
  assert.ok(await page.evaluate(()=>testGame.pieces.some(p=>p.obstacle==='stone')));
  assert.ok(await page.evaluate(()=>!testGame.pieces.some(p=>p.obstacle==='coffee')));
  assert.match(await page.locator('#chain-banner').textContent(),/商店街荣誉市民/);
  await page.evaluate(()=>advance(1200));
  await page.click('#settings-button');
  await page.locator('#band-options input').evaluateAll(inputs=>inputs.forEach(i=>i.checked=i.value==='sumimi'));
  await page.click('button[type=submit]');
  assert.deepEqual(await page.evaluate(()=>testGame.characters.map(c=>c.sourceName)),['am-uika','smm-mana']);
  assert.equal(await page.locator('[data-band-id="sumimi"] .member-slot').count(),2);
  await page.evaluate(()=>{
   const cast=testGame.characters;
   testGame.pieces=cast.map((c,i)=>({...c,characterId:c.id,id:'fixture-'+i,x:i,y:9,horizontal:false,rotation:0}));
   testGame.active=null;testGame.status='resolving';testGame.phase='check';advance(16);
  });
  assert.deepEqual(await page.evaluate(()=>testGame.lastEvent.rules),['sumimi']);
  assert.equal(await page.evaluate(()=>testGame.score),1000);
  await page.keyboard.press('Enter');
  await page.evaluate(()=>advance(1200));
  await page.click('#settings-button');await page.check('#band-options input[value="ave-mujica"]');
  await page.click('button[type=submit]');
  await page.evaluate(()=>{
   const c=PicoRoster.characters.find(c=>c.sourceName==='am-uika');
   testGame.pieces=[{...c,characterId:c.id,id:'uika-fixture',x:0,y:9}];
  });
  await page.keyboard.press('KeyA');
  for(const id of ['sumimi','ave-mujica']){
   assert.equal(await page.locator('[data-band-id="'+id+'"] .member-slot.present').count(),1);
   assert.equal(await page.locator('[data-band-id="'+id+'"] .band-progress').textContent(),id==='sumimi'?'1 / 2':'1 / 5');
  }
  await page.evaluate(async()=>{
   const img=new Image();img.src='assets/characters/front/am-mortis.png';await img.decode();
   const c=PicoRoster.characters.find(c=>c.sourceName==='am-mutsumi');
   testGame.random=()=>0;
   const form=testGame.form(c);
   testGame.pieces=[];testGame.active={...form,characterId:c.id,id:'mortis-fixture',x:2,y:9,horizontal:false,rotation:0};
   testGame.status='falling';advance(16);
  });
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('/am-mortis.png'))));
  await page.keyboard.press('Space');await page.evaluate(()=>advance(120));
  assert.equal(await page.evaluate(()=>testGame.lastEvent.skill),'全都不会弹');
  assert.equal(await page.evaluate(()=>testGame.score),10);
  assert.match(await page.locator('#chain-banner').textContent(),/不计分/);
  await page.evaluate(()=>advance(1200));
  await page.click('#settings-button');
  await page.check('#skill-options input[value="aya-family"]');
  await page.uncheck('#skill-options input[value="crychic"]');
  await page.uncheck('#skill-options input[value="am-mortis"]');
  await page.click('button[type=submit]');await page.reload();
  assert.equal(await page.evaluate(()=>testGame.skills['aya-family']),true);
  assert.equal(await page.evaluate(()=>testGame.skills.crychic),false);
  assert.equal(await page.evaluate(()=>testGame.skills['am-mortis']),false);
  assert.deepEqual(errors,[]);
  console.log('Pool/skills and cross-band UI passed: default switches, pool count, stone render, Moka animation, family persistence; sumimi-only pool/clear, shared Uika progress, Mortis sprite/zero-clear-score, switches persist.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
