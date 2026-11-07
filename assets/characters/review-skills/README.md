# 2026-10-26 新增立绘

正式文件位于 `assets/characters/front/`，均为透明 PNG、可见高度 512 px。

- `hhw-kaoru-sleep.png`：薰的闭眼微笑版本，保留原睁眼立绘。
- `toyama-asuka.png`：户山明日香正视图，参考 [动画官方角色页](https://anime.bang-dream.com/1st/character/asuka/) 的外观，配羽丘制服；参考图保存为 `asuka-reference.png`。
- `ras-pareo-black-white.png`、`ras-pareo-green-white.png`、`ras-pareo-yellow-red.png`、`ras-pareo-blue-white.png`：从现有 `ras-pareo.png` 仅替换头发区域的像素颜色。默认粉蓝图不变。使用 `scripts/recolor-pareo.js`，区域记录见 `pareo-hair-mask.png`；验证透明度、眼睛、服装和腿部像素保持一致。

薰和明日香使用内置 image_gen 工具生成，再裁去透明边距并等比缩放到 512 px。PAREO 遵照用户的像素换色要求用确定性脚本处理，未重新生成角色。

## 薰最终提示词

Edit this exact game sprite of Seta Kaoru. Only change her eyes to two gently closed smiling/sleeping eyes, a relaxed closed-eye smile. Preserve absolutely everything else: identical purple hair, head outline, uniform, pose, proportions, colors, linework and tiny mouth. Full body front view, true transparent background. This is an alternate expression for the exact same PICO game sprite, not a redesign. Output one character.

输入：`assets/characters/front/hhw-kaoru.png`。

## 明日香最终提示词

One front-facing full body Toyama Asuka PICO chibi game sprite, transparent background. Image1 identity: short chestnut brown hair, two silver hair clips on viewer left, purple eyes, gentle smile, no cat-ear hair. Images2 and3 define exact simple PICO style: oversized head, tiny body, crisp black anime outline, flat cel shading, neutral arms-at-sides pose. Use Haneoka high school gray blazer and brown plaid skirt with necktie, dark knee socks and brown loafers matching image3 uniform, not image1 middle school clothes. About 2.4 heads tall. One front view only. No text, no props, no shadow. Match the game's existing sprite style and proportions.

输入顺序：官方明日香参考、`ppp-kasumi.png`、`hhw-kaoru.png`。

- `ras-pareo-purple-white.png`：imagegen 基于绿白图制作，中心白色，绿色头发区域替换为伊芙浅紫 #DDBBFF；透明 PNG，缩放为 420 × 512。提示词要求仅更换绿色头发，保留白色中心、姿态、表情、服装及透明背景。此图为生成式编辑，不属于旧版逐像素换色验证范围。

2026-10-29：蓝白 PAREO 更新为日菜蓝 #55DDEE；六花两视图、祥子两视图、明日香正面换为亚子／爱音同款高一校服。当前蓝白不再属于逐像素换色版本。原图在 `../unused/pre-haneoka-first-year-20261029/`；提示词、生成结果路径和汇总预览见本目录 `haneoka-first-year-*` 文件。
