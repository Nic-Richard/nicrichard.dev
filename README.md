# nicrichard.dev

Source for my personal portfolio at [nicrichard.dev](https://nicrichard.dev).

The site is built with HTML, CSS, and JavaScript. It showcases Miscellary, WikiRacr, TraceTray, Portlore, and Seed Placement Randomizer.

## Local preview

Run a static server from the repository root:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Checks

```bash
node scripts/check.mjs
bash -n deploy/deploy.sh
```

Requires Node.js and Git, with no npm dependencies. Checks JavaScript (including inline
scripts), structured data, and static HTML/CSS references to local files. Generated image
paths in the export template still need a headless export check. GitHub Actions runs the
same checks on pushes and pull requests. Use two-space indentation and LF line endings.

## Deployment

Copy `.env.deploy.example` to `.env.deploy` and set the SSH target, then run:

```bash
bash deploy/deploy.sh
```

Requires a clean working tree, Node.js, Git, Bash and SSH. Only committed site files are
uploaded; local environment files are never included. The server must already have nginx,
the site's configuration and `/var/www/nicrichard.dev/current` pointing to a release.
`deploy/nginx.conf` and `deploy/nginx.http.conf` are setup templates, not overwritten on deploy.

The script prevents overlapping release switches with `flock`, checks nginx before switching
releases atomically, then reloads it and checks the site. A reload or health-check failure
restores the previous release. After a successful health check, older release directories
are removed, keeping only the active release and its immediate predecessor for rollback.

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
