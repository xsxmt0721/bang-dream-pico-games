'use strict';
(() => {
  const catalog = {
    goals: ['舞台常客｜单局消除 50 个角色', '满场喝彩｜单局达到 10000 分', '清场专家｜单局消除 20 个障碍物', '全员安可｜单局完成所有乐队的消除'],
    stories: ['抹茶时间｜见证乐奈捕捉抹茶巴菲', '想发射光波｜日菜单局成功转移 10 个角色', '冰川家的魔法｜令纱夜悬浮于空中', '巧克力螺大餐｜里美单局吃掉 10 个巧克力螺', '衣橱全开｜六种配色的 PAREO 同时登场', '超大银幕｜见证 4×8 的千圣', '关系网｜单局触发全部羁绊加分效果', '春日影｜完整听完 CRYCHIC 的春日影', '彩色安可｜完整听完しゅわりん☆どり〜みん']
  };
  const ids = {goals:['cast','score','obstacles','bands'],stories:['rana','hina','sayo','cornet','pareo','chisato','bonds','crychic','aya-family']};
  const known = new Set(Object.values(ids).flat());
  const key = 'pico-achievements-v1';
  const earned = new Set();
  function merge(values) {
    if (Array.isArray(values)) for (const id of values) if (known.has(id)) earned.add(id);
  }
  try { merge(JSON.parse(localStorage.getItem(key))); } catch {}
  const panel = document.getElementById('achievements');
  function render() {
    panel.replaceChildren();
    const summary = document.createElement('summary');
    summary.textContent = '成就图鉴 · ' + earned.size + ' / ' + known.size;
    panel.append(summary);
    for (const [category, entries] of Object.entries(catalog)) {
      const title = document.createElement('h3');
      title.textContent = category === 'goals' ? '目标成就' : '趣味成就';
      panel.append(title);
      entries.forEach((entry,i) => {
        const row = document.createElement('p');
        row.textContent = (earned.has(ids[category][i]) ? '★ ' : '☆ ') + entry;
        panel.append(row);
      });
    }
  }
  render();
  let file;
  async function writeFile() {
    if (!file) return;
    const writer = await file.createWritable();
    await writer.write(JSON.stringify([...earned]));
    await writer.close();
  }
  let pending = (async () => {
    const dir = await navigator.storage.getDirectory();
    file = await dir.getFileHandle('pico-achievements.json',{create:true});
    const data = await (await file.getFile()).text();
    if (data) merge(JSON.parse(data));
    render();
    await writeFile();
  })().catch(()=>{});
  window.unlockAchievement = id => {
    if (earned.has(id) || !known.has(id)) return;
    earned.add(id);
    try { localStorage.setItem(key,JSON.stringify([...earned])); } catch {}
    pending = pending.then(writeFile).catch(()=>{});
    render();
  };
})();
