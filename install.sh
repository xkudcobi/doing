#!/bin/sh
# doing installer — curl -fsSL https://raw.githubusercontent.com/xkudcobi/doing/main/install.sh | sh
set -e

if ! command -v node >/dev/null 2>&1; then
  echo "doing needs Node.js 18+ — install it from https://nodejs.org and run this again." >&2
  exit 1
fi

major=$(node -p 'process.versions.node.split(".")[0]')
if [ "$major" -lt 18 ]; then
  echo "doing needs Node.js 18+ (found $(node -v)). Update Node and run this again." >&2
  exit 1
fi

echo "installing doing…"
npm install -g github:xkudcobi/doing
echo
echo "done — run: doing"
