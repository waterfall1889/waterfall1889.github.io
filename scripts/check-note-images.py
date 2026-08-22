from pathlib import Path
import re

notes = Path('src/content/notes')
img_dir = notes / 'images'
pub = Path('public/notes-images')

refs = []
for md in sorted(notes.rglob('*.md')):
    t = md.read_text(encoding='utf-8')
    for m in re.finditer(r'!\[[^\]]*\]\(([^)]+)\)', t):
        refs.append((md.name, m.group(1)))
    for m in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', t, re.I):
        refs.append((md.name, m.group(1)))

bad = []
missing = []
for name, ref in refs:
    if ref.startswith('http') or ref.startswith('data:'):
        continue
    if 'file:' in ref.lower() or 'marktext' in ref.lower() or ref.startswith('C:'):
        bad.append((name, ref))
        continue
    if ref.startswith('/notes-images/'):
        fname = Path(ref).name
    elif re.match(r'^(?:\.\./|\./)?images/', ref):
        fname = Path(ref.replace('\\', '/')).name
    else:
        bad.append((name, ref))
        continue
    if not (pub / fname).exists():
        missing.append((name, ref, fname))

print('bad paths:', len(bad))
for item in bad:
    print('  BAD', item)
print('missing in public:', len(missing))
for item in missing:
    print('  MISS', item)
