'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const [name,roll,shape]of [['horizontal-baguette',.45,[2,1]],['parfait',.75,[1,2]]]){
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine,frame,time=1;requestAnimationFrame=fn=>{frame=fn;};window.advance=ms=>{while(ms>0){const dt=Math.min(16,ms);ms-=dt;time+=dt;frame(time);}};
   window.foodDraws=[];const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){if(this.canvas.id==='board'&&/baguette|parfait/.test(img.src))foodDraws.push(img.src);return draw.call(this,img,...args);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);await page.click('#overlay-action');
  await page.evaluate(async roll=>{
   await Promise.all([...PicoRoster.characters,...PicoRoster.obstacles].map(o=>{const img=new Image();img.src=o.image;return img.decode();}));
   const c=PicoRoster.characters.find(c=>c.sourceName==='ppp-saaya');testGame.active={...c,characterId:c.id,id:'saaya',x:3,y:3,rotation:0,horizontal:false};testGame.status='falling';
   testGame.pieces=[{id:'support',obstacle:'stone',x:7,y:10}];testGame.skills['ppp-saaya']=true;const rolls=[roll,.99999];testGame.random=()=>rolls.length?rolls.shift():.9;advance(16);
  },roll);
  await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>testGame.pendingObstacles.length),1);
  await page.evaluate(()=>advance(400));
  assert.equal(await page.evaluate(()=>testGame.lastEvent.type),'obstacles');
  assert.ok(await page.evaluate(()=>foodDraws.length>0));
  await page.locator('#board').screenshot({path:'docs/saaya-'+name+'-falling.png'});
  await page.evaluate(()=>advance(650));
  const food=await page.evaluate(()=>{const p=testGame.pieces.find(p=>p.obstacle==='baguette'||p.obstacle==='parfait');return {kind:p.obstacle,x:p.x,y:p.y,horizontal:p.horizontal,dimensions:PicoEngine.dimensions(p)};});
  assert.deepEqual(food.dimensions,shape);assert.equal(food.x,shape[0]===2?6:7);assert.equal(food.y,shape[1]===2?8:9);
  await page.locator('#board').screenshot({path:'docs/saaya-'+name+'-landed.png'});
  assert.deepEqual(errors,[]);console.log(name+' actual Saaya spawn, falling animation and landing passed: '+JSON.stringify(food));await page.close();
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
