import { defineConfig } from "tsup";

// Four entry points = the package's subpath exports. Generated code and the
// kubb fetch client are bundled in (devDependencies); zod stays external.
export default defineConfig({
  entry: {
    index: "src/index.ts",
    zod: "src/zod.ts",
    types: "src/types.ts",
    client: "src/client.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
});
