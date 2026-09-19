# Consumer guide

How to build against the API — before or after it is deployed. Everything you need is in the
package; you never need this repo checked out.

## 1. Install

The package is on **GitHub Packages** under the `@datagriff` scope. Add to your project's `.npmrc`:

```ini
@datagriff:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

`NODE_AUTH_TOKEN` is a GitHub token with `read:packages` (a PAT locally; `GITHUB_TOKEN` in Actions
once the package grants your repository access — see [operations](../operations/)). Then:

```bash
npm install @datagriff/todo-api-contract
```

Pin a major (`^1.0.0`): breaking contract changes only ship as a new major.

## 2. Authenticate

The API uses Cognito JWTs (issued by the platform's user pool). Send the access token as a bearer
header; send your API key where usage plans apply:

```http
Authorization: Bearer <cognito_access_token>
x-api-key: <your_api_key>
```

Get a token from the Cognito hosted UI (Authorization Code + PKCE) for user-facing apps, or via
`USER_PASSWORD_AUTH` against the platform's **test** app client (dev/staging only) for scripts/CI.
The token must carry the claims documented by the contract's `access_token_claims` schema:
`sub` and `custom:tenant_id` (mandatory — a valid token without them gets a 401) and optionally
`roles` (a JSON-encoded array of group names; `admin` unlocks cross-user operations). The
platform's pre-token trigger adds them; you never supply them. The API scopes every response to
your tenant + user. `accessTokenClaimsSchema` from `./zod` validates a decoded token.

## 3. Call it with the typed client

```ts
import {
  ApiError,
  createClient,
  createTodo,
  getTodo,
  listTodos,
} from "@datagriff/todo-api-contract/client";

const { client } = createClient({ baseURL: "https://api.example.com/v1", token, apiKey });
const page = await listTodos({ limit: 20 }, { client });
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

One typed function per `operationId`; non-2xx responses throw `ApiError` with the RFC 7807 problem
body and the `x-request-id` for support. Validate anything you like with the zod schemas:

```ts
import { todoSchema } from "@datagriff/todo-api-contract/zod";
const todo = todoSchema.parse(await res.json());
```

The provider runs this exact client against the real service on every PR, so what you install is
what the provider was verified against.

## 4. Explore with the .http collection

The collection ships in the package. Open `node_modules/@datagriff/todo-api-contract/collections/`
in the VS Code REST Client / JetBrains HTTP Client, pick an environment from
`http-client.env.json` and put your `token` / `apiKey` in a sibling `http-client.private.env.json`.
Headless: `npx httpyac send node_modules/@datagriff/todo-api-contract/collections/todos.http --all --env local`.

## 5. Develop against the mock

No deployment needed — Prism serves realistic responses from the shipped spec:

```bash
npx @stoplight/prism-cli mock "$(node -p "require.resolve('@datagriff/todo-api-contract/openapi.yaml')")"
```

Point your client at `http://127.0.0.1:4010` while the real API is still being built; switching
later is a base-URL change.

## 6. Generate your own client

The spec is a file in the package, so any OpenAPI tool works:

```bash
npx openapi-typescript "$(node -p "require.resolve('@datagriff/todo-api-contract/openapi.yaml')")" -o todo-api.d.ts
```

## 7. Contract conventions to rely on

- **Errors** are RFC 7807 `application/problem+json` with a `request_id` for support.
- **Pagination** is cursor-based: pass the `next_cursor` from a page back as `cursor`.
- **Idempotency:** send an `Idempotency-Key` header on creates to make retries safe.
- **Gateway errors** (401/403/413/429 and validator 400s) are also `problem+json` with CORS headers.
- **Field naming** is `lower_snake_case` throughout.
- **Versioning:** the URL base path is `/v1`; the package major changes when the contract breaks.
