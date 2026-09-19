# AGENTS.md

Guidance for AI agents and developers. Kept intentionally light — details live in `docs/`.

## What this is

The **contract repo** of a three-repo AWS API template. It owns the OpenAPI contract
(`api/openapi.yaml`) and publishes it as the npm package **`@datagriff/todo-api-contract`** (types,
zod schemas, typed fetch client, the spec, the `.http` collection) to GitHub Packages. The provider
(`aws.api.template`) and every consumer pin a version of this package. Infrastructure lives in
`aws.infra.template`.

## Golden rules

- **The contract is the source of truth.** Change `api/openapi.yaml` first, then run `task gen`.
- **Never edit generated code by hand.** `src/generated/`, `collections/`, `docs/api-reference/`
  are produced by `task gen` and gated in CI (`task gen:check`). Hand-written code is only
  `src/{index,types,zod,client}.ts` and `scripts/`.
- **Everything runs through the Taskfile.** Git hooks and CI call the same targets so local == CI.
- **Contract naming is `lower_snake_case`** (enforced by Redocly). Header params stay kebab-case.
- **Versions move only through semantic-release.** Never edit `version` in `package.json` or
  `info.version` by hand; a breaking contract change needs a `feat!:` commit and
  `CONTRACT_ALLOW_BREAKING=true` for the compat gate (see `docs/authoring/`).
- **Keep the package portable.** No AWS extensions in the spec (the provider renders its own
  gateway copy); no runtime dependency beyond `zod`.

## Common commands

| Command                | Purpose                                          |
| ---------------------- | ------------------------------------------------ |
| `mise install`         | Install all pinned tools                         |
| `task gen`             | Regenerate everything from the contract          |
| `task mock`            | Serve the contract as a Prism mock               |
| `task check`           | Fast gate (pre-commit)                           |
| `task ci`              | Full gate — identical locally and in CI          |
| `task test:mock`       | Replay the generated collection against the mock |
| `task contract:compat` | Breaking-change check vs the base branch         |

## Where to look

- **Consume the package:** `docs/consumer-guide/`
- **Author / change the contract:** `docs/authoring/`
- **Decisions:** `docs/architecture/`
- **Testing:** `docs/testing/`
- **Publish / registry access:** `docs/operations/`

## Adopt this template for a new API

Run the `author-contract` skill (see `.claude/skills/author-contract/`) to replace the Todo contract
with your own and regenerate the package.
