#!/usr/bin/env python3
"""Copy the Obsidian study collection into versioned React content."""
import hashlib
import json
import re
import sys
from pathlib import Path

DEFAULT_SOURCE = Path('/data/Documents/obsidian_notes/Notes/Backend from First Principles')
SOURCE = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_SOURCE
GENERATED = Path(__file__).resolve().parents[1] / 'src' / 'generated'


def metadata(markdown):
    match = re.match(r'\A---\s*\n(.*?)\n---\s*\n?', markdown, re.S)
    if not match:
        return {}, markdown
    frontmatter = match.group(1)
    result = {}
    for key in ('created', 'status'):
        value = re.search(rf'^{key}:\s*(.+)$', frontmatter, re.M)
        if value:
            result[key] = value.group(1).strip().strip('"\'')
    tag_section = re.search(r'^tags:\s*\n((?:\s+-[^\n]*\n?)*)', frontmatter, re.M)
    result['tags'] = re.findall(r'^\s+-\s+(.+)$', tag_section.group(1), re.M) if tag_section else []
    return result, markdown[match.end():].strip()


def summary(body):
    for paragraph in re.split(r'\n\s*\n', body):
        text = paragraph.strip()
        if not text or text.startswith(('#', '-', '|', '>', '```')) or text.startswith('Part of [['):
            continue
        text = re.sub(r'\[\[([^\]|]+)\|([^\]]+)\]\]', r'\2', text)
        text = re.sub(r'[*_`]', '', text)
        return text[:210]
    return ''


def sort_key(note):
    if note['isOverview']:
        return (-1, 0)
    match = re.match(r'(\d+)(?:\.(\d+))?', note['title'])
    return (int(match.group(1)), int(match.group(2) or 0)) if match else (999, 0)


def main():
    if not SOURCE.is_dir():
        raise SystemExit(f'Notes folder not found: {SOURCE}')
    notes = []
    for file in SOURCE.rglob('*.md'):
        path = file.relative_to(SOURCE).as_posix()
        meta, body = metadata(file.read_text(encoding='utf-8'))
        title = file.stem
        note_id = hashlib.sha1(path.encode()).hexdigest()[:12]
        notes.append({
            'id': note_id,
            'path': path,
            'title': title,
            'isOverview': file.parent == SOURCE,
            'created': meta.get('created', ''),
            'status': meta.get('status', ''),
            'tags': meta.get('tags', []),
            'summary': summary(body),
            'wordCount': len(body.split()),
            'content': body,
        })
    notes.sort(key=sort_key)
    note_dir = GENERATED / 'notes'
    note_dir.mkdir(parents=True, exist_ok=True)
    for stale in note_dir.glob('*.json'):
        stale.unlink()
    index = []
    for note in notes:
        content = note.pop('content')
        (note_dir / f"{note['id']}.json").write_text(json.dumps({'content': content}, ensure_ascii=False) + '\n', encoding='utf-8')
        index.append(note)
    (GENERATED / 'index.json').write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    old_bundle = GENERATED / 'notes.json'
    if old_bundle.exists():
        old_bundle.unlink()
    print(f'Synced {len(notes)} notes to {GENERATED}')


if __name__ == '__main__':
    main()
