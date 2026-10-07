# nicrichard.dev

Source for my personal portfolio at [nicrichard.dev](https://nicrichard.dev).

The site is built with HTML, CSS, and JavaScript. It showcases Miscellary, WikiRacr, TraceTray, Portlore, and Seed Placement Randomizer.

## Local preview

Run a static server from the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Landscape mobile exports

Generate the Miscellary screenshot sets for pages that only accept landscape images:

```bash
node scripts/export-mobile-sets.mjs
```

Requires Node.js and Chrome, with no npm dependencies. Set `CHROME_PATH` if Chrome is installed
outside the usual location. The browser runs headlessly with a disposable profile.

The 1914×945 PNGs go into `assets/images/miscellary/landscape/october-2026/`:

- `miscellary-phones-1.png`: Browse, Consoles set and collection.
- `miscellary-phones-2.png`: Consoles pack, Game Boy reveal and card editor.
- `miscellary-phones-3.png`: card inspector and landscape binder.

The grouping and layout live in `scripts/mobile-sets.html`. Exports use the existing screenshots
without retaking or altering them. The earlier exports remain in their original locations.
