import { appendFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const LOG_FILE = join(homedir(), ".opencode-membrain.log");

export function log(message: string, data?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    ...data,
  };
  
  try {
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");
  } catch {
    // Silent fail - logging should not break functionality
  }
}
