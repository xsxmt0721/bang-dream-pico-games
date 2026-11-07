'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine,frame,time=1;requestAnimationFrame=fn=>{frame=fn;};window.advance=ms=>{while(ms>0){const dt=Math.min(ms,16);time+=dt;ms-=dt;frame(time);}};
   window.foodDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='board'&&/baguette|parfait|cucumber|stone/.test(img.src))foodDraws.push({src:img.src,args});return draw.call(this,img,...args);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.click('#settings-button');
  for(const id of ['mygo-rana','rose-yukina'])assert.equal(await page.isChecked('input[value="'+id+'"]'),false);
  await page.check('input[value="mygo-rana"]');await page.click('button[type=submit]');await page.reload();await page.click('#overlay-action');
  assert.equal(await page.evaluate(()=>testGame.skills['mygo-rana']),true);
  await page.evaluate(async()=>{
   await Promise.all([...PicoRoster.obstacles,...PicoRoster.characters].map(o=>{const img=new Image();img.src=o.image;return img.decode();}));
   window.rana=()=>({...PicoRoster.characters.find(c=>c.sourceName==='mygo-rana'),id:'test-rana',characterId:'mygo-3',x:3,y:3,rotation:0,horizontal:false});
   testGame.active=rana();testGame.pieces=[];testGame.status='falling';advance(16);
  });
  await page.keyboard.press('ArrowLeft');assert.equal(await page.evaluate(()=>testGame.active.x),2);
  await page.keyboard.press('KeyQ');assert.equal(await page.evaluate(()=>testGame.active.rotation),1);
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>testGame.active.rotation),0);
  await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>testGame.active.y),4);
  await page.evaluate(()=>{
   testGame.active=rana();testGame.pieces=[{id:'h',obstacle:'baguette',horizontal:true,x:0,y:10},{id:'v',obstacle:'baguette',horizontal:false,x:3,y:9},{id:'p',obstacle:'parfait',x:6,y:9},{id:'c',obstacle:'cucumber',x:4,y:10},{id:'s',obstacle:'stone',x:5,y:10}];advance(16);
  });
  assert.ok(await page.evaluate(()=>foodDraws.some(d=>d.src.endsWith('/baguette.png'))&&foodDraws.some(d=>d.src.endsWith('/parfait.png'))));
  for(const name of ['baguette','parfait','cucumber','stone'])assert.ok(await page.evaluate(n=>foodDraws.some(d=>d.src.endsWith('/'+n+'.png')),name));
  await page.locator('#board').screenshot({path:'docs/new-foods.png'});
  await page.evaluate(()=>advance(100));
  assert.equal(await page.evaluate(()=>testGame.active),null);
  assert.deepEqual(await page.evaluate(()=>{const r=testGame.pieces.find(p=>p.sourceName==='mygo-rana');return [r.x,r.y,r.horizontal];}),[6,9,false]);
  assert.equal(await page.evaluate(()=>testGame.pieces.some(p=>p.obstacle==='parfait')),false);
  assert.equal(await page.evaluate(()=>testGame.clearedObstacles),1);
  await page.evaluate(()=>advance(150));
  assert.deepEqual(errors,[]);console.log('New food sprites render; Rana/Yukina default off, Rana remains controllable and replaces parfait on contact-free dash.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
