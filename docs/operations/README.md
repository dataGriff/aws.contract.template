# Operations

## Publishing

Every push to `main` runs `release.yml`: semantic-release computes the next version from the
conventional commits since the last tag, runs `task release:prepare` (stamps the version into
`api/openapi.yaml` (`info.version`) and `package.json`, regenerates the committed artifacts, builds
`dist/` and proves the packed tarball installs), **publishes to GitHub Packages**
(`https://npm.pkg.github.com`, scope `@datagriff`), commits `CHANGELOG.md` + the regenerated files,
tags `vX.Y.Z` and creates the GitHub release. The `docs` job then publishes `docs/api-reference` to
GitHub Pages. No secrets are needed beyond `GITHUB_TOKEN` (`packages: write`).

`dist/` is gitignored and the release runs on a fresh checkout, so **the build must happen inside
the prepare step** — nothing else puts the package's entry points in the tarball. `task
release:prepare` ends with `task test:package`, which packs the tarball and installs it into a
scratch project, so a tarball missing an export fails the release instead of reaching consumers
(1.0.1 shipped without `dist/` because prepare only stamped and generated).

If `main` is branch-protected, allow the workflow token to push the release commit or remove
`@semantic-release/git` from `.releaserc.json`.

## First release

The first push to `main` with a `feat:` commit publishes `1.0.0`. Until then no version exists on
the registry — the provider repo's `pnpm install` cannot resolve `@datagriff/todo-api-contract`.
Cut the first contract release **before** wiring the provider (see the provider's operations doc,
"First-time wiring").

## Granting access to consumers

A package published from this repository is readable by this repository's `GITHUB_TOKEN` only. For
another repository's Actions to install it: **package settings → Manage Actions access → add the
repository** (read). Alternatively the consumer sets a `PACKAGES_READ_TOKEN` secret (a PAT with
`read:packages`) — the provider template's workflows fall back to it.

Developers install with a PAT (`read:packages`) as `NODE_AUTH_TOKEN` in their `~/.npmrc` or
environment; the repo's `.npmrc` references `${NODE_AUTH_TOKEN}` and tolerates it being empty.

## Renaming the package

Change `name` in `package.json`, the scope line in `.npmrc`, the import paths in `docs/`, and
`packageRules` for the scope in each consumer's `renovate.json`. Consumers pin by name, so a rename
is a new package: publish the old name one last time with a deprecation note.

## Yanking a version

`npm deprecate @datagriff/todo-api-contract@X.Y.Z "reason"` (GitHub Packages honours deprecation)
and release a fix. Never delete a version consumers may have locked.
