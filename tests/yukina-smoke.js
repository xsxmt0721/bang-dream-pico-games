'use strict';
const {chromium}=require('playwright'),sharp=require('sharp'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   let engine,frame,time=1;requestAnimationFrame=fn=>{frame=fn;};window.advance=ms=>{time+=ms;frame(time);};
   Object.defineProperty(window,'PicoEngine',{get:()=>engine,set:v=>{const Base=v.Game;v.Game=class extends Base{constructor(...args){super(...args);window.testGame=this;}};engine=v;}});
  });
  await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
  await page.click('#settings-button');
  const checkbox=page.locator('input[value="rose-yukina"]');assert.equal(await checkbox.isChecked(),false);
  await checkbox.check();await page.click('button[type=submit]');await page.reload();
  assert.equal(await page.evaluate(()=>testGame.skills['rose-yukina']),true);
  await page.click('#overlay-action');
  await page.evaluate(async()=>{
   await Promise.all(PicoRoster.characters.map(c=>{const img=new Image();img.src=c.image;return img.decode();}));
   const member=(name,x,y)=>({...PicoRoster.characters.find(c=>c.sourceName===name),x,y,rotation:0,horizontal:false});
   testGame.pieces=[member('rose-sayo',0,9),member('rose-risa',1,9),member('rose-rinko',7,9)];
   testGame.next=member('rose-yukina',3,4);testGame.random=()=>0;testGame.spawn();testGame.active.y=4;advance(0);
  });
  const board=page.locator('#board');
  for(let pose=0;pose<3;pose++){
   if(pose===1)await page.keyboard.press('KeyQ');
   if(pose===2)await page.keyboard.press('ArrowRight');
   await page.evaluate(()=>advance(0));assert.equal(await page.evaluate(()=>testGame.blackout),true);
   const {data:dark,info}=await sharp(await board.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
   const center=await page.evaluate(()=>{const [w,h]=PicoEngine.dimensions(testGame.active);return {x:testGame.active.x+w/2,y:testGame.active.y+h/2,width:testGame.width,height:testGame.height};});
   await page.evaluate(()=>{testGame.active.powerSaving=false;advance(0);});
   const normal=await sharp(await board.screenshot()).removeAlpha().raw().toBuffer();
   const unit=info.width/center.width,vertical=info.height/center.height;
   let inside=0,outside=0,gradient=0;
   for(let y=24;y<info.height-24;y+=5)for(let x=24;x<info.width-24;x+=5){
    const distance=Math.hypot(x-center.x*unit,y-center.y*vertical),i=(y*info.width+x)*3;
    if(distance<unit-3){assert.deepEqual(dark.subarray(i,i+3),normal.subarray(i,i+3));inside++;}
    else if(distance>1.15*unit && distance<1.85*unit){
     const total=rgb=>rgb[i]+rgb[i+1]+rgb[i+2];
     const transmission=total(dark)/total(normal);
     const radius=distance/unit;
     const expected=radius<1.25 ? 1-.8*(radius-1) : radius>1.75 ? .8*(2-radius) : .8-1.2*(radius-1.25);
     assert.ok(Math.abs(transmission-expected)<.07);gradient++;
    }
    else if(distance>2*unit+3){assert.deepEqual([...dark.subarray(i,i+3)],[0,0,0],`pose=${pose} x=${x} y=${y} distance=${distance} radius=${unit*2}`);outside++;}
   }
   assert.ok(inside>100&&outside>100&&gradient>100);
   await page.evaluate(()=>{testGame.active.powerSaving=true;advance(0);});
  }
  await board.screenshot({path:'docs/yukina-spotlight.png'});
  await page.keyboard.press('Space');await page.evaluate(()=>advance(0));
  assert.equal(await page.evaluate(()=>testGame.blackout),false);
  const restored=await sharp(await board.screenshot()).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const corner=(8*restored.info.width+8)*3;assert.notDeepEqual([...restored.data.subarray(corner,corner+3)],[0,0,0]);
  assert.deepEqual(errors,[]);console.log('Yukina settings persist; circular two-cell spotlight follows movement/rotation, masks every outer pixel and ends on landing.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
