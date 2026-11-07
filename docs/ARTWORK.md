# 美术处理来源

八支乐队的正面、侧面来自用户提供的 40 张 JPG，使用 `scripts/prepare_assets.py` 本地处理。用户要求使用脚本移除黑色背景，因此这部分没有使用生成式修改。米歇尔通过同一脚本参照 `pico-png-source/界面示例.png` 绘制透明熊头。

初始占位素材使用内置 imagegen 工具生成一张角色图集。用户提供实际原图后，八支乐队已全部替换。当前仅 Ave Mujica 的五个正面占位 PNG 继续来自该图集最后一行；默认不加入游戏。这些是临时原创建模参考形象，并非准确的官方角色立绘。

生成提示原文：

> Use case: stylized-concept. Asset type: one game character sprite atlas for a small fan puzzle game, placeholder artwork. Create exactly 45 distinct adorable chibi girl musician full-body sprites, arranged in an exact regular 5-column by 9-row grid. Transparent background, no labels, no letters, no grid lines, no watermark. Each cell same size, each character entirely contained and centered in its cell, generous transparent gaps. Short petite 2-head-tall proportions, large heads, tiny bodies, thick clean dark outlines, flat pastel colors, crisp cute 2D anime sticker game art. Every character is standing facing viewer, small simple concert costume. Grid rows represent nine band themes: row 1 pink cheerful pop (brown, black, light brown, dark brown, blonde hair); row 2 red rock (black short, teal bob, pink, blonde, brown hair); row 3 mint pastel idol (pink, blonde, blonde, dark blue, green hair); row 4 purple gothic (silver, dark blue, pale blonde, purple, brown hair); row 5 yellow circus pop (blonde, purple, orange, blue, brown hair); row 6 sky blue classical (light brown, blonde, pink, black, silver hair); row 7 cyan electronic rock (brown, brown, mint, pink, blonde hair); row 8 blue alternative (grey, pink, brown, black, dark blue hair); row 9 burgundy gothic theatrical (black, green, red, silver, light blue hair). These are original temporary placeholders, not precise official character portraits. Portrait atlas aspect ratio 5:9. Uniform character scale, full feet visible, no overlap between cells.

内置生成工具曾尝试按参考图提取米歇尔，但连接失败，未产生可用资源；最终米歇尔使用上述脚本绘制，未改用付费 API 或 CLI。

## 食物障碍物

三种食物使用内置 imagegen 生成透明图集，参考 `pico-png-source/界面示例.png` 和 `pico-png-source/界面示例2-咖啡.png`，随后由 `scripts/split_obstacles.py` 分割并裁去透明留白。最终文件为：

- `assets/obstacles/coffee.png`
- `assets/obstacles/cornet.png`
- `assets/obstacles/croquette.png`

生成提示原文：

> Use case: stylized-concept. Asset type: a single transparent game sprite sheet with THREE food icons, one horizontal row of three equal square cells, generous transparent margin between icons. References are visual style references only. LEFT CELL: white porcelain coffee cup filled with dark brown coffee, handle on the right and white saucer, three-quarter front view, matching the coffee on the board of the second reference. CENTER CELL: Japanese chocolate cornet bread, a golden-brown cone-shaped spiral bread with three chunky bands and dark chocolate filling visible in the large round opening facing lower right, matching the bread in the upper right board in first reference. RIGHT CELL: one golden oval Japanese fried croquette, oblique oval silhouette, rough crunchy crumb edging, small orange crumb flecks, matching the croquette in lower middle board of first reference. Clean flat 2D anime game art, thin dark brown outlines, minimal simple cel shading, crisp readable at 48px. Each food is an isolated standalone object, centered fully within its own cell, no props other than saucer, no text, no UI, no grid, no extra characters. True transparent background. Output wide 3:1 atlas.
