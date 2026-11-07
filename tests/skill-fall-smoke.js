'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const runs=[];
  for(const mode of ['baseline','miss','hit']){
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    let frame,time=1,engine;
    requestAnimationFrame=fn=>{frame=fn;};
    window.advance=ms=>{while(ms>0){let dt=Math.min(ms,16);ms-=dt;time+=dt;frame(time);}};
    Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:value=>{const Base=value.Game;value.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=value;}});
    const draw=CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
     if(this.canvas.id==='board'&&img.src?.endsWith('/pp-hina.png'))window.hinaY=(this.getTransform().f+args[1])/(this.canvas.width/8);
     return draw.call(this,img,...args);
    };
   });
   await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
   await page.click('#overlay-action');
   await page.evaluate(async mode=>{
    const c=PicoRoster.characters.find(c=>c.sourceName==='pp-hina');const img=new Image();img.src=c.image;await img.decode();
    testGame.active={...c,characterId:c.id,id:'hina-fall',x:3,y:0,rotation:0};testGame.status='falling';testGame.skills['pp-hina']=true;
    testGame.pieces=['ag-ran','ag-moka'].map((s,i)=>({...PicoRoster.characters.find(c=>c.sourceName===s),id:'mate-'+i,x:i?7:0,y:9,rotation:0}));
    testGame.random=()=>mode==='hit'?0:.5;advance(800);
   },mode);
   const samples=[];
   for(let i=0;i<16;i++){
    if(mode!=='baseline')await page.keyboard.press('KeyW');
    samples.push(await page.evaluate(()=>{advance(32);return {y:hinaY,grid:testGame.active.y,status:testGame.status};}));
   }
   runs.push(samples);assert.equal(await page.evaluate(()=>!!testGame.active.beamUsed),mode==='hit');
   await page.keyboard.press('Space');
   await page.evaluate(()=>{window.rolls=0;testGame.random=()=>{rolls++;return 0;};});
   await page.keyboard.press('KeyW');await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>rolls),0);
   assert.deepEqual(errors,[]);await page.close();
  }
  assert.deepEqual(runs[1],runs[0],'failed W attempts preserve every sampled pixel/grid position');
  assert.deepEqual(runs[2],runs[0],'successful projectile preserves every sampled pixel/grid position');
  console.log('W fall continuity passed: baseline, repeated misses and successful beam have identical trajectories; landing disables rolls.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
