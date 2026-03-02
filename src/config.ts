import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { stripJsoncComments } from "./services/jsonc.js";

// Compute at runtime, not build time
function getConfigDir(): string {
  return join(homedir(), ".config", "opencode");
}

interface MembrainConfig {
  apiKey?: string;
  apiUrl?: string;
  maxMemories?: number;
  maxProjectMemories?: number;
  keywordPatterns?: string[];
  compactionThreshold?: number;
}

const DEFAULT_KEYWORD_PATTERNS = [
  "remember",
  "memorize",
  "save\\s+this",
  "note\\s+this",
  "keep\\s+in\\s+mind",
  "don'?t\\s+forget",
  "learn\\s+this",
  "store\\s+this",
  "record\\s+this",
  "make\\s+a\\s+note",
  "take\\s+note",
  "jot\\s+down",
  "commit\\s+to\\s+memory",
  "remember\\s+that",
  "never\\s+forget",
  "always\\s+remember",
];

const DEFAULTS = {
  maxMemories: 5,
  maxProjectMemories: 10,
  keywordPatterns: [] as string[],
  compactionThreshold: 0.80,
};

function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

function loadConfig(): MembrainConfig {
  const CONFIG_DIR = getConfigDir();
  const configFiles = [
    join(CONFIG_DIR, "membrain.jsonc"),
    join(CONFIG_DIR, "membrain.json"),
  ];

  for (const path of configFiles) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, "utf-8");
        const json = stripJsoncComments(content);
        return JSON.parse(json) as MembrainConfig;
      } catch {
        // Invalid config, skip
      }
    }
  }
  return {};
}

function getApiKey(config: MembrainConfig): string | undefined {
  return process.env.MEMBRAIN_API_KEY || config.apiKey;
}

function getApiUrl(config: MembrainConfig): string | undefined {
  return process.env.MEMBRAIN_API_URL || config.apiUrl;
}

// Load config at runtime, not build time
let _cachedConfig: MembrainConfig | null = null;

function getConfig(): MembrainConfig {
  if (!_cachedConfig) {
    _cachedConfig = loadConfig();
  }
  return _cachedConfig;
}

export function getMembrainConfig() {
  const fileConfig = getConfig();
  const apiKey = getApiKey(fileConfig);
  const apiUrl = getApiUrl(fileConfig);
  
  return {
    MEMBRAIN_API_KEY: apiKey,
    MEMBRAIN_API_URL: apiUrl,
    CONFIG: {
      maxMemories: fileConfig.maxMemories ?? DEFAULTS.maxMemories,
      maxProjectMemories: fileConfig.maxProjectMemories ?? DEFAULTS.maxProjectMemories,
      keywordPatterns: [
        ...DEFAULT_KEYWORD_PATTERNS,
        ...(fileConfig.keywordPatterns ?? []).filter(isValidRegex),
      ],
      compactionThreshold: fileConfig.compactionThreshold ?? DEFAULTS.compactionThreshold,
    }
  };
}

export function isConfigured(): boolean {
  const { MEMBRAIN_API_KEY, MEMBRAIN_API_URL } = getMembrainConfig();
  return !!MEMBRAIN_API_KEY && !!MEMBRAIN_API_URL;
}

// Backwards compatibility - but these will be undefined at import time
export const MEMBRAIN_API_KEY = undefined;
export const MEMBRAIN_API_URL = undefined;
export const CONFIG = DEFAULTS;
