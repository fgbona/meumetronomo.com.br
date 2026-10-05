#!/usr/bin/env bash
# Publica o site: atualiza a main, gera em public/ e ajusta dono dos arquivos.
# O document root do vhost nginx (CWP) aponta para <esta pasta>/public.
# Ao final avisa o IndexNow (Bing, Yandex…) das páginas que mudaram. O Google usa o sitemap.
# Chave em .indexnow-key (a mesma publicada em static/<chave>.txt). Pular: INDEXNOW=0 ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
git pull -q --ff-only origin main
# /usr/local/bin/hugo = padrão (estático, sem SASS) v0.167 — o "extended" não roda neste host (glibc antiga).
HUGO="${HUGO:-/usr/local/bin/hugo}"

snapshot() { [ -d public ] && find public -name index.html -type f -print0 | sort -z | xargs -0 md5sum 2>/dev/null || true; }
ANTES=$(snapshot)

"$HUGO" --minify --gc --cleanDestinationDir
chown -R appsec:appsec public
chmod 755 . public   # nginx roda como nobody e precisa atravessar a pasta
echo "publicado em $(pwd)/public ($(find public -type f | wc -l) arquivos)"

# --- IndexNow ---------------------------------------------------------------
[ "${INDEXNOW:-1}" = "1" ] && [ -s .indexnow-key ] || exit 0
BASE=$(grep -m1 '^baseURL' hugo.toml | sed -E 's/.*"([^"]+)".*/\1/; s:/$::')
HOST=${BASE#https://}
KEY=$(tr -d '[:space:]' < .indexnow-key)
MUDOU=$({ diff <(echo "$ANTES") <(snapshot) || true; } | sed -nE 's/^> [0-9a-f]+ +public(.*)index\.html$/\1/p')
URLS=$(grep -o '<loc>[^<]*' public/sitemap.xml | sed 's/<loc>//' | while read -r u; do
  p=${u#"$BASE"}; grep -qxF "$p" <<< "$MUDOU" && echo "$u"; done; true)
[ -n "$URLS" ] || { echo "indexnow: nenhuma página do sitemap mudou"; exit 0; }
LISTA=$(printf '%s\n' "$URLS" | sed 's/.*/"&"/' | paste -sd, -)
CODIGO=$(curl -s -o /dev/null -w '%{http_code}' -m 20 -X POST https://api.indexnow.org/indexnow \
  -H 'Content-Type: application/json; charset=utf-8' \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"$BASE/$KEY.txt\",\"urlList\":[$LISTA]}" || echo 000)
echo "indexnow: $(printf '%s\n' "$URLS" | wc -l) URL(s) enviadas, HTTP $CODIGO (200/202 = aceito)"
