(() => {
  'use strict';
  const { bands, characters, guests, variants, obstacles, skills } = window.PicoRoster;
  const { Game, dimensions, cells, bandNumber } = window.PicoEngine;
  const audio = new window.PicoAudio.AudioDirector();
  let pendingBond=null, teamCleared=false, bondUntil=0;
  let concertQueue=[], logoUntil=0;
  const $ = id => document.getElementById(id);
  const bandById = new Map(bands.map(b => [b.id, b]));
  bandById.set('guest',{id:'guest',name:'户山明日香',short:'ASUKA',color:'#e7ad7d',members:['户山明日香']});
  const obstacleById = new Map(obstacles.map(o => [o.id, o]));
  const canvas = $('board'), ctx = canvas.getContext('2d');
  const images = new Map(), silhouettes = new Map(), slots = new Map();
  const beamImage = new Image(); beamImage.src = 'assets/effects/hina-wave.png';
  const BOARD = Object.freeze({ width: 8, height: 11 });
  const CLEAR_HOLD = 180, CLEAR_FADE = 500;
  const defaults = { ...BOARD, difficulty:'easy', interval: 700, bandIds: bands.filter(b => b.id !== 'sumimi').map(b => b.id), skills: Object.fromEntries(skills.map(s => [s.sourceName, s.defaultEnabled !== false])) };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
  const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private/file modes can disable storage. */ } };
  function validConfig(c) {
    return c && Number.isSafeInteger(c.width) && c.width >= 6 && Number.isSafeInteger(c.height) && c.height >= 8 && Number.isFinite(c.interval) && c.interval >= 1 && Array.isArray(c.bandIds) && c.bandIds.length && new Set(c.bandIds).size === c.bandIds.length && c.bandIds.every(id => bandById.has(id)) && c.skills && skills.every(s => typeof c.skills[s.sourceName] === 'boolean');
  }
  // Preserve existing preferences while applying defaults for newly added skills.
  const currentSettings = read('pico-settings-v4', null);
  const previous = currentSettings || read('pico-settings-v3', read('pico-settings-v2', null));
  const stored = previous && { ...defaults, ...previous, skills: { ...defaults.skills, ...previous.skills } };
  if (stored && !currentSettings && Array.isArray(stored.bandIds)) stored.bandIds = [...new Set([...stored.bandIds, 'ave-mujica'])];
  let config = validConfig(stored) ? stored : { ...defaults };
  let game, paused = false, best = 0, scoreKey, lastTime = 0, fallTime = 0, resolutionTime = 0;
  let animation = null, particles = [], clock = 0, bannerUntil = 0, lastNextId = undefined, overlayMode = undefined;
  let fallMotion = null;
  let pendingFloat = null;
  let soundOn = false, audioContext, resumeAfterSettings = false, heldAction = null, heldTime = 0, heldRepeating = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const misaki = { id: 'misaki-sprite', image: 'assets/characters/front/hhw-misaki.png' };
  for (const character of [...characters, ...guests, ...variants, ...obstacles, misaki, { id: 'mortis-sprite', image: 'assets/characters/front/am-mortis.png' }]) {
    const image = new Image();
    image.onload = () => {
      const tinted = color => {
        const surface = document.createElement('canvas'); surface.width = image.naturalWidth; surface.height = image.naturalHeight;
        const context = surface.getContext('2d'); context.drawImage(image, 0, 0);
        context.globalCompositeOperation = 'source-in'; context.fillStyle = color; context.fillRect(0, 0, surface.width, surface.height);
        return surface;
      };
      // Compositing preserves alpha and works with file:// without pixel reads.
      const white = tinted('#ffffff'), outline = tinted('#47334f'), padding = Math.max(3, Math.round(image.naturalHeight * .018));
      const outlined = document.createElement('canvas');
      outlined.width = image.naturalWidth + padding * 2; outlined.height = image.naturalHeight + padding * 2;
      const context = outlined.getContext('2d');
      for (let i = 0; i < 8; i++) context.drawImage(outline, padding + Math.cos(i * Math.PI / 4) * padding, padding + Math.sin(i * Math.PI / 4) * padding);
      context.drawImage(white, padding, padding);
      silhouettes.set(character.id, { outlined, padding });
    };
    image.src = character.image; images.set(character.id, image);
  }
  function sound(type) {
    if (!soundOn) return;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume().catch(() => {});
      const frequencies = type === 'clear' ? [523, 659, 784, 1046] : type === 'drop' ? [196, 262] : type === 'end' ? [330, 247, 165] : [440];
      frequencies.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), start = audioContext.currentTime + i * .075;
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.07, start + .01); gain.gain.exponentialRampToValueAtTime(.001, start + .16);
        oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(start); oscillator.stop(start + .17);
      });
    } catch { /* Audio is optional. */ }
  }
  function makeBandRows() {
    $('band-list').replaceChildren(); slots.clear();
    for (const band of bands.filter(b => config.bandIds.includes(b.id))) {
      const row = document.createElement('div'); row.className = 'band-row'; row.style.setProperty('--band', band.color);
      row.innerHTML = `<div class="band-heading"><span class="band-name"><i></i>${band.name}</span><span class="band-progress">0 / ${band.members.length}</span></div><div class="member-slots"></div>`;
      for (const character of characters.filter(c => bandNumber(c,band.id) != null)) {
        const slot = document.createElement('span'); slot.className = 'member-slot'; slot.textContent = bandNumber(character,band.id);
        slot.title = `${character.number} · ${character.sourceName === 'hhw-michelle' ? (config.skills['hhw-michelle'] ? '美咲 / 米歇尔（1 × 2 / 2 × 2）' : '奥泽美咲（1 × 2）') : character.displayName}`;
        row.querySelector('.member-slots').append(slot); if (!slots.has(character.id)) slots.set(character.id, []); slots.get(character.id).push(slot);
      }
      row.querySelector('.member-slots').style.gridTemplateColumns = 'repeat(' + band.members.length + ', 1fr)';
      row.dataset.bandId = band.id; $('band-list').append(row);
    }
    $('band-count').textContent = `${config.bandIds.length} BANDS`;
  }
  const unlock = window.unlockAchievement;
  let run;
  function initialize(start = false) {
    run = {cast:0,hina:0,cornet:0,bands:new Set(),bonds:new Set()};
    pendingBond=null;teamCleared=false;bondUntil=0;$('bond-score').hidden=true;
    audio.reset();concertQueue=[];$('clear-logos').hidden=true;logoUntil=0;
    game = new Game({ ...config, characters:[...characters,...guests] }); paused = false; fallTime = 0; resolutionTime = 0;
    animation = null; fallMotion = null; pendingFloat = null; particles = []; bannerUntil = 0; lastNextId = undefined; overlayMode = undefined; heldAction = null;
    scoreKey = `pico-best-v10-bonds:${config.width}:${config.height}:${config.interval}:${[...config.bandIds].sort().join(',')}:${skills.map(s => Number(config.skills[s.sourceName])).join('')}`;
    const value = read(scoreKey, 0); best = Number.isFinite(value) && value >= 0 ? value : 0;
    document.querySelector('.game-layout').style.setProperty('--board-ratio', config.width/config.height);
    $('board-shell').style.aspectRatio = `${config.width}/${config.height}`;
    canvas.setAttribute('aria-label', `${config.width} 列 ${config.height} 行游戏棋盘；W 头部旋转，心 Q/E 上升一格，空格直落。`);
    $('board-size').textContent = `${config.width} × ${config.height}`;
    makeBandRows(); resize();
    if (start) { game.start(); sound('start'); }
    sync();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr));
  }
  new ResizeObserver(resize).observe($('board-shell'));
  function nextPreview() {
    const next = game.next || (game.status === 'ready' ? game.form(game.characters[0]) : null);
    const id = next ? next.id + ':' + next.square + ':' + next.sourceName : 'empty';
    if (id === lastNextId) return;
    lastNextId = id; const target = $('next-character'); target.replaceChildren();
    if (!next) { const p = document.createElement('p'); p.textContent = '等待下一位成员'; p.style.cssText = 'color:#897d92;font-size:12px'; target.append(p); return; }
    const band = bandById.get(next.bandId), image = document.createElement('img');
    image.src = next.sourceName==='hhw-kaoru'?'assets/characters/front/hhw-kaoru-sleep.png':next.image; image.alt = next.displayName; image.className = next.mini ? 'mini' : next.square ? 'michelle' : '';
    image.onerror = () => { image.hidden = true; };
    const info = document.createElement('div'); info.className = 'next-info';
    info.innerHTML = `<strong>${next.displayName}</strong><small>${next.sourceName === 'am-uika' ? config.bandIds.filter(id => ['ave-mujica','sumimi'].includes(id)).map(id => bandById.get(id).name).join(' / ') : band.name}</small><span class="number-chip" style="color:${band.color}">NO. ${next.number} · ${dimensions(next).join(' × ')}</span>`;
    if (game.status === 'ready') { const hint = document.createElement('small'); hint.textContent = '开始后随机登场'; info.append(hint); }
    target.append(image, info);
  }
  function setOverlay(mode) {
    if (mode === overlayMode) return;
    overlayMode = mode; $('overlay').hidden = mode === 'playing';
    if (mode === 'playing') return;
    const text = mode === 'paused'
      ? ['TAKE A LITTLE BREAK', '演出暂停', '准备好后，继续你们的舞台。', '继续演出 ▶', '按 P 也可以继续']
      : mode === 'gameover'
        ? ['THANK YOU FOR PLAYING', '舞台已经满员了！', '堆积高度超过了棋盘上限。', '再演一场 ↻', `本场得分 ${game.score} · 最高连锁 ${game.maxChain}`]
        : ['THE STAGE IS YOURS', '准备好登场了吗？', '集齐乐队成员并连通，触发消除与连锁！', '开始演出 ▶', '← → 移动 · ↑ 旋转 · 空格直落'];
    ['overlay-kicker','overlay-title','overlay-description','overlay-action','overlay-footnote'].forEach((id, i) => { $(id).textContent = text[i]; });
    if (mode === 'gameover') sound('end');
  }
  function showConcert() {
    const id=concertQueue[0];
    if(id){
      audio.song(id);
      if(id==='crychic') showLogos(['crychic'],Infinity);
      else $('clear-logos').hidden=true;
    }
    else {audio.stopSong();logoUntil=0;}
  }
  function continueConcert() {
    if(!concertQueue.length||paused||$('settings-dialog').open)return;
    concertQueue.shift();showConcert();heldAction=null;sync();
  }
  function showLogos(ids,until) {
    if (!ids.length) return;
    $('clear-logos').replaceChildren(...ids.map(id=>{
      const img=new Image();
      img.src='assets/band-logos/'+id+'.png';
      img.alt=bandById.get(id)?.name || 'CRYCHIC';
      return img;
    }));
    $('clear-logos').hidden=false;logoUntil=until;
  }
  function presentClear(rules) {
    if(rules.length && !reducedMotion) for(let i=0;i<42;i++) particles.push({
      shape:'star',x:game.width/2+(Math.random()-.5)*2,y:.8,
      vx:(Math.random()-.5)*5,vy:Math.random()*1.5-.8,
      color:['#fff3a2','#ffb8e4','#a4eaff','#ffffff'][i%4],
      size:.08+Math.random()*.10,start:clock+Math.random()*350,life:1.4+Math.random()*.8
    });
    showLogos(rules.filter(id=>bandById.has(id) || id==='crychic'),clock+2200);
    audio.clear(rules);
  }
  function sync() {
    if (game.score >= 10000) unlock('score');
    if (game.clearedObstacles >= 20) unlock('obstacles');
    if (game.caughtParfait) unlock('rana');
    const stage = game.active ? [...game.pieces,game.active] : game.pieces;
    if (stage.some(p => p.sourceName === 'pp-chisato' && p.scale === 4)) unlock('chisato');
    if (new Set(stage.filter(p => p.sourceName === 'ras-pareo').map(p => p.pareoColor || 'pink-blue')).size === 6) unlock('pareo');
    audio.setPaused(paused);audio.spawn(game.active,clock);
    $('score').textContent = String(game.score).padStart(7, '0');
    if (game.score > best) { best = game.score; save(scoreKey, best); }
    $('best').textContent = String(best).padStart(7, '0');
    $('chain').textContent = String(game.maxChain).padStart(3, '0'); $('cleared').textContent = game.clearedBands;
    $('obstacles-cleared').textContent = game.clearedObstacles;
    const present = new Set(game.pieces.filter(p => !p.obstacle).map(p => p.characterId || p.id));
    for (const [id, entries] of slots) for (const slot of entries) { slot.classList.toggle('present', present.has(id)); slot.classList.toggle('active', (game.active?.characterId || game.active?.id) === id); }
    for (const row of $('band-list').children) row.querySelector('.band-progress').textContent = `${new Set(game.pieces.map(p => bandNumber(p,row.dataset.bandId)).filter(n => n != null)).size} / ${bandById.get(row.dataset.bandId).members.length}`;
    $('pool-note').textContent = '池中待抽 ' + game.pool.size + ' / ' + game.characters.length + ' · 各队独立抽取/返池';
    nextPreview();
    $('pause').disabled = game.status === 'ready' || game.status === 'gameover'; $('pause').textContent = paused ? '▶ 继续' : 'Ⅱ 暂停';
    $('stage-status').textContent = paused ? 'INTERMISSION' : ({ ready: 'READY TO PLAY', falling: 'LIVE ON STAGE', resolving: 'ENCORE TIME', gameover: 'SESSION COMPLETE' })[game.status];
    $('status-dot').style.background = game.status === 'gameover' ? '#fa85ac' : paused ? '#f4d27c' : '#87e1e5';
    $('current-label').textContent = concertQueue.length ? `${window.PicoAudio.songs[concertQueue[0]].title} · 按任意键或点击棋盘继续` : game.active ? `${bandById.get(game.active.bandId).short} · ${game.active.number} ${game.active.displayName} ${game.active.mini || game.active.square || game.active.scale > 1 ? ' · ' + dimensions(game.active).join(' × ') : ''}` : game.status === 'resolving' ? animation?.type === 'obstacles' ? '障碍物掉落中 · 无法操作' : '全员集结，正在结算…' : game.status === 'gameover' ? '下一场演出，等你开场' : '等待第一位成员登场';
    setOverlay(game.status === 'ready' ? 'ready' : game.status === 'gameover' ? 'gameover' : paused ? 'paused' : 'playing');
  }
  function togglePause() {
    if (game.status === 'ready' || game.status === 'gameover' || $('settings-dialog').open) return;
    paused = !paused; heldAction = null; sync();
  }
  function action(name) {
    if (paused || concertQueue.length || $('settings-dialog').open || game.status !== 'falling') return;
    const before = game.active, from = visualY(before), fromX = visualX(before);
    if (name === 'left') game.moveHorizontal(-1);
    if (name === 'right') game.moveHorizontal(1);
    if (['rotate','rotate-back'].includes(name) && game.rotate('head', name === 'rotate' ? 1 : -1)) sound('rotate');
    if (name === 'skill') {
      if (game.active?.sourceName === 'rose-sayo' && game.skill(game.active)) {
        if (fallRemaining() > 0) pendingFloat = before.id;
        else if (game.float()) unlock('sayo');
      }
      else if (game.active?.sourceName === 'pp-hina' && game.fireBeam()) {
        game.beam.start=clock;game.beam.duration=1000;
        game.beam.source={...before,x:fromX,y:from};
        bannerUntil=clock+1100;$('chain-banner').textContent='想发射光波';
      }
      else game.rise();
    }
    if (name === 'down') { game.softDrop(); }
    if (name === 'drop') { game.hardDrop(); sound('drop'); }
    const after = game.active || game.pieces.find(p => p.id === before.id);
    if (after && ['down','drop'].includes(name) && (after.y !== before.y || after.x !== before.x)) startFall(before.id, from, after.y, name === 'drop' ? 250 : 90, fromX, after.x);
    if (game.status === 'resolving') { resolutionTime = Math.max(80, fallRemaining()); fallTime = 0; }
    sync();
  }
  function visualY(piece) {
    if (!fallMotion || fallMotion.id !== piece.id) return piece.y;
    const t = Math.min(1, Math.max(0, (clock - fallMotion.start) / fallMotion.duration));
    // Preserve the fractional falling offset when controls change the grid anchor.
    return piece.y + (fallMotion.from - fallMotion.to) * (1 - t);
  }
  function visualX(piece) {
    if (!fallMotion || fallMotion.id !== piece.id) return piece.x;
    const t = Math.min(1, Math.max(0, (clock-fallMotion.start)/fallMotion.duration));
    return piece.x + (fallMotion.fromX-fallMotion.toX)*(1-t);
  }
  function startFall(id, from, to, duration, fromX, toX) {
    fallMotion = { id, from, to, fromX, toX, start: clock, duration: Math.max(1, duration) };
  }
  function fallRemaining() { return fallMotion ? Math.max(0, fallMotion.start + fallMotion.duration - clock) : 0; }
  function rounded(x, y, w, h, radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, radius); }
  function pieceDraw(piece, unit, { ghost = false, alpha = 1, offsetY = 0, offsetX = 0, white = false } = {}) {
    const band = piece.obstacle ? obstacleById.get(piece.obstacle) : bandById.get(piece.bandId), x = (piece.x + offsetX) * unit, y = (piece.y + offsetY) * unit;
    const [cols,rows]=dimensions(piece), w=cols*unit, h=rows*unit;
    ctx.save(); ctx.globalAlpha = alpha;
    if(piece.shopping){
      ctx.beginPath();ctx.moveTo(x+2,y+2);ctx.lineTo(x+w-2,y+2);ctx.lineTo(x+w-2,y+unit-2);ctx.lineTo(x+2*unit-2,y+unit-2);ctx.lineTo(x+2*unit-2,y+h-2);ctx.lineTo(x+unit+2,y+h-2);ctx.lineTo(x+unit+2,y+unit-2);ctx.lineTo(x+2,y+unit-2);ctx.closePath();
    }else rounded(x + 2, y + 2, w - 4, h - 4, unit * .11);
    if (ghost) {
      ctx.setLineDash([unit * .1, unit * .08]); ctx.strokeStyle = band.color; ctx.lineWidth = Math.max(1, unit * .035); ctx.globalAlpha = .6;
      ctx.stroke(); ctx.fillStyle = `${band.color}19`; ctx.fill(); ctx.restore(); return;
    }
    if (piece.floating && !white) {
      ctx.shadowColor='#54caff'; ctx.shadowBlur=unit*.35;
      ctx.strokeStyle='#8ceaff'; ctx.lineWidth=unit*.07; ctx.stroke();
    }
    if (!white) { ctx.fillStyle = `${band.color}25`; ctx.fill(); ctx.strokeStyle = `${band.color}aa`; ctx.lineWidth = Math.max(1, unit * .025); ctx.stroke(); }
    const imageKey = (piece.sourceName==='rose-sayo' && piece.floating ? 'sayo-floating' : null) || (piece.sourceName==='hhw-kaoru' && (piece.id===game.active?.id || Math.abs(offsetY)>.001 || game.height-piece.y>=6) ? 'kaoru-sleep' : null) || piece.spriteId || piece.obstacle || (piece.sourceName === 'am-mortis' ? 'mortis-sprite' : null) || (piece.sourceName === 'hhw-michelle' && !piece.square ? 'misaki-sprite' : (piece.characterId || piece.id)), image = images.get(imageKey);
    if (image?.complete && image.naturalWidth && piece.obstacle) {
      ctx.save();ctx.translate(x+w/2,y+h/2);
      const verticalBread=piece.obstacle==='baguette'&&!piece.horizontal;
      if(verticalBread)ctx.rotate(Math.PI/2);
      const availableW=(verticalBread?h:w)-5,availableH=(verticalBread?w:h)-5;
      const scale=Math.min(availableW/image.naturalWidth,availableH/image.naturalHeight);
      const silhouette=white&&silhouettes.get(imageKey);
      if(silhouette){
        const pad=silhouette.padding*scale;
        ctx.drawImage(silhouette.outlined,-image.naturalWidth*scale/2-pad,-image.naturalHeight*scale/2-pad,image.naturalWidth*scale+2*pad,image.naturalHeight*scale+2*pad);
      }else ctx.drawImage(image,-image.naturalWidth*scale/2,-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);
      ctx.restore();
    } else if (image?.complete && image.naturalWidth) {
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate((piece.rotation || 0) * Math.PI / 2);
      // Visual width is independent of collision cells. All processed sprites
      // have equal visible height; wide hair may overlap adjacent characters.
      const baseH = piece.mini ? Math.min(unit * 1.12,unit * 1.15 * image.naturalHeight / image.naturalWidth) : 2 * (piece.scale || 1) * unit - 3;
      const baseW = piece.shopping ? w-3 : baseH * image.naturalWidth / image.naturalHeight;
      const silhouette = white && silhouettes.get(imageKey);
      if (silhouette) {
        const padX = silhouette.padding * baseW / image.naturalWidth, padY = silhouette.padding * baseH / image.naturalHeight;
        ctx.drawImage(silhouette.outlined, -baseW / 2 - padX, -baseH / 2 - padY, baseW + padX * 2, baseH + padY * 2);
      } else ctx.drawImage(image, -baseW / 2, -baseH / 2, baseW, baseH);
      ctx.restore();
    } else {
      ctx.fillStyle = band.color; ctx.textAlign = 'center'; ctx.font = `bold ${unit * .3}px sans-serif`; ctx.fillText(band.short, x + w / 2, y + h / 2);
    }
    if (white || piece.obstacle) { ctx.restore(); return; }
    const radius = Math.max(6, unit * .17);
    ctx.beginPath(); ctx.arc(x + radius + 3, y + radius + 3, radius, 0, Math.PI * 2); ctx.fillStyle = band.color; ctx.fill();
    ctx.strokeStyle = '#fff9'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#231d31'; ctx.font = `800 ${radius * 1.45}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(piece.number, x + radius + 3, y + radius + 3.5);
    ctx.restore();
  }
  function draw() {
    const unit = canvas.width / game.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#27283f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ['#42445e', '#4a405f', '#3d4c64', '#3d5366', '#51415e'];
    for (let y = 0; y < game.height; y++) for (let x = 0; x < game.width; x++) {
      const left = x * unit + 2, top = y * unit + 2, size = unit - 4;
      const gradient = ctx.createLinearGradient(left, top, left + size, top + size);
      gradient.addColorStop(0, colors[(x + y * 2) % colors.length]); gradient.addColorStop(1, '#34384f');
      rounded(left, top, size, size, unit * .07); ctx.fillStyle = gradient; ctx.fill();
      ctx.strokeStyle = '#b7aacc19'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left + 3, top + unit * .23); ctx.lineTo(left + 3, top + 3); ctx.lineTo(left + unit * .23, top + 3); ctx.strokeStyle = '#e6e6ff22'; ctx.stroke();
    }
    if (game.active && !paused && !game.parfaitDash) pieceDraw(game.ghost(), unit, { ghost: true });
    const progress = animation ? Math.min(1, (clock - animation.start) / animation.duration) : 1;
    for (const piece of game.pieces) {
      const oldY = ['gravity', 'obstacles'].includes(animation?.type) ? animation.positions.get(piece.id) : undefined;
      const offsetY = oldY === undefined ? visualY(piece) - piece.y : (oldY - piece.y) * (1 - progress * progress);
      pieceDraw(piece, unit, { offsetY, offsetX: visualX(piece)-piece.x });
    }
    if (animation?.type === 'clear') {
      const fade = Math.max(0, (clock - animation.start - CLEAR_HOLD) / CLEAR_FADE);
      for (const removed of animation.removed) {
        const jump = animation.skill === '全都不会弹' && animation.removed[0] === removed && removed.jump && animation.removed[1];
        const t = Math.min(1,(clock-animation.start)/CLEAR_HOLD);
        const [x,y] = jump ? window.PicoEngine.ends(removed)[0] : [0,0];
        const [tx,ty] = jump ? window.PicoEngine.ends(jump)[0] : [0,0];
        pieceDraw(removed,unit,{offsetX:(tx-x)*t,offsetY:(ty-y)*t-(jump ? 6*t*(1-t) : 0),
          white: !jump || t >= 1, alpha:Math.max(0,1-fade)});
      }
    }
    if (game.beam) {
      const progress=Math.min(1,(clock-game.beam.start)/game.beam.duration);
      const center=p=>{const [w,h]=dimensions(p);return [(p.x+w/2)*unit,(p.y+h/2)*unit];};
      const a=center(game.beam.source), b=center(game.beam.target);
      const x=a[0]+(b[0]-a[0])*progress, y=a[1]+(b[1]-a[1])*progress;
      ctx.save();
      if (beamImage.complete && beamImage.naturalWidth) {
        const scale=unit*.7/Math.max(beamImage.naturalWidth,beamImage.naturalHeight);
        const w=beamImage.naturalWidth*scale,h=beamImage.naturalHeight*scale;
        ctx.translate(x,y);ctx.rotate(Math.atan2(b[1]-a[1],b[0]-a[0])+Math.PI);
        ctx.drawImage(beamImage,-w/2,-h/2,w,h);
      } else {
        const glow=ctx.createRadialGradient(x,y,0,x,y,unit*.35);
        glow.addColorStop(0,'#ffffff');glow.addColorStop(.45,'#ffffff');glow.addColorStop(.8,'#40eaf5');glow.addColorStop(1,'#a5ffff00');
        ctx.fillStyle=glow;ctx.beginPath();ctx.arc(x,y,unit*.35,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    if (game.active) pieceDraw(game.active, unit, { offsetY: visualY(game.active) - game.active.y, offsetX: visualX(game.active)-game.active.x });
    for (const p of particles) {
      const elapsed = (clock - p.start) / 1000, life = 1 - elapsed / p.life;
      if (elapsed < 0 || life <= 0) continue;
      ctx.save(); ctx.globalAlpha = life; ctx.fillStyle = p.color;
      ctx.translate((p.x + p.vx * elapsed) * unit, (p.y + p.vy * elapsed + 3 * elapsed * elapsed) * unit);
      ctx.rotate(elapsed * 3);
      if(p.shape==='star'){
        ctx.beginPath();
        for(let i=0;i<10;i++){
          const angle=-Math.PI/2+i*Math.PI/5, radius=unit*p.size*(i%2?.42:1);
          const x=Math.cos(angle)*radius,y=Math.sin(angle)*radius;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.closePath();ctx.fill();ctx.strokeStyle='#ffffff99';ctx.lineWidth=1;ctx.stroke();
      } else ctx.fillRect(-2, -2, unit * .09, unit * .09);
      ctx.restore();
    }
    if (game.blackout) {
      const [w,h] = dimensions(game.active);
      const x = (visualX(game.active) + w / 2) * unit;
      const y = (visualY(game.active) + h / 2) * unit;
      const shade = ctx.createRadialGradient(x, y, unit, x, y, 2 * unit);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(.25, 'rgba(0,0,0,.20)');
      shade.addColorStop(.75, 'rgba(0,0,0,.80)');
      shade.addColorStop(1, '#000');
      ctx.save();
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    if(clock>=bondUntil || game.blackout) $('bond-score').hidden=true;
    if(clock>=logoUntil || game.blackout)$('clear-logos').hidden=true;
    $('chain-banner').classList.toggle('visible', clock < bannerUntil && !game.blackout);
  }
  function resolve() {
    let event = game.resolveStep(window.PicoAudio.songs);
    while (event?.type === 'bond') {
      for (const hit of event.hits) if (hit.points > 0) run.bonds.add(hit.name);
      if (window.PicoBonds.every(b => run.bonds.has(b.name))) unlock('bonds');
      const label = $('bond-score');
      label.replaceChildren(...event.hits.map(hit => {
        const item = document.createElement('span');
        item.textContent = hit.name + ' ' + (hit.points > 0 ? '+' : '') + hit.points;
        return item;
      }));
      label.hidden = false;
      bondUntil = clock + 2200;
      pendingBond = event;
      event = game.resolveStep(window.PicoAudio.songs);
    }
    if (!event) return;
    if (event.type === 'concert') {
      animation=null;
      concertQueue.push(...event.rules);
      showConcert();
      sync();
      return;
    }
    if (event.type === 'spawn' || event.type === 'overflow') {
      if (pendingBond && !teamCleared) audio.bond(pendingBond.hits,pendingBond.character);
      pendingBond = null;
      teamCleared = false;
    }
    if (event.type === 'clear') {
      if (event.rules?.length) teamCleared = true;
      run.cast += event.removed.filter(p => !p.obstacle).length;
      if (run.cast >= 50) unlock('cast');
      if (event.skill === '巧克力螺！' && ++run.cornet >= 10) unlock('cornet');
      for (const id of event.rules || []) run.bands.add(id);
      if (bands.every(b => run.bands.has(b.id))) unlock('bands');
      presentClear(event.rules || []);
      fallMotion = null;
      animation = { ...event, start: clock, duration: CLEAR_HOLD + CLEAR_FADE };
      resolutionTime = animation.duration + 30; sound('clear'); bannerUntil = clock + 1100;
      $('chain-banner').innerHTML = `${event.skill || (event.rules?.includes('toyama-sisters')?'户山姐妹羁绊':event.rules?.includes('haneoka-trio')?'羽丘三小只':null) || (event.chain > 1 ? `${event.chain} CHAIN!` : 'ENCORE!')}<small>${event.points ? '+ ' + event.points.toLocaleString() : '不计分'}${event.obstacles ? ` · 障碍 +${event.obstaclePoints}` : ''}</small>`;
      if (!reducedMotion) for (const piece of event.removed) for (let i = 0; i < 10; i++) particles.push({ x: piece.x + .5, y: piece.y + (piece.obstacle ? .5 : 1), vx: (Math.random() - .5) * 4, vy: -Math.random() * 5, color: piece.obstacle ? obstacleById.get(piece.obstacle).color : bandById.get(piece.bandId).color, start: clock, life: .7 + Math.random() * .4 });
    } else if (event.type === 'gravity' || event.type === 'obstacles') {
      const duration = Math.min(700, 220 + Math.sqrt(event.distance) * 110);
      fallMotion = null;
      animation = { type: event.type, start: clock, duration, positions: new Map(event.before.map(p => [p.id, p.y])) };
      resolutionTime = event.distance ? duration + 30 : 30;
    } else { animation = null; fallMotion = null; resolutionTime = 0; fallTime = 0; }
    sync();
  }
  function frame(now) {
    const dt = Math.min(80, lastTime ? now - lastTime : 0); lastTime = now;
    if (!paused && !$('settings-dialog').open) {
      clock += dt;
      if (game.beam && clock >= game.beam.start + game.beam.duration) { if (game.finishBeam() && ++run.hina >= 10) unlock('hina');sync(); }
      if (heldAction && game.status === 'falling') {
        heldTime += dt;
        const threshold = heldRepeating ? 75 : 230;
        if (heldTime >= threshold) { heldTime = 0; heldRepeating = true; action(heldAction); }
      }
      if (game.status === 'falling') {
        if (pendingFloat && pendingFloat !== game.active?.id) pendingFloat = null;
        if (pendingFloat && fallRemaining() === 0) {
          pendingFloat = null;
          if (game.float()) { unlock('sayo'); resolutionTime = 80; sync(); }
        }
        // Finish each motion before scheduling its successor. Inputs never reset this clock.
        while (game.status === 'falling' && (!fallMotion || fallMotion.id !== game.active.id || fallRemaining() === 0)) {
          const interval = game.fallInterval(config.interval);
          const boundary = fallMotion?.id === game.active.id ? fallMotion.start + fallMotion.duration : clock;
          const before = game.active, from = visualY(before), fromX = visualX(before);
          const parfaitDash = game.parfaitDash;
          game.tick();
          if(game.smashRemoved?.length){
            for(const piece of game.smashRemoved)for(let i=0;i<16;i++)particles.push({x:piece.x+.5,y:piece.y+.5,vx:(Math.random()-.5)*4,vy:-Math.random()*5,color:obstacleById.get(piece.obstacle).color,start:clock,life:.7+Math.random()*.4});
            game.smashRemoved=null;sound('clear');
          }
          if (game.active && (game.active.y !== before.y || game.active.x !== before.x)) {
            startFall(before.id, from, game.active.y, interval, fromX, game.active.x);
            fallMotion.start = boundary;
          } else if (game.status === 'falling') break;
          if (parfaitDash && !game.active) {
            const landed=game.pieces.find(p=>p.id===before.id);
            if(landed)startFall(before.id,from,landed.y,140,fromX,landed.x);
          }
          if (game.status === 'resolving') resolutionTime = Math.max(100, fallRemaining());
          sync();
        }
      } else if (game.status === 'resolving' && !concertQueue.length) { resolutionTime -= dt; if (resolutionTime <= 0) resolve(); }
      particles = particles.filter(p => clock - p.start < p.life * 1000);
      audio.update(game.active,clock);
    }
    draw(); requestAnimationFrame(frame);
  }
  const keyActions = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down', KeyW: 'skill', KeyQ: 'rotate', KeyE: 'rotate-back', Space: 'drop' };
  document.addEventListener('keydown', event => {
    if (concertQueue.length && !$('settings-dialog').open && !paused) { event.preventDefault();if(!event.repeat)continueConcert();return; }
    if ($('settings-dialog').open || /^(INPUT|TEXTAREA|SELECT|SUMMARY|BUTTON|A)$/.test(event.target.tagName)) return;
    if (event.code === 'KeyP' || event.code === 'Escape') { event.preventDefault(); if (!event.repeat) togglePause(); return; }
    const name = keyActions[event.code]; if (!name) return; event.preventDefault();
    if ((['drop','rotate','rotate-back','skill'].includes(name)) && event.repeat) return;
    action(name);
  });
  for (const button of document.querySelectorAll('[data-action]')) {
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); button.setPointerCapture(event.pointerId); action(button.dataset.action);
      if (['left', 'right', 'down'].includes(button.dataset.action)) { heldAction = button.dataset.action; heldTime = 0; heldRepeating = false; }
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(name, () => { heldAction = null; });
    button.addEventListener('click', event => { if (event.detail === 0) action(button.dataset.action); });
  }
  function focusStage() {
    canvas.focus({ preventScroll: true });
    if (matchMedia('(max-width: 580px)').matches) document.querySelector('.stage-section').scrollIntoView({ block: 'start', behavior: reducedMotion ? 'instant' : 'smooth' });
  }
  canvas.addEventListener('click',()=>{if(concertQueue.length){continueConcert();canvas.focus({preventScroll:true});}});
  $('restart').addEventListener('click', () => { initialize(true); focusStage(); });
  $('overlay-action').addEventListener('click', () => { if (paused) { paused = false; sync(); } else initialize(true); focusStage(); });
  $('pause').addEventListener('click', () => { togglePause(); canvas.focus({ preventScroll: true }); });
  $('sound').addEventListener('click', () => { soundOn = !soundOn; audio.setEnabled(soundOn); $('sound').innerHTML = `♫ <span>${soundOn ? 'ON' : 'OFF'}</span>`; $('sound').setAttribute('aria-label', soundOn ? '关闭音效' : '打开音效'); sound('start'); canvas.focus({ preventScroll: true }); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !paused && ['falling', 'resolving'].includes(game.status)) { paused = true; heldAction = null; sync(); } });
  window.addEventListener('blur', () => { if (!paused && ['falling', 'resolving'].includes(game.status)) { paused = true; heldAction = null; sync(); } });
  for (const band of bands) {
    const label = document.createElement('label'); label.className = 'band-option'; label.style.setProperty('--band', band.color);
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = band.id; checkbox.name = 'bands';
    label.append(checkbox, document.createTextNode(band.name)); $('band-options').append(label);
  }
  const skillDescriptions = new Map();
  for (const skill of skills) {
    const label = document.createElement('div'); label.className = 'skill-option';
    const input = document.createElement('input'); input.type = 'checkbox'; input.value = skill.sourceName; input.id = 'skill-' + skill.sourceName;
    const text = document.createElement('span'), title = document.createElement('label'), description = document.createElement('small');
    title.htmlFor = input.id; title.textContent = skill.name; description.textContent = skill.summary;
    const details = document.createElement('details'), summary = document.createElement('summary'), body = document.createElement('p');
    summary.textContent = '简单模式 · 详细说明'; body.textContent = skill.descriptions.easy;
    skillDescriptions.set(skill.sourceName, {description, summary, body}); details.append(summary, body);
    text.append(title, description, details);
    label.append(input, text); $('skill-options').append(label);
  }
  $('settings-button').addEventListener('click', () => {
    resumeAfterSettings = !paused && ['falling', 'resolving'].includes(game.status);
    if (resumeAfterSettings) { paused = true; heldAction = null; sync(); }
    $('width-input').value = config.width; $('height-input').value = config.height;
    for (const input of $('skill-options').querySelectorAll('input')) input.checked = config.skills[input.value];
    setDifficulty(config.difficulty); $('speed-input').value = config.interval; $('speed-output').textContent = `${config.interval} ms`;
    for (const input of $('band-options').querySelectorAll('input')) input.checked = config.bandIds.includes(input.value);
    $('settings-error').textContent = ''; $('settings-dialog').showModal();
  });
  function setDifficulty(value) {
    const hard = value === 'hard', button = $('difficulty-input');
    button.value = hard ? 'hard' : 'easy';
    for (const skill of skills) {
      const nodes = skillDescriptions.get(skill.sourceName);
      nodes.description.textContent = skill.summaries[button.value];
      nodes.body.textContent = skill.descriptions[button.value];
      nodes.summary.textContent = (hard ? '困难模式' : '简单模式') + ' · 详细说明';
    }
    button.setAttribute('aria-pressed', String(hard));
    $('difficulty-name').textContent = hard ? '困难模式' : '简单模式';
    $('difficulty-hint').textContent = hard ? '点击切换为简单模式' : '点击切换为困难模式';
  }
  $('difficulty-input').addEventListener('click', () => setDifficulty($('difficulty-input').value === 'easy' ? 'hard' : 'easy'));
  $('speed-input').addEventListener('input', () => { $('speed-output').textContent = `${$('speed-input').value} ms`; });
  $('select-all').addEventListener('click', () => { for (const input of $('band-options').querySelectorAll('input')) input.checked = true; });
  for (const id of ['close-settings', 'cancel-settings']) $(id).addEventListener('click', () => $('settings-dialog').close());
  $('settings-dialog').addEventListener('close', () => { if (resumeAfterSettings) { paused = false; resumeAfterSettings = false; } sync(); canvas.focus({ preventScroll: true }); });
  $('settings-form').addEventListener('submit', event => {
    event.preventDefault();
    const next = { difficulty:$('difficulty-input').value, width: Number($('width-input').value), height: Number($('height-input').value), skills: Object.fromEntries([...$('skill-options').querySelectorAll('input')].map(input => [input.value, input.checked])), interval: Number($('speed-input').value), bandIds: [...$('band-options').querySelectorAll('input:checked')].map(input => input.value) };
    if (!validConfig(next)) { $('settings-error').textContent = '宽度须为至少 6 的整数，高度须为至少 8 的整数；下落间隔须至少 1 ms，并至少选择一支乐队。'; return; }
    config = next; save('pico-settings-v4', config); resumeAfterSettings = false; $('settings-dialog').close(); initialize(true); focusStage();
  });
  initialize(); requestAnimationFrame(frame);
})();
