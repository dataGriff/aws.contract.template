# Decision log

Short ADRs — the "why" behind the contract repo's choices. Numbering continues the API template's
log (ADR-1…11 live in `aws.api.template`; the ones that concern the contract are restated here).

**ADR-1: Contract-first with a zod-emitting generator (Kubb).** Types-only generators can't validate
at runtime, so we generate zod schemas next to the types and a fetch client from the same input.
Trade-off: an extra codegen step, gated by `task gen:check`.

**ADR-5: `lower_snake_case` everywhere in the contract.** Enforced by Redocly. Codegen emits
snake_case directly, so there is no field remapping and the contract stays the single source of
truth.

**ADR-9: Generated artifacts are committed and drift-gated.** Committing `src/generated`,
`collections` and `docs/api-reference` makes contract changes visible in PR diffs; CI regenerates
and `git status --porcelain` on those paths blocks staleness.

**ADR-13: The contract is a versioned package, and the provider pins it.** Keeping the contract
inside the API repo made "the contract" whatever the provider's `main` happened to contain, and the
SDK a by-product of the provider's release. Publishing `@datagriff/todo-api-contract` inverts that:
the provider and every consumer depend on the same immutable version, breaking changes are a
package major (oasdiff gate + `feat!:`), and consumers need nothing from the provider's repo.
Trade-offs: a two-step change (release the contract, then bump the provider), and registry auth for
consumers.

**ADR-14: One package with subpath exports, not a contract package plus an SDK package.** One
version to pin, one changelog, one compatibility gate. `./types`, `./zod`, `./client`,
`./openapi.yaml` and `./collections/*` let a consumer take only what they need; tsup bundles the
kubb fetch client so `zod` is the only runtime dependency.

**ADR-15: `info.version` is written by the release, never by hand.** A consumer reading the spec out
of `node_modules` must see the version they installed; semantic-release's prepare step
(`scripts/set-version.mjs`) is the only writer and a unit test keeps the two in step.
