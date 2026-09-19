import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { generateCollection } from "../../scripts/lib/http-collection.mjs";

// The drift gate only detects that generated output CHANGED; these tests pin
// down what the generator must produce from the real contract.
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const contract = parse(readFileSync(join(root, "api/openapi.yaml"), "utf8")) as Record<
  string,
  unknown
>;
const METHODS = ["get", "post", "put", "patch", "delete"] as const;

type Operation = { operationId?: string; security?: unknown[]; parameters?: unknown[] };
type PathItem = Partial<Record<(typeof METHODS)[number], Operation>>;

describe("gen-http-collection", () => {
  const { files, env } = generateCollection(contract) as {
    files: Map<string, string>;
    env: Record<string, Record<string, string>>;
  };
  const all = [...files.values()].join("\n");
  const operations = Object.values(contract.paths as Record<string, PathItem>).flatMap((item) =>
    METHODS.map((m) => item[m]).filter((op): op is Operation => Boolean(op)),
  );

  it("emits exactly one named request per operation", () => {
    for (const op of operations) {
      expect(all.match(new RegExp(`^# @name ${op.operationId}$`, "m"))?.length ?? 0).toBe(1);
    }
    expect(all.match(/^# @name /gm)).toHaveLength(operations.length);
  });

  it("sends both auth headers on secured operations and none on public ones", () => {
    const blocks = all.split(/^### /m).slice(1);
    for (const block of blocks) {
      const name = /^# @name (\S+)/m.exec(block)?.[1];
      const op = operations.find((o) => o.operationId === name)!;
      const secured = (op.security ?? (contract.security as unknown[]) ?? []).length > 0;
      expect(block.includes("Authorization: Bearer {{token}}"), name).toBe(secured);
      expect(block.includes("x-api-key: {{apiKey}}"), name).toBe(secured);
    }
  });

  it("defines every placeholder the requests use, in every environment, without storing tokens", () => {
    const used = new Set([...all.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!));
    used.delete("token");
    used.delete("apiKey");
    for (const [name, vars] of Object.entries(env)) {
      for (const v of used) expect(vars, `${name} defines ${v}`).toHaveProperty(v);
      expect(vars).not.toHaveProperty("token");
    }
    expect(env.local!.baseUrl).toBe("http://localhost:3000/v1");
    expect(env.local!.cursor).toBe("");
  });
});
