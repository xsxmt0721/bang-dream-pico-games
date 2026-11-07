'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:1000}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      let engine, callback, time=0;
      window.requestAnimationFrame=fn=>{callback=fn;};
      window.advance=ms=>{while(ms>0){const step=Math.min(16,ms);ms-=step;time+=step;callback(time);}};
      Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:value=>{
        const Base=value.Game; value.Game=class extends Base {constructor(...args){super(...args);window.testGame=this;}};engine=value;
      }});
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.click('#settings-button');
    assert.equal(await page.locator('#skill-options input:checked').count(),12);
    assert.equal(await page.locator('#band-options input:checked').count(),9);
    await page.fill('#width-input','5'); await page.click('button[type=submit]');
    assert.equal(await page.locator('#settings-dialog').evaluate(d=>d.open),true);
    await page.fill('#width-input','6.5'); assert.equal(await page.locator('#width-input').evaluate(i=>i.validity.stepMismatch),true);
    await page.fill('#width-input','6'); await page.fill('#height-input','8'); await page.fill('#speed-input','125');
    await page.uncheck('#skill-options input[value="hhw-michelle"]');
    await page.click('button[type=submit]');
    assert.deepEqual(await page.evaluate(()=>[testGame.width,testGame.height]),[6,8]);
    assert.equal(await page.locator('#board-size').textContent(),'6 × 8');
    await page.evaluate(()=>advance(160)); assert.ok(await page.evaluate(()=>testGame.active.y>-2));
    await page.reload(); await page.click('#settings-button');
    assert.equal(await page.inputValue('#width-input'),'6');
    assert.equal(await page.inputValue('#height-input'),'8');
    assert.equal(await page.inputValue('#speed-input'),'125');
    assert.equal(await page.isChecked('#skill-options input[value="hhw-michelle"]'),false);
    await page.screenshot({path:'docs/custom-settings.png',fullPage:true});
    await page.click('#cancel-settings'); await page.click('#overlay-action');
    await page.evaluate(()=>{
      testGame.active={...PicoRoster.characters.find(c=>c.sourceName==='hhw-kokoro'),x:2,y:3,rotation:0,horizontal:false};
    });
    await page.keyboard.press('KeyW');
    assert.equal(await page.evaluate(()=>testGame.active.rotation),0);
    assert.equal(await page.evaluate(()=>testGame.active.y),2);
    await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>testGame.active.y),1);
    await page.evaluate(()=>{
      const c=PicoRoster.characters.find(c=>c.sourceName==='hhw-michelle');
      testGame.next=testGame.form(c);
      testGame.active={...testGame.next,x:2,y:2,rotation:0,horizontal:false};
      advance(16);
    });
    await page.keyboard.press('KeyA');
    assert.match(await page.locator('#next-character img').getAttribute('src'),/front\/hhw-misaki\.png/);
    assert.equal(await page.evaluate(()=>PicoEngine.cells(testGame.active).length),2);
    await page.evaluate(()=>{
      testGame.active={...PicoRoster.characters.find(c=>c.sourceName==='mor-mashiro'),x:2,y:3,rotation:2,horizontal:false};
    });
    await page.keyboard.press('KeyQ');
    assert.deepEqual(await page.evaluate(()=>testGame.direction()),[0,1]);
    const y=await page.evaluate(()=>testGame.active.y);
    await page.evaluate(()=>advance(130));
    assert.ok(await page.evaluate(()=>testGame.active.y)>y);
    await page.setViewportSize({width:390,height:844}); await page.click('#settings-button');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:'docs/custom-settings-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('Custom settings and skills browser checks passed.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
