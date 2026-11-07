# 美术资源与开发说明

- `assets/characters/front/`：正式角色与技能变体贴图。
- `assets/characters/side/`：正式侧视图，保留供后续开发使用。
- `assets/characters/review-ave-mujica/originals/`、`assets/characters/unused/`：保留的历史侧视图。
- `assets/characters/manifest.json`：素材校验所需处理记录，source 字段为历史来源名称。
- `assets/obstacles/`、`assets/effects/`：正式障碍物与技能特效。
- `assets/band-logos/`：队标及来源记录。
- `assets/audio/`：音频，见 [音频说明](AUDIO.md)。

绘图参考、旧版正面备份及生成过程说明已清理。`assets/source-backup.zip` 暂保留为原始素材备份。

## 修改素材

角色与障碍物配置见 `src/roster.js`，碰撞和技能见 `src/engine.js`，绘制及动画见 `src/game.js`。替换贴图时保持文件名、透明背景及宽高比例；视觉大小不改变碰撞格数。正式人物贴图通常为 512 像素可见高度。

素材工具需要 Python 及 `scripts/requirements.txt` 中的依赖：

```sh
pip install -r scripts/requirements.txt
python scripts/validate_assets.py
python scripts/prepare_assets.py --source <外部原图目录>
```

导入脚本会写入正式资源，请先确认输入。`split_obstacles.py` 用于分割外部图集；`recolor-pareo.js` 是需要 sharp 依赖的旧版换色工具，会覆盖对应配色贴图。

## 验证

`npm test` 执行默认测试。浏览器检查脚本位于 `tests/*-smoke.js`，运行前需满足脚本中的浏览器依赖和本地服务要求。生成截图与报告不提交；README 展示图为 `docs/gameplay.png`。
