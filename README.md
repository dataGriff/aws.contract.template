# aws.contract.template

The **API contract as a versioned package**. This repo owns `api/openapi.yaml` and publishes
everything a consumer or provider needs from it as **`@datagriff/todo-api-contract`** on GitHub
Packages: TypeScript types, runtime **zod** schemas, a typed **fetch client**, the raw **spec** and a
ready-to-run **`.http` collection**. The Redocly reference is published to GitHub Pages.

It is one of three templates:

| Repo                                                                  | Owns                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------- |
| **aws.contract.template** (this)                                      | The contract + generated consumer artefacts, as a package |
| [aws.api.template](https://github.com/dataGriff/aws.api.template)     | The provider: Lambda + REST API + its database, per API   |
| [aws.infra.template](https://github.com/dataGriff/aws.infra.template) | The platform: network, identity, KMS, edge, per account   |

The bundled example is a multi-tenant **Todo API**. Re-skin it with the **author-contract** skill.

## Consume the package

```bash
# .npmrc — GitHub Packages, scope @datagriff (token needs read:packages)
@datagriff:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}

npm install @datagriff/todo-api-contract
```

| Import                                       | Gives you                                                   |
| -------------------------------------------- | ----------------------------------------------------------- |
| `@datagriff/todo-api-contract`               | everything below                                            |
| `@datagriff/todo-api-contract/types`         | `Todo`, `TodoCreate`, `Problem`, … (type-only)              |
| `@datagriff/todo-api-contract/zod`           | `todoSchema`, `problemSchema`, `accessTokenClaimsSchema`, … |
| `@datagriff/todo-api-contract/client`        | `createClient`, `ApiError`, `listTodos`, `createTodo`, …    |
| `@datagriff/todo-api-contract/openapi.yaml`  | the spec file (`require.resolve` it for any OpenAPI tool)   |
| `@datagriff/todo-api-contract/collections/*` | `todos.http`, `health.http`, `http-client.env.json`         |

```ts
import { ApiError, createClient, createTodo, getTodo } from "@datagriff/todo-api-contract/client";

const { client } = createClient({ baseURL: "https://api.example.com/v1", token, apiKey });
const todo = await createTodo(
  { title: "x" },
  { "idempotency-key": crypto.randomUUID() },
  { client },
);
try {
  await getTodo(todo.todo_id, { client });
} catch (e) {
  if (e instanceof ApiError && e.status === 404) console.log(e.problem?.detail, e.requestId);
}
```

The package **major** tracks breaking contract changes (`feat!:` commits); `info.version` inside the
shipped spec always equals the package version. See the [consumer guide](docs/consumer-guide/).

## Develop the contract

```bash
mise install          # pinned tools (node, pnpm, task, redocly, prism, httpyac, oasdiff, scanners)
pnpm install          # also installs the git hooks
task gen              # regenerate types / zod / client / .http collection / API reference
task mock             # serve the contract as a mock API on :4010 (Prism)
task ci               # the full gate, identical to GitHub Actions
```

Change `api/openapi.yaml` first, then `task gen`; generated output is committed and drift-gated.
Breaking changes fail `task contract:compat` unless deliberately accepted — see
[authoring](docs/authoring/).

## Documentation

- 🔌 **[Consumer guide](docs/consumer-guide/)** — install, authenticate, call, mock
- ✍️ **[Authoring](docs/authoring/)** — conventions, naming, versioning, breaking changes
- 📐 **[Architecture](docs/architecture/)** — decisions
- 🧪 **[Testing](docs/testing/)** — what each layer proves
- 🛠️ **[Operations](docs/operations/)** — publishing, registry access, first release
- 📖 **[API reference](docs/api-reference/)** — generated (GitHub Pages)

Agent/dev conventions live in [`AGENTS.md`](AGENTS.md).

## License

MIT — see [LICENSE](LICENSE).
