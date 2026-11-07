const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const script = fs.readFileSync(require.resolve('../src/achievements'), 'utf8');
test('achievement file restores unlocks after reload with empty browser cache', async () => {
  let data = '';
  const file = {
    getFile: async () => ({text: async () => data}),
    createWritable: async () => ({write: async value => {data=value;},close:async()=>{}})
  };
  function load() {
    const panel = {replaceChildren(){this.children=[];},append(item){this.children.push(item);}};
    const window = {};
    vm.runInNewContext(script,{window,document:{getElementById:()=>panel,createElement:()=>({})},
      navigator:{storage:{getDirectory:async()=>({getFileHandle:async()=>file})}},
      localStorage:{getItem:()=>null,setItem(){}}});
    return {window,panel};
  }
  const first = load();
  first.window.unlockAchievement('rana');
  first.window.unlockAchievement('rana');
  await new Promise(setImmediate);
  assert.deepEqual(JSON.parse(data),['rana']);
  const next = load();
  await new Promise(setImmediate);
  assert.match(next.panel.children[0].textContent,/1 \/ 13/);
});
