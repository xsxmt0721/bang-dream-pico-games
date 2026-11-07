"""Validate silhouettes, equal visible heights and full pigtail extraction."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / 'assets/characters/manifest.json').read_text(encoding='utf-8'))
processed = [entry for entry in manifest if entry.get('source', '').endswith(('.jpg', '.png', '.jpeg'))]
assert len(processed) == 80, f'Expected both views of 40 sheets, got {len(processed)}'
for entry in processed:
    image = Image.open(ROOT / entry['output'])
    assert image.mode == 'RGBA', entry['output']
    assert image.height == 512, entry['output']
    assert image.getbbox()[3] - image.getbbox()[1] == 512, (entry['output'], image.getbbox())
    assert image.getextrema()[3][0] == 0, entry['output']
    assert all(image.getpixel(point)[3] == 0 for point in [(0,0),(image.width-1,0),(0,image.height-1),(image.width-1,image.height-1)]), entry['output']
    assert entry['source_bounds'][3] - entry['source_bounds'][1] > 600, entry['output']
for name, minimum_right, minimum_width in [('rose-ako', 725, 380), ('ppp-arisa', 670, 300), ('ras-pareo', 770, 410)]:
    entry = next(e for e in processed if e['source'].startswith(name) and e['view'] == 'front')
    assert entry['source_bounds'][2] >= minimum_right, (name, 'missing right pigtail', entry['source_bounds'])
    image = Image.open(ROOT / entry['output'])
    assert image.width >= minimum_width, (name, image.size)
michelle = Image.open(ROOT / 'assets/characters/front/hhw-michelle.png')
assert michelle.getbbox()[3] - michelle.getbbox()[1] == 512
assert len(list((ROOT / 'assets/characters/front').glob('*.png'))) == 58
assert len(list((ROOT / 'assets/characters/side').glob('*.png'))) == 47
print('Asset validation passed: 80 processed views, 512 px visible height, intact pigtails, transparency, 58 front sprites and 47 side sprites.')

for name in ['am-uika', 'am-mutsumi', 'am-umiri', 'am-nyamu', 'am-sakiko', 'am-mortis', 'smm-mana']:
    for view in ['front', 'side']:
        image = Image.open(ROOT / 'assets/characters' / view / f'{name}.png')
        assert image.mode == 'RGBA' and image.height == 512
        alpha = image.getchannel('A')
        bounds = alpha.getbbox()
        assert bounds[3] - bounds[1] == 512, (name, view, bounds)
        assert alpha.getextrema()[0] == 0
assert (ROOT / 'assets/characters/front/hhw-misaki.png').exists()
assert not (ROOT / 'assets/characters/unused/hhw-misaki-front.png').exists()
print('New PICO assets and Misaki migration validated.')

for name in ['hhw-kaoru-sleep','toyama-asuka','ras-pareo-black-white','ras-pareo-green-white','ras-pareo-yellow-red','ras-pareo-blue-white','ras-pareo-purple-white']:
    image=Image.open(ROOT / 'assets/characters/front' / f'{name}.png')
    assert image.mode=='RGBA' and image.height==512
    assert image.getchannel('A').getextrema()[0]==0
    assert image.getbbox()[3]-image.getbbox()[1]==512
original=Image.open(ROOT / 'assets/characters/front/ras-pareo.png')
for color in ['black-white','green-white','yellow-red']:
    image=Image.open(ROOT / 'assets/characters/front' / f'ras-pareo-{color}.png')
    assert image.size==original.size
    assert image.getchannel('A').tobytes()==original.getchannel('A').tobytes()
    # Clothes, legs and eyes are not part of the hair recoloring.
    for box in [(145,225,275,380),(0,380,421,512),(145,125,275,170)]:
        assert image.crop(box).tobytes()==original.crop(box).tobytes(),(color,box)
print('New expression, Asuka and PAREO variants validated; legacy deterministic variants preserve alpha, eyes and clothing.')
