# Backend from First Principles notes

A React and Vite reading site for the Obsidian notes in:

`/data/Documents/obsidian_notes/Notes/Backend from First Principles`

The source Markdown files are read by `scripts/sync_notes.py` and copied into `src/generated/`. The site displays 31 lesson notes plus the collection overview, with chapter navigation, full text search (Ctrl/⌘ K), Obsidian links between included notes, tables, code blocks, section navigation, and browser-local reading progress.

## Run locally

```sh
cd /data/Projects/personal/myNotes/obsidian-notes
npm install
npm run sync-notes
npm run dev
```

Open the local URL printed by Vite. To update the site after changing notes in Obsidian, run `npm run sync-notes` and then `npm run build` for a new production build. `npm run sync-notes -- '/another/notes/folder'` uses a different source folder.

The site is read only. Reading progress is saved in the current browser. Links to notes outside this collection appear as plain text because those files are not part of this site.
