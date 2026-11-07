const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=__dirname;
const ids=['am-uika','am-sakiko','am-mutsumi','am-umiri','am-nyamu','am-mortis','smm-mana'];
async function bounds(buffer) {
 const {data,info}=await sharp(buffer).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
   const alpha=data[(y*info.width+x)*4+3];
   if(alpha){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}else transparent++;
 }
 if(right<left)throw Error('Empty image');
 return {left,top,width:right-left+1,height:bottom-top+1,transparent};
}
(async()=>{
 const manifest=[],composites=[];
 const col=360,row=570,header=65;
 for(let i=0;i<ids.length;i++)for(const [j,view] of ['front','side'].entries()){
   const id=ids[i],input=path.join(root,'originals',id+'-'+view+'.png');
   const b=await bounds(input),crop={left:b.left,top:b.top,width:b.width,height:b.height};
   const width=Math.round(b.width/b.height*512);
   const output=path.join(root,view,id+'.png');
   await sharp(input).extract(crop).resize(width,512).png().toFile(output);
   for(let pass=0;pass<4;pass++){
     const v=await bounds(output);
     if(v.height===512)break;
     const bytes=await sharp(output).extract({left:v.left,top:v.top,width:v.width,height:v.height}).resize({height:512}).png().toBuffer();
     fs.writeFileSync(output,bytes);
   }
   const m=await sharp(output).metadata(),visible=await bounds(output);
   if(!m.hasAlpha || m.height!==512 || visible.height!==512 || !visible.transparent)throw Error('Invalid sprite '+output);
   manifest.push({id,view,path:view+'/'+id+'.png',width:m.width,height:m.height,visibleHeight:visible.height,alpha:true,source:'originals/'+id+'-'+view+'.png'});
   const thumb=await sharp(output).resize({height:460}).toBuffer(),meta=await sharp(thumb).metadata();
   composites.push({input:thumb,left:i*col+Math.floor((col-meta.width)/2),top:header+j*row+40});
 }
 const labels='<svg width="'+(col*7)+'" height="'+(header+row*2)+'"><style>text{font-family:Arial,sans-serif;fill:#f3f5f8}</style><text x="24" y="38" font-size="24">PICO REVIEW · FRONT / LEFT PROFILE · 512px transparent PNG</text>'+
 ids.map((id,i)=>'<text x="'+(i*col+col/2)+'" y="92" text-anchor="middle" font-size="20">'+id+'</text>').join('')+
 ids.map((id,i)=>'<text x="'+(i*col+col/2)+'" y="662" text-anchor="middle" font-size="20">'+id+' · SIDE</text>').join('')+'</svg>';
 composites.push({input:Buffer.from(labels),left:0,top:0});
 await sharp({create:{width:col*7,height:header+row*2,channels:4,background:'#526977'}}).composite(composites).png().toFile(path.join(root,'review-contact-sheet.png'));
 fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(manifest,null,2));
 console.log(JSON.stringify(manifest,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
