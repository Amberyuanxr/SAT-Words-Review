# Barron's 3500 Vocabulary Trainer

A GitHub Pages-ready vocabulary practice website built from the uploaded Barron's vocabulary PDF.

## Included data

- 50 Word Lists / Units
- 3507 source headword entries
- Each entry contains:
  - unit
  - word
  - Chinese meaning from the book
  - English definition from the book

The unit ranges are taken directly from the source PDF.

## Features

1. Select a start and end unit.
2. Randomly select up to 100 words from that range.
3. Each word is presented on its own question screen.
4. Four answer choices are generated from real entries in the book.
5. The correct answer is highlighted after selection.
6. Wrong answers are recorded.
7. A final report lists every missed word, its correct meaning, English definition, and the user's selected answer.

## Run locally

Because the app uses `fetch()` to load JSON, do not open `index.html` directly with `file://`.

Use a local server, for example:

```bash
python3 -m http.server 8000
```

Then open:

http://localhost:8000

## Deploy to GitHub Pages

1. Create a new GitHub repository.
2. Upload everything in this folder.
3. Go to **Settings → Pages**.
4. Select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

GitHub Pages will serve `index.html`.

## Important source note

The Chinese meanings and English definitions in `data/vocab.json` are extracted from the uploaded PDF. Some source PDF characters contain OCR/extraction artifacts; the script normalizes duplicated Unicode glyph artifacts but does not silently replace source meanings with outside dictionary definitions.
