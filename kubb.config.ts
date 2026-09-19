import { defineConfig } from "@kubb/core";
import { pluginOas } from "@kubb/plugin-oas";
import { pluginTs } from "@kubb/plugin-ts";
import { pluginZod } from "@kubb/plugin-zod";
import { pluginClient } from "@kubb/plugin-client";

// One generator run produces everything the package ships from api/openapi.yaml:
// TypeScript types, runtime zod schemas (the provider validates with them,
// consumers can too) and a typed fetch client. `task gen` runs it; the output is
// committed and drift-gated by `task gen:check`.
export default defineConfig({
  root: ".",
  input: { path: "./api/openapi.yaml" },
  output: {
    path: "./src/generated",
    clean: true,
    barrelType: "named",
  },
  plugins: [
    pluginOas({ validate: true }),
    pluginTs({ output: { path: "types" }, enumType: "literal", dateType: "string" }),
    pluginZod({ output: { path: "zod" }, typed: true, dateType: "string", inferred: true }),
    pluginClient({ output: { path: "client" }, client: "fetch", dataReturnType: "data" }),
  ],
});
