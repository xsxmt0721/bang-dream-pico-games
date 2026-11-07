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

  await page.click('#settings-button');
  assert.equal(await page.isChecked('#skill-options input[value="am-mutsumi"]'),true);
  for(const name of ['hhw-kanon','ras-pareo','toyama-asuka']){assert.equal(await page.isChecked('#skill-options input[value="'+name+'"]'),false);await page.check('#skill-options input[value="'+name+'"]');}
  await page.click('button[type=submit]');
  assert.ok(await page.evaluate(()=>testGame.characters.some(c=>c.sourceName==='toyama-asuka')));
  await page.evaluate(async()=>{
   await Promise.all([...PicoRoster.characters,...PicoRoster.guests,...PicoRoster.variants,...PicoRoster.obstacles].map(c=>{const image=new Image();image.src=c.image;return image.decode();}));
   window.fixture=(name,x=2,y=3)=>({...[...PicoRoster.characters,...PicoRoster.guests].find(c=>c.sourceName===name),x,y,rotation:0,horizontal:false});
   testGame.pieces=[];testGame.active=fixture('hhw-kaoru');testGame.status='falling';spriteUrls=[];advance(16);
  });
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('hhw-kaoru-sleep.png'))));
  await page.keyboard.press('Space');await page.evaluate(()=>{spriteUrls=[];advance(80);});
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('hhw-kaoru-sleep.png'))));
  await page.evaluate(()=>advance(1000));
  await page.evaluate(()=>{testGame.pieces=[fixture('hhw-kaoru',0,8)];testGame.active=null;testGame.status='ready';spriteUrls=[];advance(16);});
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('/hhw-kaoru.png'))));
  await page.evaluate(()=>{testGame.pieces=[fixture('hhw-kaoru',0,5)];spriteUrls=[];advance(16);});
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('hhw-kaoru-sleep.png'))));
  await page.evaluate(()=>{testGame.pieces=[];testGame.active=fixture('hhw-kanon');testGame.status='falling';testGame.random=()=>0;});
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>testGame.active.x),1);
  await page.keyboard.press('KeyQ');assert.equal(await page.evaluate(()=>testGame.active.rotation),3);
  await page.evaluate(()=>{testGame.active=fixture('hhw-kokoro');});
  await page.keyboard.press('KeyW');await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>testGame.active.y),1);assert.equal(await page.evaluate(()=>testGame.active.rotation),0);
  await page.evaluate(()=>{
   testGame.pieces=[];testGame.active=fixture('toyama-asuka');testGame.next=fixture('toyama-asuka');spriteUrls=[];advance(16);
  });
  await page.keyboard.press('ArrowLeft');assert.match(await page.locator('#next-character').textContent(),/户山明日香/);
  assert.ok(await page.evaluate(()=>spriteUrls.some(s=>s.endsWith('toyama-asuka.png'))));
  await page.evaluate(()=>{
   testGame.pieces=[fixture('toyama-asuka',0,9),fixture('ppp-kasumi',1,9)];testGame.active=null;testGame.status='resolving';testGame.phase='check';advance(1500);
  });
  assert.match(await page.locator('#chain-banner').textContent(),/户山姐妹羁绊/);
  await page.evaluate(()=>{
   testGame.pieces=[fixture('hhw-kaoru',0,8),fixture('toyama-asuka',7,8)];
   for(let i=0;i<6;i++){testGame.random=()=>[.2,.5,.65,.75,.85,.95][i];const p=testGame.form(fixture('ras-pareo',i+1,8));p.id='pareo-display-'+i;p.characterId='raise-a-suilen-4';testGame.pieces.push(p);}
   testGame.active=null;testGame.status='ready';spriteUrls=[];advance(16);
  });
  for(const name of ['black-white','green-white','yellow-red','blue-white','purple-white'])assert.ok(await page.evaluate(n=>spriteUrls.some(s=>s.endsWith('ras-pareo-'+n+'.png')),name));
  await page.screenshot({path:'docs/expanded-character-skills.png',fullPage:true});
  assert.deepEqual(errors,[]);console.log('Expanded skills UI passed: default switches, Kaoru expressions, Kanon reversal, Kokoro rise, Asuka spawn/clear, six PAREO sprites.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
