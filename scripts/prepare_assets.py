"""Split user character sheets and remove edge-connected black backgrounds.

Usage: python scripts/prepare_assets.py [--source pico-png-source]
       [--archive-originals]
Requires Pillow and numpy. Does not send images to any service.
"""
import argparse
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]


def split_views(image):
    rgb = np.array(image.convert("RGB"))
    # Flood only dark regions connected to an image edge: eyes, black hair,
    # outlines and enclosed dark costume details remain opaque.
    dark = np.max(rgb, axis=2) <= 23
    mask = Image.fromarray(np.where(dark, 0, 255).astype("uint8")).copy()
    for x in range(mask.width):
        for y in (0, mask.height - 1):
            if mask.getpixel((x, y)) == 0:
                ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(mask.height):
        for x in (0, mask.width - 1):
            if mask.getpixel((x, y)) == 0:
                ImageDraw.floodfill(mask, (x, y), 128)
    foreground = np.array(mask) != 128
    # Grow only the component-selection mask to bridge dark ties/outlines and
    # disconnected shoes. The output alpha is NEVER dilated. Separating whole
    # components allows front-view pigtails to cross the image's center line.
    selection = Image.fromarray((foreground * 255).astype('uint8')).filter(ImageFilter.MaxFilter(11))
    views, masks = {}, []
    row = int(image.height * .3)
    for view, center in [('front', .31), ('side', .76)]:
        component = selection.copy()
        candidates = np.flatnonzero(np.array(selection)[row])
        if not len(candidates):
            raise ValueError('Cannot find the character silhouette')
        seed = int(candidates[np.argmin(abs(candidates - image.width * center))])
        ImageDraw.floodfill(component, (seed, row), 128)
        selected = (np.array(component) == 128) & foreground
        masks.append(selected)
        alpha = Image.fromarray((selected * 255).astype('uint8'))
        bounds = alpha.getbbox()
        if not bounds or bounds[3] - bounds[1] < image.height * .65:
            raise ValueError(f'Incomplete {view} silhouette: {bounds}')
        result = image.convert('RGBA')
        result.putalpha(alpha.filter(ImageFilter.GaussianBlur(.35)))
        views[view] = (result.crop(result.getbbox()), bounds)
    if np.any(masks[0] & masks[1]):
        raise ValueError('Front and side silhouettes merged; inspect this source')
    return views


def equal_height(image, height=512):
    """Normalize visible head-to-foot height, never constrain the width."""
    image = image.crop(image.getbbox())
    width = max(1, round(image.width * height / image.height))
    image = image.resize((width, height), Image.Resampling.LANCZOS)
    bounds = image.getbbox()
    if bounds[3] - bounds[1] != height:
        image = image.crop(bounds)
        image = image.resize((max(1, round(image.width * height / image.height)), height), Image.Resampling.LANCZOS)
    return image


