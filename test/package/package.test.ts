import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// What a consumer installs is the packed tarball, not this checkout. Pack it,
// install it into a scratch project exactly like `npm install` would, and prove
// every documented entry point works from there: ESM + CJS for each subpath,
// the raw spec and the .http collection resolvable by path.
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const pkgName = "@datagriff/todo-api-contract";
let scratch = "";

function node(script: string, cwd: string): string {
  return execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    cwd,
    encoding: "utf8",
  }).trim();
}

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), "contract-pkg-"));
  execFileSync("pnpm", ["pack", "--pack-destination", scratch], { cwd: root, stdio: "pipe" });
  const tarball = readdirSync(scratch).find((f) => f.endsWith(".tgz"));
  expect(tarball).toBeDefined();
  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify({
      name: "consumer",
      private: true,
      dependencies: { [pkgName]: `file:./${tarball}` },
    }),
  );
  // --ignore-workspace: the scratch dir must not be treated as part of this repo.
  execFileSync("pnpm", ["install", "--ignore-workspace", "--no-frozen-lockfile"], {
    cwd: scratch,
    stdio: "pipe",
  });
}, 180_000);

afterAll(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
});

describe("published package", () => {
  it("exposes types, zod schemas and the client from the root export (ESM and CJS)", () => {
    const esm = node(
      `import * as m from "${pkgName}"; console.log([typeof m.createClient, typeof m.ApiError, typeof m.schemas.todoSchema.safeParse, typeof m.listTodos].join(","))`,
      scratch,
    );
    expect(esm).toBe("function,function,function,function");
    const cjs = execFileSync(
      process.execPath,
      [
        "-e",
        `const m = require("${pkgName}"); console.log(typeof m.createClient, typeof m.schemas.todoSchema.safeParse)`,
      ],
      { cwd: scratch, encoding: "utf8" },
    ).trim();
    expect(cjs).toBe("function function");
  });

  it("serves each subpath export (ESM and CJS)", () => {
    const esm = node(
      `const z = await import("${pkgName}/zod"); const c = await import("${pkgName}/client"); await import("${pkgName}/types"); console.log(typeof z.todoSchema.parse, typeof c.createClient)`,
      scratch,
    );
    expect(esm).toBe("function function");
    const cjs = execFileSync(
      process.execPath,
      [
        "-e",
        `const z = require("${pkgName}/zod"); const c = require("${pkgName}/client"); require("${pkgName}/types"); console.log(typeof z.todoSchema.parse, typeof c.createClient, require.resolve("${pkgName}/types").endsWith(".cjs"))`,
      ],
      { cwd: scratch, encoding: "utf8" },
    ).trim();
    expect(cjs).toBe("function function true");
  });

  it("ships the spec and the .http collection at resolvable paths", () => {
    const out = node(
      `import { createRequire } from "node:module"; import { readFileSync } from "node:fs"; const r = createRequire(import.meta.url);
       const spec = r.resolve("${pkgName}/openapi.yaml"); const http = r.resolve("${pkgName}/collections/health.http");
       console.log(readFileSync(spec, "utf8").startsWith("openapi:"), readFileSync(http, "utf8").includes("# @name get_health"))`,
      scratch,
    );
    expect(out).toBe("true true");
  });

  it("does not ship sources, tests or tooling", () => {
    const installed = join(scratch, "node_modules", ...pkgName.split("/"));
    const top = readdirSync(installed).sort();
    // npm always adds LICENSE + README to a tarball; everything else is the `files` allowlist.
    expect(top).toEqual(["LICENSE", "README.md", "api", "collections", "dist", "package.json"]);
  });
});
