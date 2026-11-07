# Ave Mujica / sumimi · PICO 立绘审阅稿

本批已于 2026-10-19 安装到正式 assets/characters/front 与 side 目录，旧 Mujica 占位图直接覆盖，未留备份。美咲本人正面已从 unused 移至 front/hhw-misaki.png。

## 文件与服装

每个文件名在 `front/` 和 `side/` 各有一张透明 PNG。侧面统一朝左。

| 文件名 | 角色 | 本次服装与表情 |
| --- | --- | --- |
| am-uika.png | 三角初华 | 花咲川校服，平静微笑 |
| am-umiri.png | 八幡海铃 | 花咲川校服，平静表情 |
| am-sakiko.png | 丰川祥子 | 羽丘校服，微笑 |
| am-mutsumi.png | 若叶睦 | 月之森校服，无笑意的平静表情 |
| am-nyamu.png | 祐天寺喵梦 | 灰色露肩低领上衣、黑裙、黑色踝带鞋 |
| am-mortis.png | 莫缇斯 | 官方 Ave Mujica 演出服，自然开心的张嘴笑（参考心、爱音）；与睦分别保留 |
| smm-mana.png | 纯田真奈 | 黑色上衣、白色胸口、白色长裤、黑鞋 |

## 规格

- 14 张 PNG 均有实际 alpha 透明通道。
- 每张画布高度和非透明内容高度均为 512 像素；宽度等比保留，不拉伸到固定 1:2。
- 人物正面站立、手臂自然下垂；侧面为朝左视图。
- 图像按原 PICO 素材的大头小身体、简化线条和赛璐璐色块制作，供人工审阅。
- `review-contact-sheet.png`：七组正侧面对照总览，展示背景仅用于审阅，不属于单张 PNG。
- `manifest.json`：逐张尺寸与文件记录。
- `originals/`：内置 imagegen 原始生成稿；透明区域可能保留不可见 RGB，正常合成时不显示。
- `prompts.json`：本批生成提示词。
- `prepare-review.cjs`：仅作透明边界裁切、等比缩放、规格校验及对照图排版，不绘制或替换人物内容。需要 Node.js 与 sharp。

## 真实图片参考（生成前已下载并逐张查看）

使用官方角色图片确认发型、发色、瞳色与辨识特征；校服以本项目既有素材为准。真奈白裤是用户指定改装，未宣称为官方立绘中的服装。

- 初华：https://anime.bang-dream.com/avemujica/character/uika/ — `references/img_uika_1.png`、`img_uika_2.png`
- 祥子：https://anime.bang-dream.com/avemujica/character/sakiko/ — `references/img_sakiko_1.png`
- 海铃：https://anime.bang-dream.com/avemujica/character/umiri/ — `references/img_umiri_1.png`
- 喵梦：https://anime.bang-dream.com/avemujica/character/nyamu/ — `references/img_nyamu_1.png`
- 睦、莫缇斯：https://anime.bang-dream.com/avemujica/character/mutsumi/ — `references/img_mutsumi_1.png`、`img_mutsumi_2.png`（演出服）
- 真奈：https://anime.bang-dream.com/avemujica/character/mana/ — `references/img_mana_1.png`
- 真奈补充官方图片：https://anime.bang-dream.com/mygo/character/mana/ — `references/mana-casual.png`（文件收集时的临时名称，实际内容为官方舞台装，并非白裤参考）

## 风格参考

制作前查看了 `docs/characters-front.png`、`docs/characters-side.png` 总览。直接输入的风格参考包括 `ppp-otae`、`ag-moka`、`mor-mashiro` 的正侧面：分别用于花咲川、羽丘和月之森校服。所有侧视稿同时参考本角色的新正视稿保持设计一致。

使用内置 `image_gen.imagegen` 生成，未使用 CLI/API fallback。已按用户指令替换游戏资源；莫缇斯与真奈仅保存资源，不新增玩法。表情修订提示词见 mortis-expression-revision.json。
