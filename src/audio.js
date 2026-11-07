(function(root){
 'use strict';
 const roster=typeof module!=='undefined'&&module.exports?require('./roster.js'):root.PicoRoster;
 const bonds=typeof module!=='undefined'&&module.exports?require('./bonds.js'):root.PicoBonds;
 const bondVoices=Object.fromEntries(bonds.map(b=>[b.name,[1,2].map(i=>`assets/audio/bonds/${b.name.replace(/[\\/]/g,'-')}/voice-${i}.mp3`)]));
 // Change the arrays to 2–5 entries when installing the final recordings.
 const voices=Object.fromEntries([...new Set([...[...roster.characters,...(roster.guests||[])].map(c=>c.sourceName),'hhw-misaki','am-mortis'])].map(name=>[name,[1,2,3].map(i=>`assets/audio/characters/${name}/voice-${i}.mp3`)]));
 const groups=Object.fromEntries([...roster.bands.map(b=>b.id),'crychic','aya-family','toyama-sisters','haneoka-trio'].map(id=>[id,`assets/audio/team-clears/${id}.mp3`]));
 const songs={
  crychic:{name:'CRYCHIC',title:'春日影（CRYCHIC 版）',src:'assets/audio/songs/crychic-haruhikage.ogg'},
  'aya-family':{name:'丸山彩家族',title:'しゅわりん☆どり〜みん',src:'assets/audio/songs/aya-family-shuwarin-dreaming.mp3'}
 };
 class AudioDirector{
  constructor(create=()=>new Audio(),random=Math.random){this.voice=create();this.group=create();this.random=random;this.lastId=null;this.pending=null;this.voiceToken=0;this.queue=[];this.paused=false;this.enabled=false;this.voice.muted=this.group.muted=true;this.group.onended=()=>this.nextGroup();this.group.onerror=()=>this.nextGroup();}
  play(audio){if(!this.paused&&audio.src)Promise.resolve(audio.play()).catch(()=>{});}
  stop(audio){audio.pause();audio.removeAttribute('src');audio.load();}
  characterClips(character){
   if(!character)return [];
   const name=character.sourceName==='hhw-michelle'&&!character.square?'hhw-misaki':character.sourceName;
   return voices[name]||[];
  }
  shuffled(clips){
   const list=[...clips];for(let i=list.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[list[i],list[j]]=[list[j],list[i]];}return list;
  }
  interruptVoice(){this.voiceToken++;this.voice.onerror=null;this.stop(this.voice);}
  speak(sources){
   this.interruptVoice();
   if(!this.group.loop){this.queue=[];this.stop(this.group);}
   const attempt=index=>{
    if(index>=sources.length)return;
    const token=++this.voiceToken;
    this.voice.onerror=null;this.stop(this.voice);this.voice.src=sources[index];
    const fallback=()=>{if(token===this.voiceToken)attempt(index+1);};
    this.voice.onerror=fallback;
    if(!this.paused)Promise.resolve(this.voice.play()).catch(error=>{if(error?.name==='NotSupportedError')fallback();});
   };
   attempt(0);
  }
  spawn(character,now=0){
   if(!character){this.pending=null;return;}
   if(character.id===this.lastId)return;
   this.lastId=character.id;
   this.pending={id:character.id,character,due:now+2000+this.random()*2000};
  }
  update(character,now){
   this.spawn(character,now);
   if(this.paused||!this.pending||now<this.pending.due)return;
   const pending=this.pending;this.pending=null;
   this.speak(this.shuffled(this.characterClips(pending.character)));
  }
  bond(hits,character){
   if(!hits?.length)return;
   this.pending=null;
   const hit=hits[Math.floor(this.random()*hits.length)];
   this.speak([...this.shuffled(bondVoices[hit.name]||[]),...this.shuffled(this.characterClips(character||hit.members?.[0]))]);
  }
  clear(ids){const tracks=ids.map(id=>groups[id]).filter(Boolean);if(!tracks.length)return;if(this.group.loop){this.speak(tracks);return;}this.queue=tracks;this.stop(this.group);this.nextGroup();}
  nextGroup(){if(this.group.loop)return;this.stop(this.group);const src=this.queue.shift();if(src){this.interruptVoice();this.group.src=src;this.play(this.group);}}
  song(id){this.pending=null;this.queue=[];this.interruptVoice();this.stop(this.group);this.group.loop=true;this.group.src=songs[id].src;
   let previous=0, audible=this.enabled;
   this.checkSongMute=()=>{if(!this.enabled)audible=false;};
   this.group.ontimeupdate=()=>{
    const time=this.group.currentTime;
    if(time<previous && previous>this.group.duration/2){
     if(audible && this.enabled)root.unlockAchievement?.(id);
     audible=this.enabled;
    }
    previous=time;
   };
   this.play(this.group);}
  stopSong(){this.group.ontimeupdate=null;this.checkSongMute=null;this.group.loop=false;this.stop(this.group);}
  setEnabled(enabled){this.enabled=enabled;this.checkSongMute?.();this.voice.muted=this.group.muted=!enabled;}
  setPaused(paused){if(this.paused===paused)return;this.paused=paused;if(paused){this.voice.pause();this.group.pause();}else{if(!this.voice.ended)this.play(this.voice);if(!this.group.ended)this.play(this.group);}}
  reset(){this.group.ontimeupdate=null;this.checkSongMute=null;this.lastId=null;this.pending=null;this.queue=[];this.group.loop=false;this.interruptVoice();this.stop(this.group);this.paused=false;}
 }
 const api={voices,bondVoices,groups,songs,AudioDirector};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PicoAudio=api;
})(typeof globalThis!=='undefined'?globalThis:this);
