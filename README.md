# Nikhil-RPM

Daily RPM lessons for Nikhil.

## Folder layout
- **Daily lessons:** `YYYY-MM-DD/lesson.html`
- **Monthly index:** `YYYY-MM/index.html` (links to all days in that month)
- **Yearly index:** `YYYY/index.html` (links to all months in that year)

## Generate a lesson locally

By default, lessons generate as **~15 minutes** with **10 prompts**.

```bash
node tools/generate_lesson.js --topic "Volcanoes" --date 2026-02-07 --prompts 10
# or (topic auto-rotates)
node tools/generate_lesson.js

node tools/build_indexes.js
```

Open `index.html` in a browser.

## GitHub Actions
A scheduled workflow generates a new lesson daily and updates monthly/yearly indexes.
