import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

// semantic-release writes the same version into both files (scripts/set-version.mjs).
// A consumer resolving ./openapi.yaml from node_modules must see the version
// they installed, so the two may never diverge.
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("contract version", () => {
  it("info.version equals the package version", () => {
    const spec = parse(readFileSync(join(root, "api/openapi.yaml"), "utf8")) as {
      info: { version: string };
    };
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      version: string;
    };
    expect(spec.info.version).toBe(pkg.version);
  });
});
