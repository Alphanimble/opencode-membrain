#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

// Copy of the fixed stripJsoncComments function
function stripJsoncComments(jsonc) {
  let result = "";
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonc.length) {
    const char = jsonc[i];
    const nextChar = jsonc[i + 1];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      result += char;
    } else {
      if (char === '"') {
        inString = true;
        result += char;
      } else if (char === "/" && nextChar === "/") {
        while (i < jsonc.length && jsonc[i] !== "\n") {
          i++;
        }
        if (i < jsonc.length) {
          result += jsonc[i];
        }
      } else if (char === "/" && nextChar === "*") {
        i += 2;
        while (i < jsonc.length - 1) {
          if (jsonc[i] === "*" && jsonc[i + 1] === "/") {
            i += 2;
            break;
          }
          i++;
        }
      } else {
        result += char;
      }
    }
    i++;
  }

  return result;
}

const CONFIG_DIR = join(homedir(), ".config", "opencode");
const CONFIG_FILES = [
  join(CONFIG_DIR, "membrain.jsonc"),
  join(CONFIG_DIR, "membrain.json"),
];

console.log("=== Mem-Brain Config Test ===\n");
console.log(`homedir(): ${homedir()}`);
console.log(`CONFIG_DIR: ${CONFIG_DIR}`);
console.log(``);

for (const path of CONFIG_FILES) {
  const exists = existsSync(path);
  console.log(`Checking ${path}:`);
  console.log(`  Exists: ${exists ? "YES" : "NO"}`);
  
  if (exists) {
    try {
      const content = readFileSync(path, "utf-8");
      console.log(`  File size: ${content.length} bytes`);
      
      const json = stripJsoncComments(content);
      console.log(`  JSON size after stripping comments: ${json.length} bytes`);
      
      const parsed = JSON.parse(json);
      console.log(`  Parsed successfully!`);
      console.log(`  apiKey: ${parsed.apiKey ? "***SET***" : "not set"}`);
      console.log(`  apiUrl: ${parsed.apiUrl || "not set"}`);
    } catch (err) {
      console.log(`  ERROR: ${err}`);
    }
  }
  console.log(``);
}

console.log("Environment variables:");
console.log(`  MEMBRAIN_API_KEY: ${process.env.MEMBRAIN_API_KEY ? "***SET***" : "not set"}`);
console.log(`  MEMBRAIN_API_URL: ${process.env.MEMBRAIN_API_URL || "not set"}`);
