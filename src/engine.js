(function (root) {
  'use strict';
  const bonds = typeof module !== 'undefined' && module.exports ? require('./bonds') : root.PicoBonds;
  const key = (x, y) => `${x},${y}`;
  function dimensions(piece) {
    if (piece.shopping) return [3,2];
    if (piece.mini) return [1,1];
    if (piece.obstacle === 'baguette') return piece.horizontal ? [2,1] : [1,2];
    if(piece.obstacle==='collection-tower')return [1,2];
    if(piece.obstacle==='collection-angel')return [3,4];
    if (piece.obstacle === 'parfait') return [1,2];
    if (piece.obstacle) return [1,1];
    if (piece.square) return [2,2];
    const scale = piece.scale || 1;
    return piece.horizontal ? [2*scale,scale] : [scale,2*scale];
  }
  function cells(piece) {
    if(piece.obstacle==='collection-angel')return [[1,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[1,3]].map(([x,y])=>[piece.x+x,piece.y+y]);
    if(piece.shopping)return [[0,0],[1,0],[2,0],[1,1]].map(([x,y])=>[piece.x+x,piece.y+y]);
    const [w,h] = dimensions(piece), result = [];
    for (let y=0;y<h;y++) for (let x=0;x<w;x++) result.push([piece.x+x,piece.y+y]);
    return result;
  }
  // Grid anchors at the head/foot edges of the rotated bounding box.
  function ends(piece) {
    if(piece.shopping)return [[piece.x+1,piece.y],[piece.x+1,piece.y+1]];
    if (piece.mini) return [[piece.x,piece.y],[piece.x,piece.y]];
    const r = piece.rotation ?? (piece.horizontal ? 1 : 0), scale=piece.scale || 1;
    return [[[0,0],[2*scale-1,0],[scale-1,2*scale-1],[0,scale-1]][r],
      [[0,2*scale-1],[0,0],[scale-1,0],[2*scale-1,scale-1]][r]]
      .map(([x,y]) => [piece.x+x,piece.y+y]);
  }
  function occupancy(pieces) {
    const map = new Map();
    for (const piece of pieces) for (const [x, y] of cells(piece)) map.set(key(x, y), piece);
    return map;
  }
  function fits(piece, pieces, width, height) {
    const map = occupancy(pieces.filter(p => p.id !== piece.id));
    return cells(piece).every(([x, y]) => x >= 0 && x < width && y >= -Math.max(2, 2*(piece.scale || 1)) && y < height && !map.has(key(x, y)));
  }
  function connectedGroups(pieces) {
    const map = occupancy(pieces), visited = new Set(), groups = [];
    for (const piece of pieces) {
      if (piece.obstacle || visited.has(piece.id)) continue;
      const group = [], queue = [piece];
      visited.add(piece.id);
      while (queue.length) {
        const current = queue.pop();
        group.push(current);
        for (const [x, y] of cells(current)) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const neighbor = map.get(key(x + dx, y + dy));
          if (neighbor && !neighbor.obstacle && neighbor.bandId === piece.bandId && !visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor);
          }
        }
      }
      const numbers = new Set(group.map(p => p.number));
      if ([1, 2, 3, 4, 5].every(number => numbers.has(number))) groups.push(group);
    }
    return groups;
  }
  function ruleGroups(pieces, memberKey, required) {
    const eligible = pieces.filter(p => !p.obstacle && memberKey(p) != null);
    const map = occupancy(eligible), visited = new Set(), result = [];
    for (const piece of eligible) {
      if (visited.has(piece.id)) continue;
      const queue = [piece], group = []; visited.add(piece.id);
      while (queue.length) {
        const current = queue.pop(); group.push(current);
        for (const [x,y] of cells(current)) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          const neighbor = map.get(key(x+dx,y+dy));
          if (neighbor && !visited.has(neighbor.id)) { visited.add(neighbor.id); queue.push(neighbor); }
        }
      }
      const members = new Set(group.map(memberKey));
      if (required.every(value => members.has(value))) result.push(group);
    }
    return result;
  }
  function bandNumber(piece, bandId) {
    if (piece.guest) return null;
    if (piece.sourceName==='ras-pareo' && bandId==='pastel-palettes' && piece.pareoNumber) return piece.pareoNumber;
    if (piece.sourceName === 'am-uika') return ['ave-mujica','sumimi'].includes(bandId) ? 1 : null;
    return piece.bandNumbers?.[bandId] ?? (piece.bandId === bandId ? piece.number : null);
  }
  function clearGroups(pieces, bandIds, skills = {}) {
    const result = [], consumed = new Set();
    const addRule = (id, memberKey, required) => {
      for (const members of ruleGroups(pieces.filter(p => !consumed.has(p.id)), memberKey, required)) {
        result.push({ id, members }); for (const p of members) consumed.add(p.id);
      }
    };
    if(skills['toyama-asuka']===true){
      for(const [id,names] of [['toyama-sisters',['toyama-asuka','ppp-kasumi']],['haneoka-trio',['toyama-asuka','rose-ako','ras-lock']]])
        addRule(id,p=>names.includes(p.sourceName)?p.sourceName:null,names);
    }
    // Overlapping rules consume a character once. Disjoint groups can clear together.
    if (bandIds.includes('ave-mujica')) addRule('ave-mujica', p => bandNumber(p,'ave-mujica'), [1,2,3,4,5]);
    if (skills.crychic !== false) {
      const names = ['am-sakiko','am-mutsumi','mygo-taki','mygo-soyo','mygo-tomori'];
      addRule('crychic', p => names.includes(p.sourceName) ? p.sourceName : null, names);
    }
    if (skills['aya-family'] === true) {
      const names = ['pp-aya','mygo-anon','mor-nanami','ag-himari','ras-pareo'];
      addRule('aya-family', p => {
        // Without the color skill, PAREO retains her original pink-blue hair.
        if (p.sourceName === 'ras-pareo' && (p.pareoColor ?? 'pink-blue') !== 'pink-blue') return null;
        return names.includes(p.sourceName) ? p.sourceName : null;
      }, names);
    }
    const ordinary = bandIds.filter(id => !['ave-mujica','sumimi'].includes(id));
    // RAS must consume overlapping PAREO before PP, independent of selection order.
    if (ordinary.includes('raise-a-suilen')) addRule('raise-a-suilen', p => bandNumber(p,'raise-a-suilen'), [1,2,3,4,5]);
    for (const id of ordinary.filter(id => id !== 'raise-a-suilen'))
      addRule(id, p => bandNumber(p,id), [1,2,3,4,5]);
    if (bandIds.includes('sumimi')) addRule('sumimi', p => bandNumber(p,'sumimi'), [1,2]);
    return result;
  }
  function directNeighbors(piece, pieces) {
    const map = occupancy(pieces), neighbors = new Map([[piece.id,piece]]);
    for (const [x,y] of cells(piece)) for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const neighbor = map.get(key(x+dx,y+dy));
      if (neighbor && !neighbor.obstacle) neighbors.set(neighbor.id,neighbor);
    }
    return [...neighbors.values()];
  }
  function connectedObstacles(pieces, cleared) {
    const map = occupancy(pieces), visited = new Set(), result = [], queue = [...cleared];
    while (queue.length) {
      for (const [x, y] of cells(queue.pop())) for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const neighbor = map.get(key(x + dx, y + dy));
        if (neighbor?.obstacle && !['stone','doll'].includes(neighbor.obstacle) && !neighbor.obstacle.startsWith('collection-') && !visited.has(neighbor.id)) {
          visited.add(neighbor.id); result.push(neighbor); queue.push(neighbor);
        }
      }
    }
    if(cleared.some(p=>p.sourceName==='mor-nanami'))result.push(...pieces.filter(p=>p.obstacle?.startsWith('collection-')));
    if (cleared.some(p => p.sourceName === 'mygo-tomori')) result.push(...pieces.filter(p => p.obstacle === 'stone'));
    return result;
  }
  function obstacleRoll(character, width, random, pieces = [], difficulty = 'easy') {
    const hard=difficulty==='hard';
    if(character.sourceName==='mor-nanami'){
 const candidates=pieces.filter(p=>p.obstacle&&!p.obstacle.startsWith('collection-'));
 const removed=[];
 while(removed.length<5&&candidates.length){const p=candidates.splice(Math.floor(random()*candidates.length),1)[0];removed.push(p);pieces.splice(pieces.indexOf(p),1);}
 character.collectedObstacles=removed;
 const area=removed.reduce((n,p)=>n+cells(p).length,0);
 if(!area||(!hard&&random()>=.6))return [];
 let budget=Math.floor(area*((hard?.4:.3)+random()*.2));const drops=[];
 while(budget>0){const options=[['collection-bust',1,1],['collection-crocodile',1,1],['collection-tower',2,1],['collection-angel',8,3]].filter(([,n,w])=>n<=budget&&w<=width);const [kind,n,w]=options[Math.floor(random()*options.length)];drops.push({kind,x:Math.floor(random()*(width-w+1))});budget-=n;}
 return drops;
 }
 let kind,count=0,horizontal=false;
    if(character.sourceName==='ag-tsugumi'){
      const roll=random();kind='coffee';count=hard?(roll<.2?1:roll<.5?2:roll<.7?3:roll<.8?4:0):(roll<.5?1:roll<.8?2:0);
    }else if(character.sourceName==='ppp-saaya'){
      const roll=random();count=roll<.8?1:0;
      kind=roll<.4?'cornet':roll<.7?'baguette':'parfait';horizontal=roll>=.4&&roll<.55; if(hard&&count&&random()<.5)count*=2;
    }else if(['mygo-tomori','am-mutsumi'].includes(character.sourceName)){
      kind={'mygo-tomori':'stone','am-mutsumi':'cucumber'}[character.sourceName];const roll=random();count=hard?(roll<.3?1:roll<.6?2:roll<.8?3:0):(roll<.8?1:0);
    }else if(character.sourceName==='hhw-hagumi'){
      kind='croquette';count=1;
      if(hard){count=3+Math.floor(Math.log1p(-Math.min(random(),1-Number.EPSILON))/Math.log(.5));}else if(random()<.5){
        // Inverse CDF of the geometric tail: each additional drop has 20% chance.
        count=2+Math.floor(Math.log1p(-Math.min(random(),1-Number.EPSILON))/Math.log(.2)+1e-12);
      }
    }
    if(character.sourceName==='mygo-taki'){
      const coffee=random()<.8, parfait=random()<(hard?.3:.2), drops=[];
      const count=coffee?(hard&&random()<.5?2:1):0;
      for(let i=0;i<count;i++)drops.push({kind:'coffee',x:Math.floor(random()*width)});
      if(parfait)drops.push({kind:'parfait',x:Math.floor(random()*width)});
      return drops;
    }
    const result=[],lanes=Array.from({length:width},(_,i)=>i);
    for(let i=0;i<count;i++){
      const span=kind==='baguette'&&horizontal?2:1;
      const x=kind==='coffee'?lanes.splice(Math.floor(random()*lanes.length),1)[0]:Math.floor(random()*(width-span+1));
      result.push(kind==='baguette'?{kind,x,horizontal}:{kind,x});
    }
    if (character.sourceName === 'ppp-saaya') {
      if(hard)for(let i=0;i<Math.floor(pieces.filter(p=>!p.obstacle).length/12);i++)result.push({kind:random()<.5?'baguette':'cornet',x:Math.floor(random()*width)});
      if (pieces.some(p => p.sourceName === 'ppp-rimiri'))
        result.push({kind:'cornet', x:Math.floor(random()*width)});
      if (pieces.some(p => p.sourceName === 'ag-moka')) {
        const horizontal = width > 1 && random() < .5;
        result.push({kind:'baguette', horizontal, x:Math.floor(random()*(width-Number(horizontal)))});
      }
    }
    return result;
  }
  // 找出可以同时下落的一组刚体，支持互相搭接但整体悬空的情况。
  function gravityStep(pieces, height) {
    const map = occupancy(pieces), movable = new Set(pieces.filter(p => !p.floating).map(p => p.id));
    let changed = true;
    while (changed) {
      changed = false;
      for (const piece of pieces) {
        if (!movable.has(piece.id)) continue;
        const blocked = cells(piece).some(([x, y]) => {
          const below = map.get(key(x, y + 1));
          return y + 1 >= height || (below && below.id !== piece.id && !movable.has(below.id));
        });
        if (blocked) { movable.delete(piece.id); changed = true; }
      }
    }
    for (const piece of pieces) if (movable.has(piece.id)) piece.y++;
    return movable.size;
  }
  function settle(pieces, height) {
    let distance = 0;
    while (gravityStep(pieces, height)) distance++;
    return distance;
  }
  class Game {
    constructor({ width = 8, height = 11, bandIds, characters, skills = {}, difficulty = 'easy', random = Math.random }) {
      if (!Number.isSafeInteger(width) || width < 6 || !Number.isSafeInteger(height) || height < 8) throw new Error('Invalid board dimensions');
      if (!Array.isArray(bandIds) || !bandIds.length || !Array.isArray(characters)) throw new Error('Select at least one band');
      this.difficulty=difficulty; this.width = width; this.height = height; this.random = random; this.skills = { ...skills };
      this.bandIds = [...bandIds];
      this.characters = characters.filter(c => c.guest ? skills[c.sourceName]===true : bandIds.some(id => bandNumber(c,id) != null)).map(c => {
        const bandId = c.guest ? 'guest' : bandIds.includes(c.bandId) ? c.bandId : bandIds.find(id => bandNumber(c,id) != null);
        return { ...c, bandId, number: c.guest ? 1 : bandNumber(c,bandId) };
      });
      if (!this.characters.length) throw new Error('No characters');
      this.bandPools=new Map();this.poolMembers=new Map();
      for(const c of this.characters){
        // Uika shares the two-member sumimi pool only when Mujica is disabled.
        const id=c.sourceName==='am-uika'?(bandIds.includes('ave-mujica')?'ave-mujica':'sumimi'):c.bandId;
        if(!this.bandPools.has(id)){this.bandPools.set(id,new Set());this.poolMembers.set(id,[]);}
        this.bandPools.get(id).add(c.id);this.poolMembers.get(id).push(c);
      }
      this.pieces = []; this.active = null; this.next = null; this.status = 'ready';
      this.score = 0; this.clearedBands = 0; this.chain = 0; this.maxChain = 0; this.reason = null;
      this.phase = 'check'; this.lastEvent = null;
      this.scoredBonds = new Set(); this.landingBondsPending = false;
      this.characterSerial = 0;
      this.pendingObstacles = []; this.obstacleSerial = 0; this.clearedObstacles = 0;
    }
    skill(character) { return ['am-umiri','pp-chisato','pp-hina','rose-sayo','hhw-kanon','ras-pareo','toyama-asuka'].includes(character.sourceName) ? this.skills[character.sourceName] === true : this.skills[character.sourceName] !== false; }
    form(character) {
      if(character.sourceName==='am-umiri' && this.skill(character) && this.random()<(this.difficulty==='hard'?.3:.15))return {...character,shopping:true,spriteId:'umiri-shopping',image:'assets/characters/front/am-umiri-shopping.png'};
      if (['ras-chuchu','mor-tsukushi'].includes(character.sourceName) && this.skills[character.sourceName] === true) {
        const mini = this.random() < .3;
        return mini ? {...character,mini:true,spriteId:character.sourceName+'-mini',image:'assets/characters/front/'+character.sourceName+'-mini.png'} : {...character,mini:false};
      }
      if(character.sourceName==='ras-pareo'&&this.skill(character)){
        const roll=this.random(),i=roll<.4?0:roll<.6?1:roll<.7?2:roll<.8?3:roll<.9?4:5;
        const numbers=[1,null,4,3,2,5],colors=['pink-blue','black-white','green-white','yellow-red','blue-white','purple-white'];
        return {...character,pareoNumber:numbers[i],pareoColor:colors[i],spriteId:i?'pareo-'+colors[i]:character.id,image:i?'assets/characters/front/ras-pareo-'+colors[i]+'.png':character.image};
      }
      if (character.sourceName === 'pp-chisato' && this.skill(character)) {
        const roll=this.random();
        return { ...character, scale: this.difficulty==='hard' ? (roll<.32?2:roll<.40?3:roll<.41?4:1) : (roll < .24 ? 2 : roll < .29 ? 3 : 1) };
      }
      if (character.sourceName === 'am-mutsumi') {
        const mortis = this.random() < .5;
        return { ...character, sourceName: mortis ? 'am-mortis' : 'am-mutsumi',
          displayName: mortis ? '莫缇斯' : character.displayName,
          image: mortis ? 'assets/characters/front/am-mortis.png' : character.image };
      }
      if (character.sourceName !== 'hhw-michelle') return { ...character };
      const square = this.skill(character) && this.random() < .5;
      return { ...character, square, displayName: square ? '米歇尔' : '奥泽美咲',
        image: square ? character.image : 'assets/characters/front/hhw-misaki.png' };
    }
    direction() {
      return [0,1];
    }
    fallInterval(baseInterval) {
      if(this.parfaitDash)return Math.min(100,baseInterval);
      return this.active?.sourceName === 'mor-mashiro' && this.skill(this.active) && this.active.rotation === 2
        ? baseInterval / (this.difficulty==='hard'?5:3) : baseInterval;
    }
    get blackout() {
      return this.status === 'falling' && this.active?.sourceName === 'rose-yukina' && this.active.powerSaving === true;
    }
    powerSavingChance() {
      const teammates = new Set(this.pieces.filter(p => !p.obstacle &&
        ['rose-sayo','rose-risa','rose-ako','rose-rinko'].includes(p.sourceName)).map(p => p.sourceName));
      return Math.max(0, teammates.size - 1) * .25;
    }
    get parfaitDash() {
      return this.active?.sourceName === 'mygo-rana' && !this.active.ateParfait && this.skills['mygo-rana'] === true && this.pieces.some(p=>p.obstacle==='parfait');
    }
    eatParfait() {
      if(this.status!=='falling'||!this.parfaitDash)return false;
      const desserts=this.pieces.filter(p=>p.obstacle==='parfait');
      const target=desserts[Math.floor(this.random()*desserts.length)];
      this.pieces=this.pieces.filter(p=>p.id!==target.id);
      this.active={...this.active,ateParfait:true,x:target.x,y:target.y,rotation:0,horizontal:false};
      this.caughtParfait=true;this.score+=200;this.clearedObstacles++;this.lock();return true;
    }
    get pool() { return new Set([...this.bandPools.values()].flatMap(pool=>[...pool])); }
    available() { const pool=this.pool;return this.characters.filter(c=>pool.has(c.id)); }
    canonicalId(member) {
      const sourceName=member.sourceName==='am-mortis'?'am-mutsumi':member.sourceName==='hhw-misaki'?'hhw-michelle':member.sourceName;
      return this.characters.find(c=>c.id===(member.characterId||member.id)||(sourceName&&c.sourceName===sourceName))?.id;
    }
    returnToPool(members) {
      const affected=new Set(members.map(p=>this.canonicalId(p)));
      const present=new Set([...this.pieces,this.active,this.next].filter(Boolean).map(p=>this.canonicalId(p)));
      for(const [id,cast] of this.poolMembers){
        if(!cast.some(c=>affected.has(c.id)))continue;
        for(const c of cast)if(!present.has(c.id))this.bandPools.get(id).add(c.id);
      }
    }
    choose() {
      // Refill exhausted ordinary bands independently, unless a member returned.
      for(const [id,pool] of this.bandPools)
        if(id!=='guest'&&(id!=='sumimi'||this.poolMembers.get(id).length>1)&&!pool.size)for(const c of this.poolMembers.get(id))pool.add(c.id);
      const total=[...this.bandPools.values()].reduce((sum,pool)=>sum+pool.size,0);
      if(!total)return null;
      // Uniform offsets weight each band by its remaining members.
      let offset=Math.floor(this.random()*total),selected;
      for(const pool of this.bandPools.values()){
        if(offset>=pool.size){offset-=pool.size;continue;}
        const id=[...pool][offset];pool.delete(id);selected=this.characters.find(c=>c.id===id);break;
      }
      let character=this.form(selected);
      if(character.shopping||character.square||character.scale>=2){
        let room=false;
        for(let y=0;y<this.height&&!room;y++)for(let x=0;x<this.width&&!room;x++)room=fits({...character,x,y},this.pieces,this.width,this.height);
        if(!room)character={...character,shopping:false,square:false,scale:1,spriteId:undefined,image:character.sourceName==='hhw-michelle'?'assets/characters/front/hhw-misaki.png':selected.image,displayName:character.sourceName==='hhw-michelle'?'奥泽美咲':selected.displayName};
      }
      return {...character,characterId:character.id,id:'character-'+(++this.characterSerial)};
    }
    start() { if (this.status === 'ready') this.spawn(); }
    spawn() {
      const character = this.next || this.choose();
      this.next = null;
      this.active = { ...character, x: Math.floor((this.width - dimensions(character)[0]) / 2), y: -dimensions(character)[1], horizontal: false, rotation: 0 };
      if (character.sourceName === 'mor-mashiro' && this.skill(character)) this.active.rotation = 2;
      if (character.sourceName === 'rose-yukina' && this.skills['rose-yukina'] === true) {
        const chance = this.powerSavingChance();
        this.active.powerSaving = chance > 0 && this.random() < chance;
      }
      this.next = this.choose();
      this.status = 'falling'; this.chain = 0;
    }
    move(dx, dy = 0) {
      if (this.status !== 'falling') return false;
      const candidate = { ...this.active, x: this.active.x + dx, y: this.active.y + dy };
      if (!fits(candidate, this.pieces, this.width, this.height)) return false;
      this.active = candidate; return true;
    }
    moveHorizontal(dx) {
      if(this.status!=='falling')return false;
      if(this.active.sourceName==='hhw-kanon'&&this.skill(this.active)&&this.random()<(this.difficulty==='hard'?.5:.3))dx=-dx;
      return this.move(dx);
    }
    rise() {
      return this.status==='falling'&&this.active.sourceName==='hhw-kokoro'&&this.skill(this.active)&&this.move(0,-1);
    }
    rotate(pivot = 'head', turn = 1) {
      if (this.status !== 'falling') return false;
      if (pivot === 'foot' || this.active.shopping) return false;
      if(this.active.sourceName==='hhw-kanon'&&this.skill(this.active)&&this.random()<(this.difficulty==='hard'?.5:.3))turn=-turn;
      const rotation = ((this.active.rotation ?? (this.active.horizontal ? 1 : 0)) + turn + 4) % 4;
      const candidate = { ...this.active, rotation, horizontal: rotation % 2 === 1 };
      if (!candidate.square) {
        const index = pivot === 'foot' ? 1 : 0;
        const anchor = ends(this.active)[index], shifted = ends(candidate)[index];
        candidate.x += anchor[0]-shifted[0]; candidate.y += anchor[1]-shifted[1];
      }
      if (!fits(candidate, this.pieces, this.width, this.height)) return false;
      this.active = candidate; return true;
    }
    float() {
      if (this.status !== 'falling' || this.active.sourceName !== 'rose-sayo' || !this.skill(this.active)) return false;
      this.active.floating = true;
      this.lock(); return true;
    }
    teammates(a,b) {
      return a.id !== b.id && !b.obstacle && this.bandIds.some(id => bandNumber(a,id) != null && bandNumber(b,id) != null);
    }
    connectedToTeam(target) {
      return directNeighbors(target,[...this.pieces.filter(p=>p.id!==target.id),target]).some(p=>this.teammates(target,p));
    }
    fireBeam() {
      if (this.status !== 'falling' || this.active.sourceName !== 'pp-hina' || !this.skill(this.active) || this.active.beamUsed || this.random() >= .15) return false;
      const options=this.pieces.filter(p=>!p.obstacle && !this.connectedToTeam(p))
        .map(target=>({target,spaces:this.teleportSpaces(target).filter(pos=>this.connectedToTeam({...target,...pos}))}))
        .filter(option=>option.spaces.length);
      if (!options.length) return false;
      const {target,spaces}=options[Math.floor(this.random()*options.length)];
      this.active.beamUsed=true;
      this.beam={source:{...this.active},target:{...target},destination:spaces[Math.floor(this.random()*spaces.length)]};

      return true;
    }
    finishBeam() {
      const beam=this.beam;this.beam=null;
      if (!beam) return false;
      const target=this.pieces.find(p=>p.id===beam.target.id);
      if (!target) return false;
      // The falling character may now occupy the originally chosen destination.
      const spaces=this.teleportSpaces(target).filter(pos=>this.connectedToTeam({...target,...pos}));
      const destination=spaces.find(pos=>pos.x===beam.destination.x && pos.y===beam.destination.y) || spaces[Math.floor(this.random()*spaces.length)];
      if (!destination) return false;
      Object.assign(target,destination);this.beamNeedsGravity=true;
      return true;
    }
    teleportSpaces(target) {
      const result=[], [w,h]=dimensions(target);
      for(let y=0;y<=this.height-h;y++) for(let x=0;x<=this.width-w;x++)
        if ((x!==target.x || y!==target.y) && fits({...target,x,y},[...this.pieces,...(this.active?[this.active]:[])],this.width,this.height)) result.push({x,y});
      return result;
    }
    ghost() {
      if (!this.active) return null;
      const result = { ...this.active };
      const [dx,dy] = this.direction();
      if (!dx && !dy) return result;
      while (fits({ ...result, x: result.x+dx, y: result.y+dy }, this.pieces, this.width, this.height)) { result.x += dx; result.y += dy; }
      return result;
    }
    smashObstacle() {
      const p=this.active;
      if(!p||p.sourceName!=='mor-mashiro'||!this.skill(p)||p.rotation!==2||p.smashedObstacle)return false;
      const next=new Set(cells({...p,y:p.y+1}).map(([x,y])=>key(x,y)));
      const target=this.pieces.find(q=>q.obstacle&&cells(q).some(([x,y])=>next.has(key(x,y))));
      if(!target)return false;
      p.smashedObstacle=true;this.pieces=this.pieces.filter(q=>q!==target);this.clearedObstacles++;this.score+=200;
      this.smashRemoved=[target];return true;
    }
    tick() {
      this.smashObstacle();
      if(this.eatParfait())return;
      if (this.direction().every(n=>n===0)) return;
      if (this.status === 'falling' && !this.move(...this.direction())) this.lock();
    }
    softDrop() {
      this.smashObstacle();
      if(this.eatParfait())return;
      if (this.status !== 'falling' || this.direction().every(n=>n===0)) return;
      if (this.move(...this.direction())) this.score++; else this.lock();
    }
    hardDrop() {
      if(this.eatParfait())return;
      if (this.status !== 'falling' || this.direction().every(n=>n===0)) return;
      let ghost = this.ghost();
      if(this.active?.sourceName==='mor-mashiro'){const original=this.active;this.active=ghost;if(this.smashObstacle())ghost=this.ghost();this.active={...original,smashedObstacle:this.active.smashedObstacle};}
      this.score += (Math.abs(ghost.x-this.active.x) + Math.abs(ghost.y-this.active.y)) * 2;
      this.active = ghost; this.lock();
    }
    lock() {
      if (!this.active) return;
      const landed = this.active;
      this.landedCharacter = landed;
      this.pieces.push(landed); this.active = null;
      this.score += 10;
      this.landingBondsPending = true;
      // 严格按高度 > h 判负，恰好到顶仍可继续。
      if (this.pieces.some(p => cells(p).some(([, y]) => y < 0))) { this.end('overflow'); return; }
      this.status = 'resolving'; this.phase = this.beamNeedsGravity ? 'gravity' : 'check'; this.beamNeedsGravity=false; this.chain = 0;
      this.pendingObstacles = (this.skill(landed) ? obstacleRoll(landed, this.width, this.random, this.pieces, this.difficulty) : []).map(drop => ({
        id: `obstacle-${++this.obstacleSerial}`, obstacle: drop.kind, horizontal:drop.horizontal,
        x: drop.x, y: -dimensions({obstacle:drop.kind,horizontal:drop.horizontal})[1]
      }));
      if (this.pendingObstacles.length) this.phase = 'obstacles';
      for (const p of this.pieces) {
        if (p.armIn > 0) p.armIn--;
        if (p.obstacle === 'doll' && --p.life === 0) this.phase = 'gravity';
      }
      this.pieces = this.pieces.filter(p => p.life !== 0);
      if (landed.sourceName === 'am-mortis' && this.skill(landed)) {
        const roll = this.random();
        if (roll < .35) {
          const [cx,cy] = ends(landed)[0], radius = roll < .30 ? 1 : 2;
          this.mortisTargets = this.pieces.filter(p => !p.obstacle && cells(p).some(([x,y]) =>
            roll < .15 ? x === cx : Math.abs(x-cx) <= radius && Math.abs(y-cy) <= radius));
          if (roll >= .30) this.pendingObstacles.push({id:'doll-'+ ++this.obstacleSerial, obstacle:'doll',
            x:cx,y:-1,life:15+Math.floor(this.random()*6)});
          this.phase = 'mortis';
        } else if (roll < .70) {
          landed.jump = roll < .50;
          landed.armIn = landed.jump ? 0 : 5+Math.floor(this.random()*8);
        }
      }
      if (['ppp-rimiri','ag-moka','am-sakiko'].includes(landed.sourceName) && this.skill(landed) && (landed.sourceName!=='am-sakiko'||this.difficulty==='hard'||this.random()<.5)) {
        const targets = this.pieces.filter(p => landed.sourceName === 'ppp-rimiri'
          ? p.obstacle === 'cornet' : ['coffee','cornet','croquette','cucumber','baguette','parfait'].includes(p.obstacle));
        this.foodRemaining=landed.sourceName==='am-sakiko'?1:this.difficulty==='hard'?(landed.sourceName==='ppp-rimiri'?3:5):1; this.foodTargets=targets;
        this.skillTarget = targets.length ? targets[Math.floor(this.random()*targets.length)] : null;
        this.foodSkill = landed.sourceName === 'am-sakiko' ? '吃货小祥' : landed.sourceName === 'ppp-rimiri' ? '巧克力螺！' : '商店街荣誉市民';
        if (this.skillTarget) this.phase = 'skill';
      }
    }

    leaveShoppingBags(removed) {
      for(const p of removed)if(p.shopping)for(const dx of [0,2])if(this.random()<(this.difficulty==='hard'?.8:.5))
        this.pieces.push({id:'obstacle-'+(++this.obstacleSerial),obstacle:'shopping-bag',x:p.x+dx,y:p.y});
    }
    scoreBonds() {
      if (this.skills.bonds !== true) return null;
      const hits=[];
      const identity=p=>p.sourceName==='hhw-misaki'?'hhw-michelle':p.sourceName;
      const award=(rule,members)=>{
        const key=JSON.stringify([rule.name,...members.map(p=>p.id).sort()]);
        if(this.scoredBonds.has(key))return;
        this.scoredBonds.add(key);
        const points=rule.negativeChance && this.random()<rule.negativeChance ? -rule.points : rule.points;
        hits.push({name:rule.name,points,members});
      };
      for(const a of this.pieces.filter(p=>!p.obstacle)){
        const neighbors=directNeighbors(a,this.pieces).filter(p=>p.id!==a.id);
        for(const rule of bonds.filter(r=>r.a===identity(a))){
          if(rule.triple){
            for(const b of neighbors.filter(p=>identity(p)===rule.b[0]))
              for(const c of neighbors.filter(p=>identity(p)===rule.b[1]))award(rule,[a,b,c]);
          }else for(const b of neighbors.filter(p=>[].concat(rule.b).includes(identity(p))))award(rule,[a,b]);
        }
      }
      if(!hits.length)return null;
      const points=hits.reduce((sum,hit)=>sum+hit.points,0);this.score+=points;
      return this.lastEvent={type:'bond',hits,points,character:this.landedCharacter};
    }
    resolveStep(concertSongs = {}) {
      if (this.status !== 'resolving' || this.beam) return null;
      if(this.landedCharacter?.collectedObstacles?.length){const removed=this.landedCharacter.collectedObstacles;this.landedCharacter.collectedObstacles=null;this.collectionNextPhase=this.phase;this.phase='collection-gravity';return this.lastEvent={type:'clear',skill:'收藏',removed,groups:0,chain:0,points:0,obstaclePoints:0,obstacles:removed.length};}
      if(this.phase==='collection-gravity'){const before=this.pieces.map(p=>({...p}));const distance=settle(this.pieces,this.height);this.phase=this.collectionNextPhase;return this.lastEvent={type:'gravity',before,distance};}
      if(this.smashRemoved?.length){const removed=this.smashRemoved;this.smashRemoved=null;return this.lastEvent={type:'clear',skill:'全速下落',removed,groups:0,chain:0,points:200,obstaclePoints:200,obstacles:1};}
      if(this.landingBondsPending){
        this.landingBondsPending=false;
        const event=this.scoreBonds();if(event)return event;
      }
      if (this.beamNeedsGravity) { this.phase='gravity';this.beamNeedsGravity=false; }
      if (this.phase === 'parfait-arrived') {
        const cats = this.pieces.filter(p => p.sourceName === 'mygo-rana' && !p.ateParfait);
        const desserts = this.pieces.filter(p => p.obstacle === 'parfait');
        // Remove each selected cat and dessert from the candidate lists: a one-to-one match.
        while(cats.length && desserts.length){
          const cat=cats.splice(Math.floor(this.random()*cats.length),1)[0];
          const target=desserts.splice(Math.floor(this.random()*desserts.length),1)[0];
          this.pieces=this.pieces.filter(p=>p.id!==target.id);
          Object.assign(cat,{ateParfait:true,x:target.x,y:target.y,horizontal:false,rotation:0});
          this.caughtParfait=true;this.score+=200;this.clearedObstacles++;
        }
        this.phase = 'gravity';
      }
      if (this.phase !== 'mortis' && this.phase !== 'skill') {
        for (const piece of this.pieces.filter(p => p.armIn === 0)) {
          const target = directNeighbors(piece,this.pieces)[1];
          if (!target) continue;
          this.mortisTargets = [piece,target];
          this.phase = 'mortis';
          break;
        }
      }
      if (this.phase === 'mortis') {
        const removed = [...this.mortisTargets,...(this.mortisTargets.some(p=>p.sourceName==='mor-nanami')?this.pieces.filter(p=>p.obstacle?.startsWith('collection-')):[]),...(this.mortisTargets.some(p=>p.sourceName==='mygo-tomori') ? this.pieces.filter(p=>p.obstacle==='stone') : [])], ids = new Set(removed.map(p => p.id));
        this.pieces = this.pieces.filter(p => !ids.has(p.id)); this.leaveShoppingBags(removed); this.mortisTargets = null; this.phase = this.pendingObstacles.length ? 'obstacles' : 'gravity';
        return this.lastEvent = { type: 'clear', skill: '全都不会弹', removed, groups: 0, chain: 0, points: 0, obstaclePoints: 0, obstacles: 0 };
      }
      if (this.phase === 'skill') {
        const removed=[];
        while(this.foodRemaining-->0&&this.foodTargets.length){const index=removed.length===0?this.foodTargets.indexOf(this.skillTarget):Math.floor(this.random()*this.foodTargets.length);removed.push(this.foodTargets.splice(index,1)[0]);}
        const ids=new Set(removed.map(p=>p.id));this.pieces=this.pieces.filter(p=>!ids.has(p.id));this.skillTarget=null;this.phase='gravity';this.clearedObstacles+=removed.length;this.score+=200*removed.length;
        return this.lastEvent={type:'clear',skill:this.foodSkill,removed,groups:0,chain:0,points:200*removed.length,obstaclePoints:200*removed.length,obstacles:removed.length};
      }
      if (this.phase === 'obstacles') {
        const before = this.pendingObstacles.map(p => ({ ...p }));
        let distance = 0;
        for (const obstacle of this.pendingObstacles) {
          // Keep overflow drops stacked above earlier drops in the same column.
          const [w,h]=dimensions(obstacle);
          const column = this.pieces.flatMap(cells).filter(([x]) => x >= obstacle.x && x < obstacle.x+w);
          obstacle.y = Math.min(-h, ...column.map(([,y]) => y - h));
          while (fits({ ...obstacle, y: obstacle.y + 1 }, this.pieces, this.width, this.height)) obstacle.y++;
          if(cells(obstacle).some(([,y])=>y<0))continue; distance = Math.max(distance, obstacle.y + h); this.pieces.push(obstacle);
        }
        this.phase = this.pendingObstacles.some(p => p.obstacle === 'doll') ? 'gravity' : 'check';
        if (this.skills['mygo-rana'] === true && this.pieces.some(p=>p.obstacle==='parfait') && this.pieces.some(p=>p.sourceName==='mygo-rana'&&!p.ateParfait)) {
          this.phase = 'parfait-arrived';
        }
        this.pendingObstacles = [];
        // Judge overflow after the falling animation has completed.
        return this.lastEvent = { type: 'obstacles', before, distance };
      }
      if (this.pieces.some(p => cells(p).some(([, y]) => y < 0))) {
        this.end('overflow'); return this.lastEvent = { type: 'overflow' };
      }
      if (this.phase === 'gravity') {
        const before = this.pieces.map(p => ({ ...p }));
        const distance = settle(this.pieces, this.height);
        this.phase = 'check';
        return this.lastEvent = { type: 'gravity', before, distance };
      }
      const bondEvent=this.scoreBonds();if(bondEvent)return bondEvent;
      const matches = clearGroups(this.pieces, this.bandIds, this.skills);
      const groups = matches.map(match => match.members);
      if (!groups.length) {
        this.spawn(); return this.lastEvent = { type: 'spawn' };
      }
      const concerts = matches.map(match => match.id).filter(id => concertSongs[id]);
      if (concerts.length && this.phase !== 'concert') {
        this.phase = 'concert';
        return this.lastEvent = {type:'concert', rules:concerts};
      }
      const members = groups.flat(), obstacles = connectedObstacles(this.pieces, members);
      const removed = [...members, ...obstacles], ids = new Set(removed.map(p => p.id));
      this.pieces = this.pieces.filter(p => !ids.has(p.id));
      this.leaveShoppingBags(members);
      this.returnToPool(members);
      this.chain++; this.maxChain = Math.max(this.chain, this.maxChain);
      this.clearedBands += groups.length;
      const obstaclePoints = obstacles.length * 200 * this.chain;
      this.clearedObstacles += obstacles.length;
      const points = groups.length * 1000 * this.chain + obstaclePoints;
      this.score += points; this.phase = 'gravity';
      return this.lastEvent = { type: 'clear', rules: matches.map(match => match.id), removed, groups: groups.length, chain: this.chain, points, obstaclePoints, obstacles: obstacles.length };
    }
    end(reason) { this.status = 'gameover'; this.reason = reason; }
  }
  const api = { Game, dimensions, cells, ends, fits, bandNumber, clearGroups, directNeighbors, occupancy, connectedGroups, connectedObstacles, obstacleRoll, gravityStep, settle };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PicoEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

