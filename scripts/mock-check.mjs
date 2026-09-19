#!/usr/bin/env node
// Contract self-consistency check (`task test:mock`, Docker-free):
//   Prism mocks the contract  <-- httpyac replays the GENERATED .http collection
// Both sides derive from api/openapi.yaml, so every request the collection
// makes must be one the mock accepts, and every status it returns must be one
// the contract declares for that operation. Catches a collection generator
// bug, an example that does not satisfy its own schema, and a spec Prism
// cannot serve — before a consumer does.
import { spawn, execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parse } from "yaml";

const execFile = promisify(execFileCb);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contract = join(root, "api/openapi.yaml");
// Prism and httpyac are devDependencies; run the local binaries.
const bin = (name) => join(root, "node_modules/.bin", name);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

// Status codes each operation declares, keyed by operationId.
function declaredStatuses() {
  const spec = parse(readFileSync(contract, "utf8"));
  const out = new Map();
  for (const item of Object.values(spec.paths)) {
    for (const op of Object.values(item)) {
      if (op && typeof op === "object" && op.operationId) {
        out.set(op.operationId, new Set(Object.keys(op.responses ?? {}).map(Number)));
      }
    }
  }
  return out;
}

async function startPrism(port) {
  const child = spawn(bin("prism"), ["mock", "-h", "127.0.0.1", "-p", String(port), contract], {
    // Prism logs every request on stdout; only its errors are interesting here.
    stdio: ["ignore", "ignore", "inherit"],
  });
  const state = { exited: null };
  child.on("exit", (code) => (state.exited = code ?? -1));
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (state.exited !== null) throw new Error(`prism exited early with code ${state.exited}`);
    try {
      const res = await fetch(`http://127.0.0.1:${port}/health`);
      if (res.ok) return child;
    } catch {
      // not up yet
    }
    await sleep(250);
  }
  child.kill("SIGTERM");
  throw new Error("prism did not answer GET /health within 60 s");
}

async function replay(baseUrl) {
  const args = [
    "send",
    "collections/todos.http",
    "collections/health.http",
    "--all",
    "--env",
    "local",
    "--var",
    `baseUrl=${baseUrl}`,
    "--var",
    "token=mock-token",
    "--var",
    "apiKey=mock-key",
    "--json",
    "--output",
    "short",
  ];
  const { stdout } = await execFile(bin("httpyac"), args, {
    cwd: root,
    maxBuffer: 16 * 1024 * 1024,
  }).catch((err) => {
    // httpyac exits non-zero on failed requests but still prints the report.
    if (typeof err.stdout === "string" && err.stdout.trim().startsWith("{"))
      return { stdout: err.stdout };
    throw err;
  });
  return JSON.parse(stdout.slice(stdout.indexOf("{")));
}

const port = await freePort();
const prism = await startPrism(port);
try {
  const declared = declaredStatuses();
  const report = await replay(`http://127.0.0.1:${port}`);
  const failures = [];
  const seen = new Set();
  for (const req of report.requests ?? []) {
    const name = req.name ?? req.title ?? "(unnamed)";
    const status = req.response?.statusCode;
    seen.add(name);
    console.log(`  ${name} → ${status ?? "-"}`);
    if (status === undefined) failures.push(`${name}: no response`);
    else if (status >= 500) failures.push(`${name}: mock returned ${status}`);
    else if (!declared.has(name))
      failures.push(`${name}: request name is not an operationId (run task gen)`);
    else if (!declared.get(name).has(status))
      failures.push(`${name}: ${status} is not declared in the contract`);
  }
  for (const op of declared.keys()) {
    if (!seen.has(op)) failures.push(`${op}: missing from the collection (run task gen)`);
  }
  if (failures.length) {
    console.error(`✖ mock check failed:\n  - ${failures.join("\n  - ")}`);
    process.exitCode = 1;
  } else {
    console.log(`✔ ${seen.size} operations replayed against the mock; every status is declared`);
  }
} finally {
  prism.kill("SIGTERM");
}
