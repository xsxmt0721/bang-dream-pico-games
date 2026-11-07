'use strict';
// Optional integration test: requires Playwright and a Chromium installation.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, deviceScaleFactor: 1 });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.spriteDraws = {};
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        if (image.src && /rose-ako|ppp-arisa|ras-pareo/.test(image.src) && args.length === 4) {
          window.spriteDraws[image.src.split('/').pop()] = { width: args[2], height: args[3], ratio: image.naturalWidth / image.naturalHeight };
        }
        return drawImage.call(this, image, ...args);
      };
      let engine;
      Object.defineProperty(window, 'PicoEngine', { get: () => engine, set: value => {
        const Base = value.Game;
        value.Game = class extends Base { constructor(...args) { super(...args); window.testGame = this; } };
        engine = value;
      }});
    });
    await page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
    await page.waitForFunction(() => window.testGame?.status === 'ready');
    assert.equal(await page.evaluate(() => testGame.characters.some(c => c.bandId === 'ave-mujica')), true);
    assert.equal(await page.evaluate(() => testGame.characters.length), 45);
    assert.deepEqual(await page.evaluate(() => [testGame.width,testGame.height]), [8,11]);
    const assetCheck = await page.evaluate(async () => Promise.all([...PicoRoster.characters,...PicoRoster.obstacles].map(c => new Promise(resolve => { const img = new Image(); img.onload = () => resolve(true); img.onerror = () => resolve(c.image); img.src = c.image; }))));
    assert.ok(assetCheck.every(x => x === true), JSON.stringify(assetCheck.filter(x=>x!==true)));
    await page.screenshot({ path: 'docs/game-ready.png', fullPage: true });
    await page.click('#overlay-action'); assert.equal(await page.evaluate(() => testGame.status), 'falling');
    const beforeX = await page.evaluate(() => testGame.active.x); await page.keyboard.press('ArrowLeft'); assert.equal(await page.evaluate(() => testGame.active.x), beforeX-1);
    await page.keyboard.press('KeyQ'); assert.equal(await page.evaluate(() => testGame.active.horizontal), true);
    await page.keyboard.press('Space'); await page.waitForFunction(() => testGame.pieces.length === 1 && testGame.status === 'falling');
    await page.keyboard.press('KeyP'); assert.equal(await page.locator('#overlay-title').textContent(), '演出暂停');
    const pauseY = await page.evaluate(() => testGame.active.y); await page.waitForTimeout(850); assert.equal(await page.evaluate(() => testGame.active.y), pauseY);
    await page.keyboard.press('KeyP'); assert.equal(await page.locator('#overlay').isVisible(), false);
    await page.click('#settings-button'); assert.equal(await page.locator('#width-input,#height-input').count(),2);
    await page.locator('#band-options input').evaluateAll(inputs => inputs.forEach(i => i.checked = false));
    await page.click('button[type=submit]'); assert.match(await page.locator('#settings-error').textContent(), /至少/);
    await page.check('#band-options input[value="hello-happy-world"]'); await page.click('button[type=submit]');
    await page.waitForFunction(() => testGame.width === 8 && testGame.status === 'falling');
    await page.evaluate(() => { const c = PicoRoster.characters.find(c => c.square); testGame.active = { ...c, x:3,y:0,horizontal:false,rotation:0 }; testGame.next = null; });
    await page.keyboard.press('KeyQ'); assert.equal(await page.evaluate(() => PicoEngine.cells(testGame.active).length), 4);
    await page.keyboard.press('Space'); await page.waitForFunction(() => testGame.pieces.some(p => p.square));
    assert.equal(await page.evaluate(() => testGame.pieces.find(p => p.square).y), 9);
    // Place a varied representative scene through the engine, then verify a real
    // hard drop. This is a visual fixture, not prefilled production gameplay.
    await page.click('#settings-button'); await page.click('#select-all');
    assert.equal(await page.locator('#band-options input:checked').count(), 10);
    await page.uncheck('#band-options input[value="ave-mujica"]'); await page.click('button[type=submit]');
    await page.evaluate(() => {
      const specifications = [[0,0,9,0],[7,1,9,0],[11,2,9,0],[15,3,9,0],[24,4,9,0],[30,6,9,0],[35,7,9,0],[1,0,7,1],[8,2,7,0],[16,3,7,1],[25,5,7,1],[36,7,7,0],[4,1,5,0],[18,3,5,0],[33,5,5,0]];
      testGame.pieces = specifications.map(([i,x,y,rotation]) => ({...PicoRoster.characters[i],x,y,rotation,horizontal:rotation%2===1}));
      const c = PicoRoster.characters[31]; testGame.active = {...c,x:4,y:2,rotation:0,horizontal:false}; testGame.next = PicoRoster.characters[10];
      testGame.pieces.push({id:'food-demo-1',obstacle:'coffee',x:0,y:6},{id:'food-demo-2',obstacle:'cornet',x:4,y:6},{id:'food-demo-3',obstacle:'croquette',x:7,y:6});
    });
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => ['rose-ako.png','ppp-arisa.png','ras-pareo.png'].every(name => spriteDraws[name]));
    const draws = await page.evaluate(() => spriteDraws);
    const pigtails = ['rose-ako.png','ppp-arisa.png','ras-pareo.png'].map(name => draws[name]);
    assert.equal(new Set(pigtails.map(d => d.height)).size, 1);
    for (const draw of pigtails) { assert.ok(Math.abs(draw.width / draw.height - draw.ratio) < .0001); assert.ok(draw.width > draw.height / 2); }
    assert.equal(await page.evaluate(() => testGame.pieces.filter(p => ['ppp-arisa','rose-ako','ras-pareo'].includes(p.sourceName)).every(p => PicoEngine.cells(p).length === 2)), true);
    await page.screenshot({ path: 'docs/game-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: 'docs/game-mobile.png', fullPage: true });
    await page.locator('[data-action="left"]').click();
    await page.locator('[data-action="drop"]').click();
    // Only overflow ends the game.
    await page.evaluate(() => { testGame.end('overflow'); }); await page.click('#settings-button'); await page.click('#cancel-settings');
    await page.waitForFunction(() => document.getElementById('overlay-title').textContent === '舞台已经满员了！');
    assert.equal(await page.locator('#overlay-title').textContent(), '舞台已经满员了！');
    await page.click('#overlay-action'); assert.equal(await page.evaluate(() => testGame.status), 'falling');
    assert.deepEqual(errors, []);
    console.log('Browser smoke passed: file:// loading, 45 sprites, controls, pause, settings, Michelle, mobile, loss/restart.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
