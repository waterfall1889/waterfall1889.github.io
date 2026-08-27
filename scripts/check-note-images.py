from pathlib import Path
import re

notes = Path('src/content/notes')
images_root = notes / 'images'
pub_root = Path('public/notes-images')

IMG_EXT = r'(?:png|jpe?g|gif|webp|svg|bmp)'

MD_IMAGE_REF_RE = re.compile(
    rf'\]\((?:\.\./|\./)?images/(.+?\.{IMG_EXT})\)',
    re.IGNORECASE,
)
HTML_IMAGE_REF_RE = re.compile(
    rf'src=["\'](?:\.\./|\./)?images/(.+?\.{IMG_EXT})["\']',
    re.IGNORECASE,
)

bad = []
missing = []

for md in sorted(notes.rglob('*.md')):
    if '整理前' in md.parts:
        continue
    text = md.read_text(encoding='utf-8')
    rel_md = md.relative_to(notes).as_posix()
    parts = rel_md.split('/')
    slug = parts[-1].replace('.md', '')
    group = '/'.join(parts[:-1])
    prefix = f'{group}/{slug}' if group else slug

    refs = [m.group(1) for m in MD_IMAGE_REF_RE.finditer(text)]
    refs += [m.group(1) for m in HTML_IMAGE_REF_RE.finditer(text)]

    for ref in refs:
        ref = ref.replace('\\', '/')
        if ref.startswith('http'):
            continue

        expected_prefix = f'{prefix}/'
        filename = ref.split('/')[-1]

        if not ref.startswith(expected_prefix):
            bad.append((md.name, ref, f'expected prefix {expected_prefix}'))

        note_path = images_root / prefix / filename
        pub_path = pub_root / prefix / filename
        if not note_path.exists():
            missing.append((md.name, str(note_path)))
        if not pub_path.exists():
            missing.append((md.name, str(pub_path)))

print('bad paths:', len(bad))
for item in bad:
    print('  BAD', item)
print('missing:', len(missing))
for item in missing:
    print('  MISS', item)
