#!/usr/bin/env node
// Prints the absolute path of the contract (for tools that need a file path).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

console.log(join(dirname(fileURLToPath(import.meta.url)), "..", "api/openapi.yaml"));
