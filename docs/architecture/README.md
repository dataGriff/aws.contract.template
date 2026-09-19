# Architecture

```
api/openapi.yaml ──task gen──▶ src/generated/{types,zod,client}  ─tsup─▶ dist/  ┐
                 ├──────────▶ collections/*.http + http-client.env.json         ├─▶ @datagriff/todo-api-contract
                 ├──────────▶ docs/api-reference/index.html (GitHub Pages)      │   (GitHub Packages)
                 └──────────▶ shipped as ./openapi.yaml                         ┘
                                     ▲                          ▲
                        aws.api.template pins ^major     consumers pin ^major
                        (gateway spec, zod validation,   (typed client, mock,
                         provider conformance)            .http collection)
```

See [decisions.md](decisions.md).
