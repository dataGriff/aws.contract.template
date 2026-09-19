#!/usr/bin/env node
// Keeps the contract's `info.version` equal to the package version. Run by
// semantic-release (prepareCmd) with the version it is about to publish, so the
// spec a consumer resolves from node_modules always states the version they
// installed. Edits the one `version:` line under `info:` in place so the rest
// of the YAML keeps its formatting and comments.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const version = process.argv[2];
if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version ?? "")) {
  console.error("usage: set-version.mjs <x.y.z>");
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const specPath = join(root, "api/openapi.yaml");
const spec = readFileSync(specPath, "utf8");
// The first `version:` line after `info:` and before the next top-level key.
const updated = spec.replace(
  /(^info:\n(?:[ \t].*\n)*?[ \t]+version:[ \t]*)([^\n]+)/m,
  (_, prefix) => `${prefix}${version}`,
);
if (updated === spec && !spec.includes(`version: ${version}`)) {
  console.error("info.version not found in api/openapi.yaml");
  process.exit(1);
}
writeFileSync(specPath, updated);

const pkgPath = join(root, "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
pkg.version = version;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

console.log(`info.version and package.json version set to ${version}`);
