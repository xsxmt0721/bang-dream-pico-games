'use strict';
// Recolor only the two hair-color regions; keep original alpha and all other pixels.
const sharp=require('sharp'),fs=require('fs');
(async()=>{
 const {data,info}=await sharp('assets/characters/front/ras-pareo.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 // Hina's character blue: #55DDEE. Current blue-white sprite is an imagegen edit;
 // this legacy script can rebuild a deterministic hair-only variant with the same palette.
 const palettes={'black-white':[[45,46,55],[237,237,243]],'green-white':[[237,237,243],[126,197,123]],'yellow-red':[[224,77,98],[250,211,76]],'blue-white':[[85,221,238],[237,237,243]]};
 const mask=Buffer.alloc(info.width*info.height);
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
  const i=(y*info.width+x)*4,[r,g,b,a]=data.subarray(i,i+4);
  const edge=y<210?130:y<310?140:105;
  const hair=y<124||(y<380&&(x<edge||x>info.width-edge));
  const ribbon=(y>40&&y<78&&((x>88&&x<119)||(x>300&&x<334)));
  if(!hair||ribbon||!a)continue;
  if(r>g*1.12&&b>g*1.08&&b>r*.5&&r>100)mask[y*info.width+x]=1;
  else if(g>r*1.12&&b>r*1.12&&g>90)mask[y*info.width+x]=2;
 }
 for(const [name,colors]of Object.entries(palettes)){
  const out=Buffer.from(data);
  for(let k=0;k<mask.length;k++)if(mask[k]){
   const i=k*4,base=mask[k]===1?[250,164,224]:[146,237,242],target=colors[mask[k]-1];
   const ratio=(data[i]+data[i+1]+data[i+2])/(base[0]+base[1]+base[2]);
   for(let c=0;c<3;c++)out[i+c]=Math.round(Math.max(0,Math.min(255,ratio<=1?target[c]*ratio:target[c]+(255-target[c])*Math.min(1,(ratio-1)*4))));
  }
  await sharp(out,{raw:info}).png().toFile('assets/characters/front/ras-pareo-'+name+'.png');
 }
 await sharp(mask.map(v=>v?255:0),{raw:{width:info.width,height:info.height,channels:1}}).png().toFile('assets/characters/review-skills/pareo-hair-mask.png');
})();
