(function(root){
  'use strict';
  // Shared by scoring and the settings reference; points use the 1000-point base.
  const bonds = [
    ['ksar','ppp-kasumi','ppp-arisa',200],
    ['面包组','ppp-saaya','ppp-rimiri',100],
    ['蕾兔','ppp-otae','ras-layer',200],
    ['摩卡兰','ag-moka','ag-ran',200],
    ['巴绯','ag-tomoe','ag-himari',100],
    ['彩千圣','pp-aya','pp-chisato',200],
    ['薰千圣','hhw-kaoru','pp-chisato',100,.2],
    ['花千圣','hhw-kanon','pp-chisato',100],
    ['冰川双子','pp-hina','rose-sayo',300],
    ['大和伊芙','pp-maya','pp-ive',100],
    ['ykls','rose-yukina','rose-risa',200],
    ['akr','rose-ako','rose-rinko',200],
    ['mskk','hhw-kokoro','hhw-michelle',200],
    ['pachu','ras-pareo','ras-chuchu',200],
    ['lockmask','ras-lock','ras-masking',100],
    ['爱素','mygo-anon','mygo-soyo',200],
    ['爱灯','mygo-anon','mygo-tomori',100],
    ['灯希','mygo-taki','mygo-tomori',100],
    ['猫希','mygo-taki','mygo-rana',100],
    ['海希','mygo-taki','am-umiri',200],
    ['mana&uika','smm-mana','am-uika',100],
    ['初祥','am-uika','am-sakiko',200],
    ['灯祥','mygo-tomori','am-sakiko',100],
    ['素祥','mygo-soyo','am-sakiko',100],
    ['祥睦','am-mutsumi','am-sakiko',100],
    ['喵睦/喵莫','am-nyamu',['am-mutsumi','am-mortis'],100],
    ['冰川三明治','ag-tsugumi',['pp-hina','rose-sayo'],100,0,true]
  ].map(([name,a,b,points,negativeChance=0,triple=false])=>({name,a,b,points,negativeChance,triple}));
  if(typeof module!=='undefined'&&module.exports)module.exports=bonds;
  else root.PicoBonds=bonds;
})(typeof globalThis!=='undefined'?globalThis:this);
