---
name: author-contract
description: Replace the example Todo contract with your own OpenAPI contract, regenerate the published package (types, zod, client, collection, reference) and prove `task ci` green — the first step of adopting the three-repo AWS API template.
---

# Author a new contract

The contract is the source of truth for the provider (`aws.api.template`) and every consumer, so
this is where adopting the template starts. Flow: replace the contract → regenerate → prove it green
→ release → then bump the provider.

Work in a branch. Small commits per step. Never edit generated code by hand.

## 1. Establish the new contract

- If the user gave you an OpenAPI file, replace `api/openapi.yaml` with it.
- If not, co-author it: keep the existing structure (RFC 7807 `problem` schema, cursor pagination,
  `idempotency_key` on creates, `/v1` servers, `cognito_jwt` + `api_key` security schemes) and swap
  the domain schemas/paths.
- **Enforce the naming standard:** schema properties, query/path params, enum values and
  operationIds must be `lower_snake_case` (Redocly fails otherwise). Run `task spec:lint` until
  clean.
- Declare `links` from every create's 201 to its by-id operations (`$response.body#/<id>`), and
  every status the provider can return. Keep the spec free of `x-amazon-*` extensions.
- Set `info.title`, `description`, `contact` for the new API. Leave `info.version` alone (the
  release writes it).

## 2. Regenerate everything

```bash
task gen
```

Rewrites `src/generated/` (types, zod, client), `collections/*.http` + `http-client.env.json` and
`docs/api-reference/`. Commit the regenerated artifacts. The hand-written `src/client.ts` wrapper is
domain-agnostic; `test/unit/client.test.ts` uses two Todo operations — point it at two of yours.

## 3. Rename the package

- `package.json` `name` (keep the `@datagriff` scope or change it together with `.npmrc`).
- `README.md`, `docs/consumer-guide/` import paths, `AGENTS.md`.

## 4. Prove it

```bash
CONTRACT_ALLOW_BREAKING=true task contract:compat   # replacing the contract IS breaking
task ci                                             # lint, compat, drift, unit, build, package, mock
```

`task test:mock` fails if an example in the contract does not satisfy its own schema or if a
request the generator emits is one Prism rejects — fix the contract, not the test.

## 5. Release, then hand over

Merge to `main` with a `feat!:` commit (a replaced contract is a new major). `release.yml` publishes
the package. Then, in the provider repo, run its `adopt-api` skill and bump
`@datagriff/<your-package>` to the released version.

## Checklist

- [ ] `api/openapi.yaml` replaced, `task spec:lint` clean (snake_case enforced)
- [ ] `task gen` run; generated artifacts committed
- [ ] package renamed; docs and README updated
- [ ] `test/unit/client.test.ts` targets your operations
- [ ] `CONTRACT_ALLOW_BREAKING=true task contract:compat` reviewed
- [ ] `task ci` green
- [ ] released with a `feat!:` commit; provider bumped
