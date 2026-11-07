'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{let engine;requestAnimationFrame=()=>{};Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});});
  await page.goto(pathToFileURL(path.resolve('index.html')).href);
  await page.click('#settings-button');
  assert.equal(await page.locator('#skill-options details').count(),24);
  const option=page.locator('.skill-option').filter({has:page.locator('input[value="bonds"]')});
  assert.match(await option.textContent(),/部分角色相连会有额外得分/);
  await option.locator('summary').click();assert.equal(await option.locator('input').isChecked(),false);
  assert.match(await option.locator('details p').textContent(),/冰川三明治/);
  assert.match(await option.locator('details p').textContent(),/20% −100/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await option.locator('input').check();await page.click('button[type=submit]');
  await page.evaluate(()=>{testGame.active={...PicoRoster.characters.find(c=>c.sourceName==='hhw-kokoro'),x:3,y:4,rotation:0,horizontal:false};testGame.status='falling';});
  await page.keyboard.press('KeyQ');assert.equal(await page.evaluate(()=>testGame.active.rotation),1);
  await page.keyboard.press('KeyE');assert.equal(await page.evaluate(()=>testGame.active.rotation),0);
  await page.keyboard.press('KeyW');assert.equal(await page.evaluate(()=>testGame.active.y),3);
  assert.equal(await page.evaluate(()=>testGame.skills.bonds),true);assert.deepEqual(errors,[]);
  console.log('Bonds settings, mobile layout, Q/E rotation and W skill passed.');
 }finally{await browser.close();}
})();
