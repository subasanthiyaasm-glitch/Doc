#!/bin/sh
# Copies the static site into backend/client and deploys it with Catalyst web hosting.
set -e
cd "$(dirname "$0")"
rm -rf client && mkdir client
rsync -a --exclude backend --exclude .git --exclude .playwright-mcp --exclude node_modules --exclude login-sample.html ../ client/
cat > client/client-package.json <<J
{ "name": "doc", "version": "1.0.0", "homepage": "index.html", "login_redirect": "index.html" }
J
catalyst deploy --only client -p 10624000000048001 --org 60034244588
