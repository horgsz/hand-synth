#!/bin/sh
# Build and publish dist/ to the gh-pages branch.
set -e
npm run build
cd dist && touch .nojekyll && git init -q -b gh-pages && git add -A && git commit -qm deploy
git push -qf "$(git -C .. remote get-url origin)" gh-pages
rm -rf .git