def fitted(image, size=(256, 512)):
    image = image.copy()
    image.thumbnail((size[0] - 12, size[1] - 16), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size)
    canvas.alpha_composite(image, ((size[0] - image.width) // 2, (size[1] - image.height) // 2))
    return canvas


def michelle():
    """Reference-inspired clean bear head, drawn at 2x and downsampled."""
    image = Image.new("RGBA", (1024, 1024))
    d = ImageDraw.Draw(image)
    ink, pink, light, white = '#342631', '#ed8ebd', '#fbc9e1', '#fff8fc'
    for box in [(90, 90, 380, 375), (645, 90, 935, 375)]:
        d.ellipse(box, fill=pink, outline=ink, width=12)
    for box in [(153, 154, 315, 316), (708, 154, 870, 316)]:
        d.ellipse(box, fill=light, outline=ink, width=9)
    d.ellipse((105, 185, 920, 932), fill=pink, outline=ink, width=12)
    d.ellipse((153, 515, 872, 912), fill=white)
    for x in (340, 690):
        d.ellipse((x-77, 407, x+77, 575), fill='#24212b', outline=ink, width=7)
        d.polygon([(x, 430), (x+16, 473), (x+45, 490), (x+16, 508), (x, 550), (x-15, 508), (x-45, 490), (x-15, 473)], fill='#fbe78b')
    d.ellipse((464, 660, 568, 797), fill='#f49cbe', outline=ink, width=9)
    d.ellipse((386, 595, 517, 729), fill=white, outline=ink, width=9)
    d.ellipse((510, 595, 641, 729), fill=white, outline=ink, width=9)
    d.ellipse((471, 572, 558, 630), fill=ink)
    return image.resize((512, 512), Image.Resampling.LANCZOS)


def contact_sheet(paths, destination):
    columns, cell_w, cell_h = 8, 190, 225
    canvas = Image.new('RGB', (columns * cell_w, ((len(paths) + columns - 1) // columns) * cell_h), '#526775')
    d = ImageDraw.Draw(canvas)
    for index, path in enumerate(paths):
        x, y = index % columns * cell_w, index // columns * cell_h
        image = Image.open(path).convert('RGBA')
        image = image.resize((round(image.width * (cell_h - 30) / image.height), cell_h - 30), Image.Resampling.LANCZOS)
        canvas.paste(image, (x + (cell_w-image.width)//2, y+4), image)
        d.text((x+5, y+cell_h-22), path.stem, fill='white')
    canvas.save(destination)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'pico-png-source')
    parser.add_argument('--archive-originals', action='store_true')
    args = parser.parse_args()
    source = args.source.resolve()
    if not source.is_relative_to(ROOT):
        raise ValueError('Source must be a project subdirectory')
    output = ROOT / 'assets' / 'characters'
    for subfolder in ('front', 'side'):
        (output / subfolder).mkdir(parents=True, exist_ok=True)
    manifest_path = output / 'manifest.json'
    previous = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else []
    sources = sorted(p for p in source.iterdir() if p.suffix.lower() in ('.jpg', '.jpeg', '.png') and '-' in p.stem and p.stem.isascii())
    manifest, front_paths, side_paths = [], [], []
    for path in sources:
        image = Image.open(path).convert('RGB')
        for view, (cutout, bounds) in split_views(image).items():
            sprite = equal_height(cutout)
            target = output / view / f'{path.stem}.png'
            sprite.save(target)
            with Image.open(target) as verified:
                assert verified.mode == 'RGBA' and verified.getextrema()[3][0] == 0
            (front_paths if view == 'front' else side_paths).append(target)
            manifest.append({'source': path.name, 'view': view, 'output': target.relative_to(ROOT).as_posix(), 'size': list(sprite.size), 'source_bounds': list(bounds), 'visible_height': sprite.getbbox()[3] - sprite.getbbox()[1]})
        print('Prepared', path.stem)
    michelle_path = output / 'front' / 'hhw-michelle.png'
    equal_height(michelle()).save(michelle_path)
    front_paths.append(michelle_path)
    manifest.append({'source': 'script drawing based on reference', 'view': 'front', 'output': michelle_path.relative_to(ROOT).as_posix(), 'visible_height': 512, 'collision': [2, 2]})
    known_outputs = {entry['output'] for entry in manifest}
    for entry in previous:
        if entry['output'] not in known_outputs and (ROOT / entry['output']).exists():
            manifest.append(entry)
    front_paths = sorted((output / 'front').glob('*.png'))
    side_paths = sorted((output / 'side').glob('*.png'))
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding='utf-8')
    previews = ROOT / 'docs'
    previews.mkdir(exist_ok=True)
    if front_paths:
        contact_sheet(front_paths, previews / 'characters-front.png')
        contact_sheet(side_paths, previews / 'characters-side.png')
    if args.archive_originals and sources:
        archive = ROOT / 'assets' / 'source-backup.zip'
        if archive.exists():
            raise FileExistsError('Refusing to overwrite original backup')
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as backup:
            for path in sources:
                backup.write(path, path.name)
        with zipfile.ZipFile(archive) as backup:
            assert backup.testzip() is None
            for path in sources:
                assert backup.read(path.name) == path.read_bytes()
        # Explicitly scoped to the successfully converted source files.
        for path in sources:
            assert path.resolve().parent == source
            path.unlink()
        print('Originals archived to assets/source-backup.zip; reference image retained.')
    print(f'Prepared {len(sources)} source sheets. Assets: {output}')


if __name__ == '__main__':
    main()
