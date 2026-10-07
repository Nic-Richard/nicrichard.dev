#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Commit or set aside local changes before deploying."
  exit 1
fi

node scripts/check.mjs

if [[ ! -f .env.deploy ]]; then
  echo "Missing .env.deploy. Copy .env.deploy.example and fill in the SSH target."
  exit 1
fi

source .env.deploy

SERVER="${NICRICHARD_SERVER:?NICRICHARD_SERVER is required}"
REMOTE="${NICRICHARD_REMOTE:-/var/www/nicrichard.dev}"
if [[ ! "$SERVER" =~ ^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$ || "$REMOTE" != /var/www/nicrichard.dev ]]; then
  echo "Use user@host and /var/www/nicrichard.dev, matching the nginx configuration."
  exit 1
fi

REVISION="$(git rev-parse HEAD)"
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)-${REVISION:0:7}"
RELEASE="$REMOTE/releases/$RELEASE_ID"

echo "Preparing committed release ${REVISION:0:7} on $SERVER..."
ssh "$SERVER" "test -L '$REMOTE/current' && nginx -t && mkdir '$RELEASE'"
git archive "$REVISION" index.html assets favicon.svg robots.txt sitemap.xml |
  ssh "$SERVER" "tar -xf - -C '$RELEASE'"

ssh "$SERVER" bash -s -- "$REMOTE" "$RELEASE" <<'REMOTE_SCRIPT'
set -euo pipefail
remote="$1"
release="$2"
exec 9>"$remote/deploy.lock"
flock -n 9
release_root="$(realpath "$remote/releases")"
previous="$(readlink -f "$remote/current")"
release="$(realpath "$release")"
test "$release_root" = "$remote/releases"
test "$(dirname "$previous")" = "$release_root"
test "$(dirname "$release")" = "$release_root"
test -d "$previous"
next="$remote/current.next"

for file in index.html assets/css/styles.css assets/js/main.js favicon.svg robots.txt sitemap.xml; do
  test -s "$release/$file"
done
nginx -t
test ! -e "$next" && test ! -L "$next"
ln -s "$release" "$next"
mv -Tf "$next" "$remote/current"

if ! systemctl reload nginx || ! curl --fail --silent --show-error --location \
  --connect-timeout 5 --max-time 15 --resolve nicrichard.dev:443:127.0.0.1 \
  -H 'Host: nicrichard.dev' http://127.0.0.1/ >/dev/null; then
  ln -s "$previous" "$next"
  mv -Tf "$next" "$remote/current"
  systemctl reload nginx
  echo "Deployment failed; restored the previous release." >&2
  exit 1
fi

while IFS= read -r -d '' candidate; do
  if [[ "$candidate" == "$release" || "$candidate" == "$previous" ]]; then
    continue
  fi
  name="$(basename "$candidate")"
  if [[ ! "$name" =~ ^[0-9]{8}([0-9]{6})?(-[0-9a-f]{7,40})?$ ]]; then
    echo "Leaving unrecognised release directory: $candidate" >&2
    continue
  fi
  test ! -L "$candidate"
  test "$(realpath "$candidate")" = "$release_root/$name"
  rm -rf -- "$candidate"
  echo "Removed old release: $name"
done < <(find "$release_root" -mindepth 1 -maxdepth 1 -type d -print0)
REMOTE_SCRIPT

echo "Deployed $RELEASE_ID. Kept one previous release for rollback."
