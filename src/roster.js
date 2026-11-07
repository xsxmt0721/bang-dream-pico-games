(function (root) {
  'use strict';
  // 编号为本游戏的固定编号，并非官方角色排序。
  const bands = [
    { id: 'poppin-party', name: "Poppin’Party", short: 'PPP', color: '#ed76a5', members: ['户山香澄', '花园多惠', '牛込里美', '山吹沙绫', '市谷有咲'] },
    { id: 'afterglow', name: 'Afterglow', short: 'AG', color: '#ed6d76', members: ['美竹兰', '青叶摩卡', '上原绯玛丽', '宇田川巴', '羽泽鸫'] },
    { id: 'pastel-palettes', name: 'Pastel＊Palettes', short: 'PP', color: '#68cfb5', members: ['丸山彩', '冰川日菜', '白鹭千圣', '大和麻弥', '若宫伊芙'] },
    { id: 'roselia', name: 'Roselia', short: 'R', color: '#b493ed', members: ['凑友希那', '冰川纱夜', '今井莉莎', '宇田川亚子', '白金燐子'] },
    { id: 'hello-happy-world', name: 'Hello, Happy World!', short: 'HHW', color: '#f2ce68', members: ['弦卷心', '濑田薰', '北泽育美', '松原花音', '奥泽美咲'] },
    { id: 'morfonica', name: 'Morfonica', short: 'M', color: '#83bdf3', members: ['仓田真白', '桐谷透子', '广町七深', '二叶筑紫', '八潮瑠唯'] },
    { id: 'raise-a-suilen', name: 'RAISE A SUILEN', short: 'RAS', color: '#54d5db', members: ['LAYER', 'LOCK', 'MASKING', 'PAREO', 'CHU²'] },
    { id: 'mygo', name: 'MyGO!!!!!', short: 'GO', color: '#698eea', members: ['高松灯', '千早爱音', '要乐奈', '长崎爽世', '椎名立希'] },
    { id: 'ave-mujica', name: 'Ave Mujica', short: 'AM', color: '#d27091', members: ['三角初华', '若叶睦', '八幡海铃', '祐天寺若麦', '丰川祥子'] }
  ];
  const sourceNames = [
    ['ppp-kasumi', 'ppp-otae', 'ppp-rimiri', 'ppp-saaya', 'ppp-arisa'],
    ['ag-ran', 'ag-moka', 'ag-himari', 'ag-tomoe', 'ag-tsugumi'],
    ['pp-aya', 'pp-hina', 'pp-chisato', 'pp-maya', 'pp-ive'],
    ['rose-yukina', 'rose-sayo', 'rose-risa', 'rose-ako', 'rose-rinko'],
    ['hhw-kokoro', 'hhw-kaoru', 'hhw-hagumi', 'hhw-kanon', 'hhw-michelle'],
    ['mor-mashiro', 'mor-toko', 'mor-nanami', 'mor-tsukushi', 'mor-rui'],
    ['ras-layer', 'ras-lock', 'ras-masking', 'ras-pareo', 'ras-chuchu'],
    ['mygo-tomori', 'mygo-anon', 'mygo-rana', 'mygo-soyo', 'mygo-taki'],
    ['am-uika', 'am-mutsumi', 'am-umiri', 'am-nyamu', 'am-sakiko']
  ];
  const characters = bands.flatMap((band, bandIndex) => band.members.map((name, index) => ({
    id: `${band.id}-${index + 1}`, bandId: band.id, number: index + 1, name,
    displayName: band.id === 'hello-happy-world' && index === 4 ? '米歇尔' : name,
    square: band.id === 'hello-happy-world' && index === 4,
    image: `assets/characters/front/${sourceNames[bandIndex][index]}.png`,
    sourceName: sourceNames[bandIndex][index]
  })));
  bands.push({ id: 'sumimi', name: 'sumimi', short: 'SUM', color: '#e7b973', members: ['三角初华', '纯田真奈'] });
  characters.push({ id: 'sumimi-2', bandId: 'sumimi', number: 2, name: '纯田真奈', displayName: '纯田真奈',
    sourceName: 'smm-mana', image: 'assets/characters/front/smm-mana.png', square: false });
  for (const character of characters) character.bandNumbers = { [character.bandId]: character.number };
  characters.find(c => c.sourceName === 'am-uika').bandNumbers.sumimi = 1;
  const guests=[{id:'guest-asuka',bandId:'guest',number:1,name:'户山明日香',displayName:'户山明日香',sourceName:'toyama-asuka',guest:true,bandNumbers:{},image:'assets/characters/front/toyama-asuka.png'}];
  const variants=[{id:'kaoru-sleep',image:'assets/characters/front/hhw-kaoru-sleep.png'},...['black-white','green-white','yellow-red','blue-white','purple-white'].map(color=>({id:'pareo-'+color,image:'assets/characters/front/ras-pareo-'+color+'.png'}))];
  variants.push(...['ras-chuchu','mor-tsukushi'].map(name=>({id:name+'-mini',image:'assets/characters/front/'+name+'-mini.png'})));
  variants.push({id:'sayo-floating',image:'assets/characters/front/rose-sayo-floating.png'});
  variants.push({id:'umiri-shopping',image:'assets/characters/front/am-umiri-shopping.png'});
  const obstacles = [
{id:'collection-tower',name:'铁塔',image:'assets/obstacles/collection-tower.png',color:'#aab099'},
{id:'collection-bust',name:'胸像',image:'assets/obstacles/collection-bust.png',color:'#aab099'},
{id:'collection-crocodile',name:'鳄鱼',image:'assets/obstacles/collection-crocodile.png',color:'#aab099'},
{id:'collection-angel',name:'天使雕塑',image:'assets/obstacles/collection-angel.png',color:'#aab099'},
    {id:'shopping-bag',name:'购物袋',image:'assets/obstacles/shopping-bag.png',color:'#c9ae86'},
    {id:'baguette',name:'长面包',image:'assets/obstacles/baguette.png',color:'#dfa34c'},
    {id:'parfait',name:'抹茶巴菲',image:'assets/obstacles/parfait.png',color:'#9bb963'},
    { id:'cucumber',name:'黄瓜',image:'assets/obstacles/cucumber.png',color:'#7cc34e' },
    { id: 'doll', name:'莫缇斯娃娃', image:'assets/obstacles/doll.png', color:'#95ad94' },
    { id: 'stone', name: '石头', image: 'assets/obstacles/stone.png', color: '#98a0b2' },
    { id: 'coffee', name: '咖啡', image: 'assets/obstacles/coffee.png', color: '#d4ad88' },
    { id: 'cornet', name: '巧克力海螺包', image: 'assets/obstacles/cornet.png', color: '#e8ab66' },
    { id: 'croquette', name: '可乐饼', image: 'assets/obstacles/croquette.png', color: '#edc45d' }
  ];
  const skills = [
    {sourceName:'am-sakiko',name:'祥子 · 吃货小祥',description:'落地后有50%概率随机吃掉一个食物，困难模式100%；每次获得200分。'},
    {sourceName:'mygo-taki',name:'立希 · RinG打工人',description:'落地后独立判定：80%概率掉一杯咖啡，20%概率掉一杯巴菲，可同时掉落。困难模式咖啡触发后有50%概率掉两杯，巴菲概率30%。'},
    {sourceName:'am-umiri',name:'海铃 · 购物ing',defaultEnabled:false,description:'简单15%、困难30%概率以购物袋天使形态登场，上排占3格、下排居中占1格，不能旋转。消除后左右购物袋各自以简单50%、困难80%概率留下，独立下落；购物袋不是食物，可随邻近消除一起清除。'},
    {sourceName:'ras-chuchu',name:'CHUCHU · 小矮子',defaultEnabled:false,description:'CHUCHU 每次登场有 30% 概率变为鸭子坐姿的迷你体型，占 1 × 1 格；其余 70% 为普通体型，占 1 × 2 格。迷你形态旋转后仍只占 1 格，消除和羁绊仍按 CHUCHU 计算。'},
    {sourceName:'mor-tsukushi',name:'筑紫 · “长大”的 Girl',defaultEnabled:false,description:'筑紫每次登场有 30% 概率变为鸭子坐姿的迷你体型，占 1 × 1 格；其余 70% 为普通体型，占 1 × 2 格。迷你形态旋转后仍只占 1 格，消除时仍算一位筑紫。'},
    {sourceName:'mygo-rana',name:'要乐奈 · 野猫！',defaultEnabled:false,description:'乐奈下落时，如果场上有抹茶巴菲，她会无视沿途阻挡直接冲过去，吃掉后获得 200 分，并在巴菲原位置落定。有多个巴菲时随机选择一个；没有巴菲时可以正常操纵乐奈。新巴菲落定时，场上尚未吃过巴菲的乐奈与现存巴菲随机一对一配对，各自移动并获得200分。每个乐奈至多吃一个巴菲，吃过后不再追逐；每个巴菲只能被一个乐奈选择。'},
    {sourceName:'rose-yukina',name:'友希那 · 省电乐队',defaultEnabled:false,description:'友希那登场时，根据场上其他 Roselia 成员的人数判定一次是否进入黑屏：0–1 人为 0%，2 人为 25%，3 人为 50%，4 人为 75%。同一成员重复出现只算 1 人，友希那不计入人数。触发后，棋盘仅有以正在下落的友希那中心为圆心、半径 2 格的圆形区域可见，光照会随她移动。友希那落地后，棋盘恢复可见。'},
    {sourceName:'am-mutsumi',name:'睦 · 黄瓜',description: "睦落地后，有 80% 概率从随机一列掉落 1 根黄瓜，20% 概率不掉落。黄瓜占 1 格，与消除的角色或被连带消除的食物上下左右相连时一起消除，每根获得 200 × 当前连锁数的分数。"},
    {sourceName:'hhw-kanon',name:'花音 · 迷路之子',defaultEnabled:false,description: "操控花音时，每次左右移动或旋转都有 50% 概率变为相反方向。"},
    {sourceName:'ras-pareo',name:'缤纷 PAREO',defaultEnabled:false,description: "PAREO 登场时随机选择一种发色，粉蓝 40%、黑白 20%，蓝白、绿白、紫白、红黄各 10%。粉蓝可代替彩，蓝白可代替日菜，绿白可代替麻弥，紫白（中心白色）可代替伊芙，红黄可代替千圣，参与 PP 的五人消除；黑白只能参与 RAS 消除。丸山彩家族仅接受粉蓝配色。所有发色都能参与 RAS 消除；同时满足两队条件时，优先消除 RAS。同一个 PAREO 不能同时计入两队得分，每组消除获得 1000 × 当前连锁数的分数。"},
    {sourceName:'toyama-asuka',name:'户山明日香',defaultEnabled:false,description: "开启后，明日香会加入可登场角色。明日香与香澄上下左右相连时触发「户山姐妹」消除；明日香、亚子和六花三人连通时触发「羽丘三小只」消除。相连的同组角色一起消除，每组获得 1000 × 当前连锁数的分数。同时满足两种组合时，优先触发「户山姐妹」。明日香登场后，需要完成组合消除才有机会再次登场。"},
    { sourceName: 'pp-chisato', name: '千圣 · 想变得big', defaultEnabled: false, description: "千圣登场时，有 71% 概率为普通的 1 × 2 大小，24% 概率变为 2 × 4，5% 概率变为 3 × 6，不出现 4 × 8。困难模式为32%变为2×4、8%变为3×6、1%变为4×8，其余59%为普通体型。旋转时宽高互换。变大后仍算一位千圣，消除分数不变。" },
    { sourceName: 'pp-hina', name: '日菜 · 想发射光波', defaultEnabled: false, description: "日菜下落时，每按一次 W 都有 15% 概率发射光波，每次登场最多成功发射一次。光波会随机选中一位尚未与队友相连的角色，将其传送到能与队友相连的空位。没有合适的角色或空位时不会发射；光波飞行期间日菜继续下落。" },
    { sourceName: 'rose-sayo', name: '纱夜 · 纱夜漂浮于空中', defaultEnabled: false, description: "纱夜下落时按 W，可立即在当前位置悬浮落定。悬浮的纱夜会发出蓝光，在被消除前不会下落，也可以支撑上方角色。" },
    { sourceName: 'aya-family', name: '群体 · 丸山彩家族', defaultEnabled: false, description: "彩、爱音、七深、绯玛丽和粉蓝发色的 PAREO 五人通过上下左右连通时，触发「丸山彩家族」消除。其他发色的 PAREO 不参与此组合；关闭「缤纷 PAREO」时，原本的粉蓝 PAREO 仍可参与。相连的家族成员一起消除，包括重复出现的成员，每组获得 1000 × 当前连锁数的分数。" },
    { sourceName: 'ag-moka', name: '摩卡 · 商店街荣誉市民', description: "摩卡落地后，必定随机吃掉场上的 1 个食物，可吃海螺包、长面包、抹茶巴菲、咖啡、可乐饼或黄瓜，每次获得 200 分。场上没有食物时不触发。" },
    { sourceName: 'mygo-tomori', name: '灯 · 不可思议女孩', description: "灯落地后，有 80% 概率从随机一列掉落 1 块石头，20% 概率不掉落。石头占 1 格，不会随旁边的角色一起消除。灯参与组合消除时，会带走场上全部石头，每块获得 200 × 当前连锁数的分数。" },
    { sourceName: 'crychic', name: '群体 · CRYCHIC', description: "祥子、睦、立希、爽世和灯五人通过上下左右连通时，触发 CRYCHIC 消除。相连的 CRYCHIC 成员一起消除，包括重复出现的成员，每组获得 1000 × 当前连锁数的分数。莫缇斯不能代替睦参与此组合。" },
    { sourceName: 'am-mortis', name: '莫缇斯 · 全都不会弹', description: "莫缇斯可能会随机消除一些角色" },
    { sourceName: 'ag-tsugumi', name: '鸫 · 喝咖啡吗', description: "鸫落地后，有 50% 概率掉落 1 杯咖啡，30% 概率掉落 2 杯，20% 概率不掉落。咖啡从随机列落下，每杯占 1 格；同次掉落的 2 杯会落在不同列。咖啡与消除的角色或被连带消除的食物上下左右相连时一起消除，每杯获得 200 × 当前连锁数的分数。" },
    { sourceName: 'ppp-saaya', name: '纱绫 · 来单海螺包', description: "纱绫落地后，40% 概率掉落海螺包（1 行 × 1 列），15% 概率掉落横放的长面包（1 行 × 2 列），15% 概率掉落竖放的长面包（2 行 × 1 列），10% 概率掉落抹茶巴菲（2 行 × 1 列），20% 概率不掉落。以上为基础掉落。场上有里美时额外掉落 1 个海螺包，有摩卡时额外掉落 1 个长面包（横放、竖放各半）。两项可同时触发，食物各自从随机位置落下。食物与消除的角色或被连带消除的食物上下左右相连时一起消除，每个获得 200 × 当前连锁数的分数。" },
    { sourceName: 'hhw-hagumi', name: '育美 · 要吃可乐饼吗', description: "育美落地后，必定掉落 1 个可乐饼，有 50% 概率再掉落第 2 个；从第 3 个起，每个都有 20% 概率继续掉落，直到未触发为止。每个可乐饼占 1 格，从随机列落下，可能落在同一列。可乐饼与消除的角色或被连带消除的食物上下左右相连时一起消除，每个获得 200 × 当前连锁数的分数。" },
    { sourceName: 'hhw-kokoro', name: '心 · 飞起来吧', description: "心下落时，每按一次 W 就向上移动 1 格，朝向不变。上方有阻挡或超出可移动范围时，不会移动。" },
    { sourceName: 'hhw-michelle', name: '美咲 · 米歇尔', description: "开启后，美咲每次登场有 50% 概率以 1 × 2 的美咲形态出现，50% 概率以 2 × 2 的米歇尔形态出现。两种形态都算 HHW 的同一位成员，消除分数相同。关闭后只出现美咲形态。" },
    { sourceName: 'ppp-rimiri', name: '里美 · 巧克力螺！', description: "里美落地后，必定随机吃掉场上的 1 个巧克力海螺包，每次获得 200 分。场上没有海螺包时不触发。" },
    { sourceName: 'mor-mashiro', name: '真白 · 全速向后前进', description: "真白以头朝下的姿势登场。头朝下时，自然下落速度为设置速度的 3 倍；其他姿态按设置速度正常下落。所有姿态都向下落，均可加速或直落。" }
  ];

  const summaries = {
    'am-sakiko':'落地后可能吃掉一个食物，困难模式必定触发。','mygo-taki':'独立判定咖啡和巴菲掉落，可同时触发。','am-umiri':'可能变为不可旋转的购物天使，消除后可能留下购物袋。',
    'ras-chuchu':'CHUCHU 登场时可能变成只占一格的迷你体型。',
    'mor-tsukushi':'筑紫登场时可能变成只占一格的迷你体型。',
    'mygo-rana':'下落时冲向巴菲；已落定的乐奈也会移到新掉落的巴菲处吃掉它。',
    'rose-yukina':'队友越齐，越可能让棋盘变黑，只照亮友希那周围。',
    'am-mutsumi':'落地时可能掉落黄瓜。','hhw-kanon':'移动与旋转有时会反向。','ras-pareo':'随机发色，可代替对应 PP 成员参与消除，优先结算 RAS。',
    'toyama-asuka':'明日香加入角色池，并可与指定角色连通消除。','pp-chisato':'登场时可能变大。','pp-hina':'按 W 尝试发射光波，让独立成员连接队友。',
    'rose-sayo':'按 W 在空中落定，可支撑其他角色。','aya-family':'丸山彩家族成员连通时可以消除。','ag-moka':'落地后吃掉一个食物并得分。',
    'mygo-tomori':'落地时可能掉石头，灯消除时带走全场石头。','crychic':'CRYCHIC 成员连通时可以消除。','am-mortis':'落地时可能清除自身及相邻角色。',
    'ag-tsugumi':'落地时可能掉落咖啡。','ppp-saaya':'落地时可能掉落面包或巴菲。有里美时额外掉海螺包，有摩卡时额外掉长面包。','hhw-hagumi':'落地时掉落可乐饼，可能连续掉落。',
    'hhw-kokoro':'按 W 向上移动。','hhw-michelle':'美咲可能以更大的米歇尔形态登场。','ppp-rimiri':'落地后吃掉一个海螺包并得分。','mor-mashiro':'头朝下登场，头朝下时下落更快。'
  };
  skills.push({sourceName:'mor-nanami',name:'收藏',defaultEnabled:true,description:'落地必定收集至多5个非收藏障碍物；简单模式60%、困难模式100%制作收藏，数量按收集格数的30–50%／40–60%随机向下取整。取消越界掉落且不补发。七深消除带走全场收藏。'});
  summaries['mor-nanami']='掉落收藏，自身消除带走全场收藏。';
  for(const skill of skills) skill.summary=summaries[skill.sourceName];
  const bondRules=typeof module!=='undefined'&&module.exports?require('./bonds'):root.PicoBonds;
  const nameOf=id=>id==='am-mortis'?'莫缇斯':id==='hhw-michelle'?'美咲/米歇尔':characters.find(c=>c.sourceName===id).displayName;
  skills.push({sourceName:'bonds',name:'群体 · 羁绊得分',defaultEnabled:false,summary:'部分角色相连会有额外得分。',description:
    '下表中的角色上下左右直接接触时，可获得对应的羁绊分数，不会因此消除。角色落定后先获得羁绊分数，再进行消除；下落后形成的新接触也能触发。斜角接触或隔着其他角色不算。冰川三明治需要同一位鸫同时接触日菜和纱夜；冰川双子则需要日菜和纱夜直接接触。\n同一对角色（或同一组三人）只计分一次，分开后再接触不会重复得分；新登场的角色可以再次组成羁绊。多种羁绊的分数可以叠加，不受连锁倍数影响。除薰千圣外，满足条件即可获得分数；薰千圣有 80% 概率加 100 分、20% 概率扣 100 分。\n'+
    bondRules.map(r=>r.name+'：'+nameOf(r.a)+(r.triple?' 同时接触 ':' × ')+[].concat(r.b).map(nameOf).join(r.triple?' 和 ':' / ')+'，'+(r.negativeChance?'80% +100 分，20% −100 分': '+'+r.points+' 分')).join('；\n')+'。'
  });
  // Each mode has a complete description, including skills whose rules are identical.
  for (const skill of skills) {
    skill.descriptions = {easy: skill.description, hard: skill.description};
    skill.summaries = {easy: skill.summary, hard: skill.summary};
  }
  const describe = (id, easy, hard, easySummary, hardSummary) => {
    const skill = skills.find(s => s.sourceName === id);
    skill.descriptions = {easy, hard};
    skill.summaries = {easy: easySummary, hard: hardSummary};
    skill.description = easy; skill.summary = easySummary;
  };
  const original = id => skills.find(s => s.sourceName === id).description;
  describe('am-sakiko', '祥子落地后，有50%概率随机吃掉场上的一个食物，获得200分。可吃海螺包、长面包、巴菲、咖啡、可乐饼或黄瓜；没有食物时不触发，购物袋不可食用。', '祥子落地后，必定随机吃掉场上的一个食物，获得200分。可吃海螺包、长面包、巴菲、咖啡、可乐饼或黄瓜；没有食物时不触发，购物袋不可食用。', '50%概率吃掉一个食物。', '必定吃掉一个现存食物。');
  describe('mygo-taki', '立希落地后，独立判定80%概率掉落一杯咖啡、20%概率掉落一杯巴菲。两项可同时触发，也可能均不触发，各自从随机列掉落。咖啡占1格，巴菲占1×2格；可被食用或随邻近消除清除。', '立希落地后，独立判定80%概率掉落咖啡、30%概率掉落一杯巴菲。咖啡触发后，50%掉一杯、50%掉两杯。咖啡和巴菲可同时掉落，各自从随机列掉落。咖啡占1格，巴菲占1×2格；可被食用或随邻近消除清除。', '咖啡80%、巴菲20%，独立判定。', '咖啡80%，触发后半数掉两杯；巴菲30%，独立判定。');
  const shopping = (form, bag) => '海铃登场时有'+form+'%概率变为购物袋天使，上排占3格、下排居中占1格，不能旋转，其余为普通体型。消除前购物袋与海铃是同一个角色；海铃被消除后，左右购物袋各自有'+bag+'%概率留在原翅膀位置，成为独立占1格的障碍物并自由下落。购物袋不是食物，会随上下左右相连的消除一起清除。';
  describe('am-umiri', shopping(15,50), shopping(30,80), '15%购物形态；两侧购物袋各50%概率遗留。', '30%购物形态；两侧购物袋各80%概率遗留。');
  describe('hhw-kanon', '操控花音时，每次左右移动或旋转各有30%概率变为相反方向。自然下落不受影响。', '操控花音时，每次左右移动或旋转各有50%概率变为相反方向。自然下落不受影响。', '左右移动与旋转各有30%概率反向。', '左右移动与旋转各有50%概率反向。');
  const giant = '旋转时宽高互换。变大后仍算一位千圣，消除分数不变。';
  describe('pp-chisato', '千圣登场时，71%为普通1×2体型、24%为2×4、5%为3×6，不出现4×8。'+giant, '千圣登场时，59%为普通1×2体型、32%为2×4、8%为3×6、1%为4×8。'+giant, '变大概率：24%／5%／0%。', '变大概率：32%／8%／1%。');
  for(const [id, noun] of [['am-mutsumi','黄瓜'],['mygo-tomori','石头']]){
    const easy=original(id), hard=easy.replace(/有 80% 概率从随机一列掉落 1 [根块][^，]+，20% 概率不掉落。/, '30%概率掉落1个'+noun+'、30%掉落2个、20%掉落3个、20%不掉落，各自从随机列落下。');
    describe(id,easy,hard,'80%概率掉落1个'+noun+'。','30%／30%／20%概率掉落1／2／3个'+noun+'。');
  }
  const coffee=original('ag-tsugumi');
  describe('ag-tsugumi',coffee,coffee.replace('有 50% 概率掉落 1 杯咖啡，30% 概率掉落 2 杯，20% 概率不掉落。','20%概率掉落1杯咖啡、30%掉落2杯、20%掉落3杯、10%掉落4杯、20%不掉落。').replace('同次掉落的 2 杯','同次掉落的咖啡'), '50%掉1杯、30%掉2杯咖啡。','20%／30%／20%／10%掉1／2／3／4杯咖啡。');
  const bread=original('ppp-saaya');
  describe('ppp-saaya',bread,bread.replace('以上为基础掉落。','以上为基础掉落；触发后有50%概率将该次基础掉落数量翻倍。另按场上角色总数（含刚落地的纱绫、不含障碍物）除以12向下取整，额外掉落对应数量的食物，每个各有50%概率为竖放长面包或海螺包。里美和摩卡带来的额外掉落不翻倍。'), '基础掉落面包或巴菲；里美、摩卡各提供额外掉落。','基础掉落半数翻倍；每12名场上角色额外掉一个面包或海螺包。');
  const croquette=original('hhw-hagumi');
  describe('hhw-hagumi',croquette,croquette.replace('必定掉落 1 个可乐饼，有 50% 概率再掉落第 2 个；从第 3 个起，每个都有 20% 概率继续掉落','必定掉落3个可乐饼；从第4个起，每个都有50%概率继续掉落'), '必掉1个，第2个50%，后续每个20%。','必掉3个，后续每个50%概率继续掉落。');
  for(const [id,count,food] of [['ag-moka',5,'食物'],['ppp-rimiri',3,'海螺包']]){
    const easy=original(id),hard=easy.replace('必定随机吃掉场上的 1 个','必定随机吃掉场上至多'+count+'个').replace('每次获得 200 分','每个获得200分');
    describe(id,easy,hard,'落地后吃掉一个现存'+food+'。','落地后吃掉至多'+count+'个现存'+food+'。');
  }
  const mashiro=original('mor-mashiro');
  describe('mor-mashiro',mashiro,mashiro.replace('3 倍','5 倍'),'头朝下时以设置速度的3倍下落。','头朝下时以设置速度的5倍下落。');
  const rana=skills.find(s=>s.sourceName==='mygo-rana');
  rana.summaries={easy:'与巴菲一对一配对，每个乐奈至多吃一次。',hard:'与巴菲一对一配对，每个乐奈至多吃一次。'};
  const roster = { bands, characters, guests, variants, obstacles, skills };
  if (typeof module !== 'undefined' && module.exports) module.exports = roster;
  else root.PicoRoster = roster;
})(typeof globalThis !== 'undefined' ? globalThis : this);
