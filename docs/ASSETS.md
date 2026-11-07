# 人物贴图对照

游戏只加载 `assets/characters/front/<文件名>.png`。原图提取的侧面位于 `assets/characters/side/<文件名>.png`，保留但不使用。文件名沿用用户素材名称，包括 `rimiri`、`ive`、`risa` 等原始拼写。

下表每列对应游戏内固定编号。编号只是本游戏配置，不表示官方排序。

| 乐队 | 1 号 | 2 号 | 3 号 | 4 号 | 5 号 |
| --- | --- | --- | --- | --- | --- |
| Poppin’Party | 户山香澄 `ppp-kasumi` | 花园多惠 `ppp-otae` | 牛込里美 `ppp-rimiri` | 山吹沙绫 `ppp-saaya` | 市谷有咲 `ppp-arisa` |
| Afterglow | 美竹兰 `ag-ran` | 青叶摩卡 `ag-moka` | 上原绯玛丽 `ag-himari` | 宇田川巴 `ag-tomoe` | 羽泽鸫 `ag-tsugumi` |
| Pastel＊Palettes | 丸山彩 `pp-aya` | 冰川日菜 `pp-hina` | 白鹭千圣 `pp-chisato` | 大和麻弥 `pp-maya` | 若宫伊芙 `pp-ive` |
| Roselia | 凑友希那 `rose-yukina` | 冰川纱夜 `rose-sayo` | 今井莉莎 `rose-risa` | 宇田川亚子 `rose-ako` | 白金燐子 `rose-rinko` |
| Hello, Happy World! | 弦卷心 `hhw-kokoro` | 濑田薰 `hhw-kaoru` | 北泽育美 `hhw-hagumi` | 松原花音 `hhw-kanon` | 奥泽美咲／米歇尔 `hhw-michelle` |
| Morfonica | 仓田真白 `mor-mashiro` | 桐谷透子 `mor-toko` | 广町七深 `mor-nanami` | 二叶筑紫 `mor-tsukushi` | 八潮瑠唯 `mor-rui` |
| RAISE A SUILEN | LAYER `ras-layer` | LOCK `ras-lock` | MASKING `ras-masking` | PAREO `ras-pareo` | CHU² `ras-chuchu` |
| MyGO!!!!! | 高松灯 `mygo-tomori` | 千早爱音 `mygo-anon` | 要乐奈 `mygo-rana` | 长崎爽世 `mygo-soyo` | 椎名立希 `mygo-taki` |
| Ave Mujica（默认开启） | 三角初华 `am-uika` | 若叶睦 `am-mutsumi` | 八幡海铃 `am-umiri` | 祐天寺若麦 `am-nyamu` | 丰川祥子 `am-sakiko` |

例如：`assets/characters/front/rose-ako.png` 是亚子的游戏贴图，`assets/characters/side/rose-ako.png` 是保留的侧面。

全部正式正侧面贴图均为 **512 像素可见高度，宽度按原比例变化**。目前正面共 54 张，侧面共 47 张。窄身材与双马尾角色具有不同宽度，不能再套用固定 256 × 512 的缩略图框，否则宽角色会被错误缩小。

美咲的原正面为 `assets/characters/front/hhw-misaki.png`，原侧面为 `assets/characters/side/hhw-misaki.png`。美咲本人碰撞为 1 × 2，米歇尔为 2 × 2；两种形态按技能开关登场。未提供米歇尔侧面，因此不伪造侧面文件。

Ave Mujica 五人的原占位图已直接替换为正式立绘，并补齐侧面。另有 `am-mortis.png` 和 `smm-mana.png` 的正侧面，分别用于睦的另一形态与 sumimi 成员。莫缇斯已修为与心、爱音类似的自然张嘴笑。所有文件位于 front/side 对应目录。

程序逻辑仅根据 `src/roster.js` 的 `square` 字段决定米歇尔占四格，任何 PNG 的视觉宽度、透明像素或覆盖范围均不影响碰撞和四向连接。

食物障碍物放在 `assets/obstacles/`，分别为 `coffee.png`（咖啡）、`cornet.png`（巧克力海螺包）、`croquette.png`（可乐饼）。三种都为透明 PNG，按原比例放入一个格子。图片可直接替换；碰撞始终为 1 × 1。

石头使用 `assets/obstacles/stone.png`，透明背景，碰撞为 1 × 1；由灯的技能掉落，不能被食物技能吃掉。

新增正面：`hhw-kaoru-sleep.png`（闭眼）、`toyama-asuka.png`（明日香）、`ras-pareo-black-white.png`、`ras-pareo-green-white.png`、`ras-pareo-yellow-red.png`、`ras-pareo-blue-white.png`。PAREO 默认粉蓝图仍为 `ras-pareo.png`，旧版确定性换色脚本位于 `scripts/recolor-pareo.js`；当前蓝白、紫白为 imagegen 编辑版本。黄瓜为 `assets/obstacles/cucumber.png`。


四种障碍物重绘为透明 PNG：`baguette.png`（摩卡参考图中的法棍）、`parfait.png`（参考上半部的抹茶与水果装饰，补全玻璃杯）、`cucumber.png`（参考图中的单根黄瓜）、`stone.png`（圆润鹅卵石）。参考图保留在同目录，生成提示见 `docs/OBSTACLE-PNG-ARTWORK.md`。长面包支持横竖摆放；巴菲占 2 行 × 1 列；黄瓜、石头仍占 1 格。

白紫 PAREO：`assets/characters/front/ras-pareo-purple-white.png`，420 × 512 透明 PNG；中心白色，紫色目标为伊芙浅紫 #DDBBFF。由 imagegen 基于绿白贴图编辑并缩放，独立于旧版确定性换色脚本。

2026-10-29 校服修正：六花 `ras-lock`（正面、侧面）、祥子 `am-sakiko`（正面、侧面）、明日香 `toyama-asuka`（正面）均改为亚子／爱音同款高一校服：灰色白边外套、绿金领带、绿金格裙。蓝白 PAREO 改用日菜蓝 #55DDEE。全部沿用原资源路径及尺寸；原图保存在 `assets/characters/unused/pre-haneoka-first-year-20261029/`，不加载且不删除。

本次使用内置 imagegen；提示词见 `assets/characters/review-skills/haneoka-first-year-prompts.json`，预览见 `assets/characters/review-skills/haneoka-first-year-preview.png`。图像为生成式编辑，不承诺未修改区域逐像素一致。
