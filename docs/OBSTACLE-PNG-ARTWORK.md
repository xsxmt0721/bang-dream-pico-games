# 障碍物 PNG 重绘

使用内置 imagegen 生成透明 PNG。游戏用版本裁去透明留白并等比缩小至最长边不超过 512 像素，保留 alpha。原有三张参考图保留在 `assets/obstacles/`。碰撞尺寸与概率不因贴图更换而改变。

## parfait — `assets/obstacles/parfait.png`

参考：parfait上半部参考图.jpg。

最终生成提示词：

Create one transparent PNG game obstacle sprite: a full matcha parfait in a tall glass, front three-quarter view, tall silhouette height roughly twice width to fit one column and two rows. The supplied image is the TOPPING AND ANIME STYLE reference: preserve the recognizable tall pale matcha-green soft-serve spiral, vivid green matcha ice cream scoop, orange wedges and banana slices; small red fruit accents allowed as in reference. Invent a coherent lower half: a slender clear fluted dessert glass with visible cream and green matcha layers, short stem and round foot. Simplify topping detail enough to read at 50x100 pixels. Japanese anime cel-shaded food illustration, clean subtle dark outlines, flat colors and restrained painted shading, bright neutral illumination so green reads clearly. Isolated single complete parfait, tightly framed with small transparent margin, all glass and toppings visible. No person, hand, spoon, text, logo, backdrop, floor or cast shadow. Genuine transparent background, not a checkerboard.

## baguette — `assets/obstacles/baguette.png`

参考：面包参考图.png。

最终生成提示词：

Create one transparent PNG game food sprite using ONLY the long baguette bread that Moka is eating in the reference as the subject and style reference. Render a whole intact elongated French baguette with gently rounded tapered ends, golden tan crust, a few simple diagonal pale scoring cuts and darker toasted side shading, matching the cute Japanese chibi anime cel-shaded drawing of the reference. No bite, no character, no hands, no text. Orient bread HORIZONTALLY left to right, length about 2.5 times its thickness, slight dimensional depth but essentially front/side game-icon view. Compact simple bold silhouette readable in a two-column one-row grid cell. Entire bread fully visible with very small transparent margin. Genuine transparent background; no plate, floor, shadow or checkerboard. One asset only.

## cucumber — `assets/obstacles/cucumber.png`

参考：黄瓜参考图.png。

最终生成提示词：

Create one transparent PNG game food sprite of ONE whole cucumber, using the cucumbers in the supplied anime reference for silhouette and painted cel-shading style. Slender naturally slightly curved deep green Japanese cucumber with irregular lighter green longitudinal highlights and a few small bumps, rounded ends and a tiny stem stub. Show exactly one cucumber, diagonally from bottom-left to top-right to read in a square one-cell game slot, entire vegetable visible, tight framing with small transparent margins. Use the reference's understated hand-drawn anime food treatment but neutral brighter lighting so the dark-green cucumber remains legible on a dark game board. Not photorealistic, no cartoon face, no extra cucumbers, no basket, no lettering or subtitle, no hand, no floor or cast shadow. Genuine transparent background, no checkerboard.

## stone — `assets/obstacles/stone.png`

参考：鹅卵石造型，无外部参考图。

最终生成提示词：

Create one transparent PNG game obstacle sprite of a single smooth rounded river pebble. A squat oval naturally asymmetric gray pebble, weathered and water-worn, no sharp facets. Soft cool gray body, restrained slate-gray lower shading and a broad pale-gray highlight on the upper-left, very subtle mineral specks. Japanese anime cel-shaded game item illustration, crisp subtle dark outer contour, simple readable at 50x50 pixels, matching cute anime food game sprites. Three-quarter side view, width about 1.4 times height, tightly framed complete silhouette with small transparent margins. One stone only, no pile, cracks, face, text, floor, background or cast shadow. Genuine transparent PNG.
