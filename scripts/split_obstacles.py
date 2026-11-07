"""Package a generated three-cell food atlas as individual transparent PNGs."""
import argparse
from pathlib import Path
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('atlas', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = root / 'assets/obstacles'
output.mkdir(parents=True, exist_ok=True)
atlas = Image.open(args.atlas).convert('RGBA')
for index, name in enumerate(['coffee', 'cornet', 'croquette']):
    sprite = atlas.crop((round(index * atlas.width / 3), 0, round((index + 1) * atlas.width / 3), atlas.height))
    bounds = sprite.getchannel('A').point(lambda value: 255 if value > 32 else 0).getbbox()
    sprite = sprite.crop(bounds)
    sprite.thumbnail((256, 256), Image.Resampling.LANCZOS)
    sprite.save(output / f'{name}.png')
    print(name, sprite.size)
