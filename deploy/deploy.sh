#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_ENV="$ROOT_DIR/.env.deploy"

if [[ ! -f "$DEPLOY_ENV" ]]; then
  echo "Missing .env.deploy. Copy .env.deploy.example and fill in the SSH target."
  exit 1
fi

set -a
source "$DEPLOY_ENV"
set +a

SERVER="${NICRICHARD_SERVER:?NICRICHARD_SERVER is required}"
REMOTE="${NICRICHARD_REMOTE:-/var/www/nicrichard.dev}"
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
RELEASE="$REMOTE/releases/$RELEASE_ID"

for file in index.html robots.txt sitemap.xml favicon.svg; do
  if [[ ! -f "$ROOT_DIR/$file" ]]; then
    echo "Missing required file: $ROOT_DIR/$file"
    exit 1
  fi
done

if [[ ! -d "$ROOT_DIR/assets" ]]; then
  echo "Missing required directory: $ROOT_DIR/assets"
  exit 1
fi

if command -v node >/dev/null 2>&1; then
  node --check "$ROOT_DIR/assets/js/main.js"
fi

echo "Preparing portfolio release for $SERVER:$REMOTE..."
ssh "$SERVER" "mkdir -p '$RELEASE' '$REMOTE/releases'"

tar -C "$ROOT_DIR" -czf - \
  index.html assets favicon.svg robots.txt sitemap.xml \
  | ssh "$SERVER" "tar -xzf - -C '$RELEASE'"

scp "$ROOT_DIR/deploy/nginx.http.conf" "$SERVER:/tmp/nicrichard.http.conf"
scp "$ROOT_DIR/deploy/nginx.conf" "$SERVER:/tmp/nicrichard.ssl.conf"

ssh "$SERVER" "\
  set -euo pipefail; \
  ln -sfn '$RELEASE' '$REMOTE/current'; \
  if [[ -f /etc/letsencrypt/live/nicrichard.dev/fullchain.pem && -f /etc/letsencrypt/live/nicrichard.dev/privkey.pem ]]; then \
    install -m 0644 /tmp/nicrichard.ssl.conf /etc/nginx/sites-available/nicrichard.dev; \
  else \
    install -m 0644 /tmp/nicrichard.http.conf /etc/nginx/sites-available/nicrichard.dev; \
  fi; \
  rm -f /tmp/nicrichard.http.conf /tmp/nicrichard.ssl.conf; \
  ln -sfn /etc/nginx/sites-available/nicrichard.dev /etc/nginx/sites-enabled/nicrichard.dev; \
  nginx -t; \
  systemctl reload nginx; \
  find '$REMOTE/releases' -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2- | xargs -r rm -rf; \
  curl -fsS -H 'Host: nicrichard.dev' http://127.0.0.1/ >/dev/null"

echo "Portfolio deployed successfully."

if ! ssh "$SERVER" "test -f /etc/letsencrypt/live/nicrichard.dev/fullchain.pem"; then
  echo
  echo "HTTPS is not configured yet. After DNS points to this server, run:"
  echo "ssh $SERVER \"certbot --nginx -d nicrichard.dev -d www.nicrichard.dev\""
  echo "Then run this deploy script again."
fi
