#!/usr/bin/env bash
# Publishes the platform packages, then the wrapper that pins them. Versions
# already on the registry are skipped, so a failed run can be re-run.
set -euo pipefail

dist_tag_for_version() {
  node -e '
    const core = process.argv[1].split("+", 1)[0];
    const dash = core.indexOf("-");
    if (dash === -1) process.exit(0);
    const match = core.slice(dash + 1).match(/^[A-Za-z]+/);
    const tag = match ? match[0].toLowerCase() : "";
    console.log(!tag || tag === "latest" ? "next" : tag);
  ' "$1"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  for dir in dist/npm/*/ npm/; do
    meta=$(node -p "const p = require(process.argv[1]); p.name + ' ' + p.version" "./${dir}package.json")
    read -r name version <<<"$meta"
    id="${name}@${version}"
    if npm view "$id" version >/dev/null 2>&1; then
      echo "skip $id (already published)"
      continue
    fi
    dist_tag="$(dist_tag_for_version "$version")"
    if [[ -n "$dist_tag" ]]; then
      npm publish "$dir" --tag "$dist_tag"
    else
      npm publish "$dir"
    fi
  done
fi
