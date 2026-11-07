'use strict';
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      let callback, timestamp = 1, engine;
      window.frameDraws = [];
      window.requestAnimationFrame = fn => { callback = fn; return 1; };
      window.advance = ms => {
        while (ms > 0) { const step = Math.min(16,ms); ms -= step; timestamp += step; window.frameDraws = []; callback(timestamp); }
      };
      Object.defineProperty(window, 'PicoEngine', { get:()=>engine, set:value=> {
        const Base=value.Game; value.Game=class extends Base { constructor(...args) { super(...args); window.testGame=this; this.random=()=>.5; } }; engine=value;
      }});
      const draw = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image,...args) {
        if(this.canvas.id==='board' && args.length===4) {
          const unit=this.canvas.width/8, matrix=this.getTransform();
          window.frameDraws.push({ name:image.src ? image.src.split('/').pop() : 'silhouette', y:(matrix.f+args[1])/unit, alpha:this.globalAlpha });
        }
        return draw.call(this,image,...args);
      };
      localStorage.setItem('pico-settings-v2',JSON.stringify({width:8,height:11,interval:700,bandIds:['poppin-party','afterglow','hello-happy-world']}));
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.waitForFunction(()=>testGame && document.querySelector('#next-character img')?.complete);
    await page.evaluate(async()=>Promise.all([...PicoRoster.characters,...PicoRoster.obstacles].map(c=>new Promise(resolve=>{const img=new Image();img.onload=resolve;img.src=c.image;}))));
    assert.deepEqual(await page.evaluate(()=>[testGame.width,testGame.height]),[8,11]);
    await page.click('#overlay-action');
    await page.evaluate(()=>{ testGame.active={...PicoRoster.characters[0],x:2,y:0,horizontal:false,rotation:0}; advance(720); });
    const normalStart=await page.evaluate(()=>frameDraws.find(d=>d.name==='ppp-kasumi.png').y);
    await page.evaluate(()=>advance(240));
    const normalMiddle=await page.evaluate(()=>frameDraws.find(d=>d.name==='ppp-kasumi.png').y);
    assert.ok(normalMiddle>normalStart+.2 && normalMiddle<normalStart+.6,'automatic fall interpolates between rows');
    await page.keyboard.press('KeyP'); await page.evaluate(()=>advance(300));
    assert.equal(await page.evaluate(()=>frameDraws.find(d=>d.name==='ppp-kasumi.png').y),normalMiddle);
    await page.keyboard.press('KeyP');
    await page.keyboard.press('ArrowDown'); await page.evaluate(()=>advance(40));
    const softY=await page.evaluate(()=>frameDraws.find(d=>d.name==='ppp-kasumi.png').y);
    assert.ok(softY>normalMiddle && softY<2,'soft drop animates');
    await page.keyboard.press('Space'); await page.evaluate(()=>advance(80));
    const hardY=await page.evaluate(()=>frameDraws.find(d=>d.name==='ppp-kasumi.png').y);
    assert.ok(hardY>softY && hardY<9,'hard drop animates before locking resolution');
    await page.evaluate(()=>advance(500));

    // One band, two adjacent food items, an unrelated diagonal food item and a
    // supported survivor. The survivor cannot move until the white fade ends.
    await page.evaluate(()=>{
      testGame.active=null; testGame.status='resolving'; testGame.phase='check'; testGame.chain=0;
      testGame.pieces=PicoRoster.characters.slice(0,5).map((c,i)=>({...c,x:i,y:9,horizontal:false,rotation:0}));
      testGame.pieces.push({...PicoRoster.characters[5],x:0,y:7,horizontal:false,rotation:0},
        {id:'food-a',obstacle:'coffee',x:5,y:10},{id:'food-b',obstacle:'cornet',x:6,y:10},{id:'food-c',obstacle:'croquette',x:7,y:9});
      advance(16);
    });
    assert.equal(await page.evaluate(()=>testGame.lastEvent.type),'clear');
    assert.equal(await page.evaluate(()=>testGame.lastEvent.obstacles),2);
    assert.equal(await page.evaluate(()=>frameDraws.filter(d=>d.name==='silhouette' && d.alpha===1).length),7);
    const survivorStart=await page.evaluate(()=>frameDraws.find(d=>d.name==='ag-ran.png').y);
    await page.screenshot({path:'docs/clear-white.png',fullPage:true});
    await page.evaluate(()=>advance(330));
    const fades=await page.evaluate(()=>frameDraws.filter(d=>d.name==='silhouette').map(d=>d.alpha));
    assert.equal(fades.length,7); assert.ok(fades.every(a=>a>.5 && a<.8));
    assert.equal(await page.evaluate(()=>frameDraws.find(d=>d.name==='ag-ran.png').y),survivorStart);
    await page.keyboard.press('KeyP'); await page.evaluate(()=>advance(300));
    assert.deepEqual(await page.evaluate(()=>frameDraws.filter(d=>d.name==='silhouette').map(d=>d.alpha)),fades);
    await page.keyboard.press('KeyP'); await page.evaluate(()=>advance(350));
    assert.equal(await page.evaluate(()=>frameDraws.find(d=>d.name==='ag-ran.png').y),survivorStart);
    await page.evaluate(()=>advance(110));
    assert.equal(await page.evaluate(()=>testGame.lastEvent.type),'gravity');
    const fallingSurvivor=await page.evaluate(()=>frameDraws.find(d=>d.name==='ag-ran.png').y);
    assert.ok(fallingSurvivor>survivorStart && fallingSurvivor<9);
    assert.ok(await page.evaluate(()=>frameDraws.filter(d=>d.name==='silhouette').every(d=>d.alpha===0)));
    await page.evaluate(()=>advance(600));
    assert.equal(await page.evaluate(()=>testGame.pieces.find(p=>p.sourceName==='ag-ran').y),9);

    // Force the exact two-coffee event and verify no keyboard controls affect it.
    await page.evaluate(()=>{
      testGame.pieces=[]; testGame.status='falling'; testGame.random=()=>.6;
      testGame.active={...PicoRoster.characters.find(c=>c.sourceName==='ag-tsugumi'),x:0,y:0,horizontal:false,rotation:0};
    });
    await page.keyboard.press('Space'); await page.evaluate(()=>advance(400));
    assert.equal(await page.evaluate(()=>testGame.lastEvent.type),'obstacles');
    const obstacleState=await page.evaluate(()=>testGame.pieces.filter(p=>p.obstacle).map(p=>({...p})));
    assert.equal(obstacleState.length,2); assert.notEqual(obstacleState[0].x,obstacleState[1].x);
    const coffeeStart=await page.evaluate(()=>frameDraws.filter(d=>d.name==='coffee.png').map(d=>d.y));
    for(const key of ['ArrowLeft','KeyQ','ArrowDown','Space']) await page.keyboard.press(key);
    assert.deepEqual(await page.evaluate(()=>testGame.pieces.filter(p=>p.obstacle)),obstacleState);
    await page.evaluate(()=>advance(160));
    const coffeeMiddle=await page.evaluate(()=>frameDraws.filter(d=>d.name==='coffee.png').map(d=>d.y));
    assert.ok(coffeeMiddle.every((y,i)=>y>coffeeStart[i] && y<obstacleState[i].y));
    await page.screenshot({path:'docs/obstacles-falling.png',fullPage:true});
    await page.evaluate(()=>advance(700)); assert.equal(await page.evaluate(()=>testGame.status),'falling');
    assert.deepEqual(errors,[]);
    console.log('Animation checks passed: saved-settings migration; smooth auto/soft/hard drop; pause; white hold/fade before gravity; uncontrolled two-lane food drop.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
