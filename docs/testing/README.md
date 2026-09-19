# Testing

Each layer proves one thing about the package a consumer installs.

| Layer       | Tool                 | Proves                                                                                                                                                                      | Runs    |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| **Lint**    | Redocly              | The spec is valid, every operation has an id and a 2xx, naming is `lower_snake_case`                                                                                        | `check` |
| **Compat**  | oasdiff              | No breaking change vs the base branch (unless deliberately accepted)                                                                                                        | `check` |
| **Drift**   | `task gen:check`     | Committed generated output matches the contract                                                                                                                             | `check` |
| **Unit**    | vitest               | The `.http` generator (one request per operation, auth headers, placeholders); the `createClient`/`ApiError` wrapper; `info.version` == package version                     | `check` |
| **Package** | vitest + `pnpm pack` | The packed tarball installs into a scratch project and every export resolves (ESM + CJS per subpath, the spec, the collection); nothing extra ships                         | `ci`    |
| **Mock**    | Prism + httpyac      | The generated collection replays against a mock of the same contract; every status is declared. A contract Prism cannot serve, or an example failing its schema, fails here | `ci`    |

**Not here:** provider conformance (Schemathesis, the client against the real service) lives in the
provider repo (`aws.api.template`, `task test:contract`), which pins a version of this package. That
is where "the API honours the contract" is proven; this repo proves "the package is a faithful,
installable rendering of the contract".

No Docker is needed for any layer. `task check` is the pre-commit hook; `task ci` the pre-push hook
and the GitHub Actions gate, one step per sub-task.
