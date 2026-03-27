import type { Plugin, PluginInput } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import { tool } from "@opencode-ai/plugin/tool";

import { membrainClient } from "./services/client.js";
import { formatContextForPrompt } from "./services/context.js";
import { getTags } from "./services/tags.js";
import { stripPrivateContent, isFullyPrivate } from "./services/privacy.js";
import { createCompactionHook, type CompactionContext } from "./services/compaction.js";

import { isConfigured, getMembrainConfig } from "./config.js";
import { log } from "./services/logger.js";
import type { SearchResponseEnvelope } from "./types/index.js";

const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;
const INLINE_CODE_PATTERN = /`[^`]+`/g;

function getMemoryKeywordPattern(config: { keywordPatterns: string[] }): RegExp {
  return new RegExp(`\\b(${config.keywordPatterns.join("|")})\\b`, "i");
}

const MEMORY_NUDGE_MESSAGE = `[MEMORY TRIGGER DETECTED]
The user is sharing information that should be remembered. You MUST use the \`membrain\` tool with \`mode: "add"\` to save this.

**What to remember:**
- Preferences ("I prefer...", "I like...", "I hate...")
- Facts about the project ("We use...", "The build command is...", "Never do...")
- Decisions made ("Let's go with...", "We decided...")
- Learned patterns ("The best way to...", "Always remember to...")
- Errors and solutions ("The fix was...", "This error means...")
- Configuration details ("API key is...", "Port is...", "Database is...")

**Tag Guidelines:**
- scope: user | project (auto-added)
- type: preference | project-config | architecture | learned-pattern | error-solution | decision
- domain: frontend | backend | devops | database | security | api | ui
- tech: react | nodejs | docker | typescript | etc.

**Examples of good memories:**
- "User prefers dark mode in all applications" → tags: ["scope.user", "type.preference", "domain.ui"]
- "Build command: bun run build && bun test" → tags: ["scope.project", "type.project-config", "domain.devops"]
- "Uses PostgreSQL with pgvector extension" → tags: ["scope.project", "type.project-config", "domain.database"]
- "Never use \`any\` type - strict TypeScript" → tags: ["scope.project", "type.conventions", "tech.typescript"]
- "Database migrations must be backward compatible" → tags: ["scope.project", "type.best-practice", "domain.database"]

**Format:**
\`\`\`
membrain(mode: "add", content: "CONCISE FACT HERE", tags: ["scope.X", "type.Y", "domain.Z"])
\`\`\`

**DO NOT skip this step. The user explicitly wants you to remember this information.**`;

const MEMORY_REVIEW_MESSAGE = `[MEMORY REVIEW SUGGESTED]
You have accumulated several memories in this conversation. Consider:

1. **Consolidating similar memories** - Are there duplicates or near-duplicates?
2. **Updating outdated information** - Has anything changed?
3. **Linking related memories** - Use get command to see connections
4. **Cleaning up** - Delete temporary or test memories with \`membrain(mode: "cleanup", dryRun: true)\`

To review: membrain(mode: "stats")
To search: membrain(mode: "search", query: "topic", k: 10)
To cleanup: membrain(mode: "cleanup", dryRun: true)`;

function removeCodeBlocks(text: string): string {
  return text.replace(CODE_BLOCK_PATTERN, "").replace(INLINE_CODE_PATTERN, "");
}

function detectMemoryKeyword(text: string, pattern: RegExp): boolean {
  const textWithoutCode = removeCodeBlocks(text);
  return pattern.test(textWithoutCode);
}

// Extract key concepts from user message for contextual search
function extractKeyConcepts(text: string): string {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");
  
  const technicalTerms = cleaned.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) || [];
  const techKeywords = cleaned.match(/\b(?:react|node|docker|kubernetes|api|database|auth|python|javascript|typescript|sql|nosql|microservices|architecture|design|pattern|framework|library|function|class|method|variable|component|service|endpoint|route|middleware|controller|model|schema|table|query|build|test|deploy|ci|cd|dev|prod|staging|server|client|frontend|backend|web|app|application|system|platform|infrastructure|cloud|aws|docker|kubernetes|git|github|gitlab)\b/gi) || [];
  
  const words = cleaned.match(/\b[a-z]{3,}\b/gi) || [];
  const stopWords = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were']);
  const meaningfulWords = words.filter(w => !stopWords.has(w.toLowerCase()));
  
  const allTerms = [...new Set([...technicalTerms, ...techKeywords, ...meaningfulWords])];
  return allTerms.slice(0, 5).join(" ");
}

function isQuestion(text: string): boolean {
  const questionWords = /^(what|how|why|when|where|who|which|can|could|would|should|is|are|do|does|did|will|am|was|were|has|have|had)\b/i;
  const questionMarks = /\?\s*$/;
  return questionWords.test(text) || questionMarks.test(text);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function getIsoWeekYearAndNumber(date: Date): { weekYear: number; weekNumber: number } {
  // ISO week/year uses Thursday anchoring in UTC.
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utcDate.getUTCDay() || 7; // ISO Monday=1...Sunday=7
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const weekYear = utcDate.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const weekNumber = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { weekYear, weekNumber };
}

function getSeason(monthIndex: number): string {
  if (monthIndex <= 1 || monthIndex === 11) return "winter";
  if (monthIndex <= 4) return "spring";
  if (monthIndex <= 7) return "summer";
  return "autumn";
}

function getTimeOfDay(hour: number): string {
  if (hour >= 4 && hour < 6) return "dawn";
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21) return "night";
  return "latenight";
}

function buildTemporalTags(now: Date): string[] {
  const year = now.getFullYear();
  const monthIndex = now.getMonth();
  const month = pad2(monthIndex + 1);
  const dayOfMonth = pad2(now.getDate());
  const isoDate = `${year}-${month}-${dayOfMonth}`;

  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
  const monthNames = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
  ] as const;

  const weekday = dayNames[now.getDay()];
  const monthName = monthNames[monthIndex];
  const quarter = Math.floor(monthIndex / 3) + 1;
  const season = getSeason(monthIndex);
  const timeOfDay = getTimeOfDay(now.getHours());
  const { weekYear, weekNumber } = getIsoWeekYearAndNumber(now);

  const temporalTags = [
    `time.year.${year}`,
    `time.${year}`,
    `time.month.${year}-${month}`,
    `time.month.${monthName}`,
    `time.${year}-${month}`,
    `time.date.${isoDate}`,
    `time.${isoDate}`,
    `time.weekday.${weekday}`,
    `time.day.${weekday}`,
    `time.${weekday}`,
    `time.week.${weekYear}-${pad2(weekNumber)}`,
    `time.week.${weekNumber}`,
    `time.quarter.${year}-Q${quarter}`,
    `time.Q${quarter}`,
    `time.${timeOfDay}`,
    `time.season.${season}`,
    `time.${season}`,
  ];

  // Keep broad query compatibility for pre-dawn hours.
  if (timeOfDay === "latenight") {
    temporalTags.push("time.night");
  }
  if (timeOfDay === "dawn") {
    temporalTags.push("time.morning");
  }

  return [...new Set(temporalTags)];
}

export const MembrainPlugin: Plugin = async (ctx: PluginInput) => {
  const { directory } = ctx;
  const tags = getTags(directory);
  const injectedSessions = new Set<string>();
  
  const { CONFIG } = getMembrainConfig();
  const MEMORY_KEYWORD_PATTERN = getMemoryKeywordPattern(CONFIG);
  
  log("Plugin init", { directory, tags, configured: isConfigured() });

  if (!isConfigured()) {
    log("Plugin disabled - MEMBRAIN_API_KEY or MEMBRAIN_API_URL not set");
  }

  const modelLimits = new Map<string, number>();

  (async () => {
    try {
      const response = await ctx.client.provider.list();
      if (response.data?.all) {
        for (const provider of response.data.all) {
          if (provider.models) {
            for (const [modelId, model] of Object.entries(provider.models)) {
              if (model.limit?.context) {
                modelLimits.set(`${provider.id}/${modelId}`, model.limit.context);
              }
            }
          }
        }
      }
      log("Model limits loaded", { count: modelLimits.size });
    } catch (error) {
      log("Failed to fetch model limits", { error: String(error) });
    }
  })();

  const getModelLimit = (providerID: string, modelID: string): number | undefined => {
    return modelLimits.get(`${providerID}/${modelID}`);
  };

  const compactionHook = isConfigured() && ctx.client
    ? createCompactionHook(ctx as CompactionContext, tags, {
        threshold: CONFIG.compactionThreshold,
        getModelLimit,
      })
    : null;

  return {
    "chat.message": async (input, output) => {
      if (!isConfigured()) return;

      const start = Date.now();

      try {
        const textParts = output.parts.filter(
          (p): p is Part & { type: "text"; text: string } => p.type === "text"
        );

        if (textParts.length === 0) {
          log("chat.message: no text parts found");
          return;
        }

        const userMessage = textParts.map((p) => p.text).join("\n");

        if (!userMessage.trim()) {
          log("chat.message: empty message, skipping");
          return;
        }

        log("chat.message: processing", {
          messagePreview: userMessage.slice(0, 100),
          partsCount: output.parts.length,
          textPartsCount: textParts.length,
        });

        // Check for memory keyword triggers
        if (detectMemoryKeyword(userMessage, MEMORY_KEYWORD_PATTERN)) {
          log("chat.message: memory keyword detected");
          const nudgePart: Part = {
            id: `membrain-nudge-${Date.now()}`,
            sessionID: input.sessionID,
            messageID: output.message.id,
            type: "text",
            text: MEMORY_NUDGE_MESSAGE,
            synthetic: true,
          };
          output.parts.push(nudgePart);
        }

        // Smart context injection on EVERY question
        const isFirstMessage = !injectedSessions.has(input.sessionID);
        const messageIsQuestion = isQuestion(userMessage);
        const shouldInjectContext = isFirstMessage || messageIsQuestion;

        if (shouldInjectContext) {
          try {
            let context: string | null = null;
            let searchQuery: string | undefined;

            if (isFirstMessage) {
              injectedSessions.add(input.sessionID);
              log("Injecting initial Mem-Brain context");
              
              const [userMemoriesResult, projectMemoriesResult, statsResult] = await Promise.all([
                membrainClient.searchMemories("user preferences workflow", CONFIG.maxMemories),
                membrainClient.searchMemories("project configuration architecture", CONFIG.maxProjectMemories),
                membrainClient.getStats(),
              ]);

              context = formatContextForPrompt({
                userMemories: userMemoriesResult.data || [],
                projectMemories: projectMemoriesResult.data || [],
                stats: statsResult.data,
              });
            } else if (messageIsQuestion) {
              searchQuery = extractKeyConcepts(userMessage);
              
              if (searchQuery.length > 0) {
                log("Smart context injection", { query: searchQuery.slice(0, 100) });
                
                const searchResult = await membrainClient.searchMemories(searchQuery, 10);
                
                if (searchResult.data && searchResult.data.length > 0) {
                  // Filter to high-quality memory nodes only (not relationship edges)
                  const relevantMemories = searchResult.data.filter(
                    m => m.type === "memory_node" && (m.semantic_score || 0) > 0.3 && m.content && m.content !== "[No content]"
                  );
                  
                  if (relevantMemories.length > 0) {
                    context = formatContextForPrompt({
                      userMemories: [],
                      projectMemories: relevantMemories.slice(0, 5),
                      stats: undefined,
                    });
                    
                    log("Context injected", { 
                      query: searchQuery.slice(0, 50),
                      results: relevantMemories.length 
                    });
                  }
                }
              }
            }

            if (context) {
              const contextPart: Part = {
                id: `membrain-context-${Date.now()}`,
                sessionID: input.sessionID,
                messageID: output.message.id,
                type: "text",
                text: isFirstMessage ? context : `[RELEVANT MEMORIES for query: "${searchQuery?.slice(0, 60)}..."]\n${context}`,
                synthetic: true,
              };

              output.parts.unshift(contextPart);

              const duration = Date.now() - start;
              log("chat.message: context injected", {
                duration,
                contextLength: context.length,
                isFirstMessage,
                query: searchQuery?.slice(0, 50),
              });
            }
          } catch (error) {
            log("chat.message: context injection error", { error: String(error) });
          }
        }

      } catch (error) {
        log("chat.message: ERROR", { error: String(error) });
      }
    },

    tool: {
      membrain: tool({
        description: `Manage and query the Mem-Brain persistent memory system - an agentic memory system with semantic search and graph relationships.

## MEMORY WORKFLOW
1. SEARCH FIRST - Before answering personal/project questions, call membrain(mode: "search", query: "...")
2. SYNTHESIZE - Don't just list memories, connect them to answer thoughtfully
3. STORE FACTS - When user shares preferences/facts/decisions, save as atomic notes
4. REVIEW CONNECTIONS - Check linked memories for insights

## ADVANCED SEARCH WITH REGEX FILTERING

The keywordFilter parameter accepts regex patterns for powerful tag-based filtering:

### Examples:
- Single tag: keywordFilter: "react"
- Multiple tags (OR): keywordFilter: "react|vue|angular"
- Pattern matching: keywordFilter: "micro*" (matches microservices)
- Complex regex: keywordFilter: "^[a-z]+(-[a-z]+)+$" (hyphenated tags)
- Combined search: keywordFilter: "frontend|backend|api"

### Use Cases:
- Search all database technologies: keywordFilter: "mongo|postgre|redis"
- Find architecture patterns: keywordFilter: "microservices|event-driven|ddd"
- Filter by scope: keywordFilter: "scope.user|scope.project"
- Temporal search: keywordFilter: "time.2024|time.2023"

### Pro Tips:
- Use | for OR operations
- Use * for wildcards
- Use ^ and $ for exact matches
- Combine with semantic query for precision

## MODES

- **add**: Store a memory (content required). Guardian decides update vs create.
  - Auto-tags: scope.project + full temporal tags (year/month/date/weekday/week/quarter/season/time-of-day)
  - Tags: scope.X, type.Y, domain.Z, tech.W, etc.

- **search**: Find memories by semantic similarity (query required). Use keywordFilter for tag filtering. responseFormat: raw (default), interpreted (LLM summary), or both.
  - Example: membrain(mode: "search", query: "authentication", keywordFilter: "jwt|oauth", k: 5)
  - Example: membrain(mode: "search", query: "What does the user prefer?", responseFormat: "interpreted")

- **get**: Retrieve specific memories by ID(s) (memoryId or memoryIds - comma-separated or array)
  - Example: membrain(mode: "get", memoryIds: ["abc-123", "def-456"])

- **delete**: Remove by ID OR by tags/category filters
  - Example: membrain(mode: "delete", tags: ["temp"])
  - Example: membrain(mode: "delete", category: "draft")

- **cleanup**: Find and remove empty/low-quality memories
  - Example: membrain(mode: "cleanup", dryRun: true)  // Preview
  - Example: membrain(mode: "cleanup", dryRun: false) // Actually delete

- **stats**: View memory system statistics
  - Example: membrain(mode: "stats")

## TAG STRATEGY

### Auto-Added Tags (on memory creation):
- scope.project (default when no explicit scope tag is provided)
- Temporal tags: time.year.YYYY, time.YYYY, time.month.YYYY-MM, time.month.<name>, time.date.YYYY-MM-DD, time.weekday.<name>, time.week.YYYY-WW, time.QN, time.<timeofday>, time.season.<name>

### Recommended Tag Categories:
- **Type**: preference, project-config, architecture, learned-pattern, error-solution, decision
- **Domain**: frontend, backend, devops, database, security, api, ui
- **Technology**: react, nodejs, typescript, docker, kubernetes, etc.
- **Status**: active, archived, deprecated, draft
- **Priority**: high, medium, low

### Examples:
- membrain(mode: "add", content: "Uses React with TypeScript", tags: ["type.project-config", "domain.frontend", "tech.react", "tech.typescript"])
- membrain(mode: "add", content: "User prefers dark mode", tags: ["type.preference", "domain.ui"])

## REAL-WORLD EXAMPLES

// Find all frontend technologies
membrain(mode: "search", query: "frontend frameworks", keywordFilter: "react|vue|angular", k: 10)

// Search authentication methods
membrain(mode: "search", query: "how to authenticate users", keywordFilter: "jwt|oauth|security", k: 5)

// Find database options
membrain(mode: "search", query: "database for my project", keywordFilter: "mongo|postgre|redis|sql|nosql", k: 10)

// Architecture patterns
membrain(mode: "search", query: "scaling strategy", keywordFilter: "microservices|kubernetes|load-balancing", k: 5)

// Design patterns
membrain(mode: "search", query: "design patterns I should know", keywordFilter: "ddd|solid|factory|singleton|observer", k: 10)

## BEST PRACTICES

1. **Use atomic notes**: One fact per memory
2. **Tag consistently**: Use same tags for similar concepts
3. **Search before adding**: Avoid duplicates by checking first
4. **Use regex filters**: Narrow results precisely with keywordFilter
5. **Trust the Guardian**: Let it handle auto-linking
6. **Review connections**: Check linked neighbors for insights
7. **Clean up regularly**: Remove outdated or empty memories with cleanup mode
8. **Use descriptive content**: Make memories self-explanatory
9. **Add scope tags**: Distinguish user preferences vs project config`,
        args: {
          mode: tool.schema.enum(["add", "search", "get", "delete", "cleanup", "stats", "traverse", "help"]).optional(),
          content: tool.schema.string().optional(),
          query: tool.schema.string().optional(),
          startMemoryId: tool.schema.string().optional(),
          memoryId: tool.schema.string().optional(),
          memoryIds: tool.schema.union([tool.schema.string(), tool.schema.array(tool.schema.string())]).optional(),
          tags: tool.schema.array(tool.schema.string()).optional(),
          category: tool.schema.string().optional(),
          ingestionScope: tool.schema.string().optional(),
          k: tool.schema.number().optional(),
          keywordFilter: tool.schema.union([tool.schema.string(), tool.schema.array(tool.schema.string())]).optional(),
          scopeRegex: tool.schema.string().optional(),
          maxHops: tool.schema.number().optional(),
          edgeSimilarityThreshold: tool.schema.number().optional(),
          responseFormat: tool.schema.enum(["raw", "interpreted", "both"]).optional(),
          dryRun: tool.schema.boolean().optional(),
        },
        async execute(args: {
          mode?: string;
          content?: string;
          query?: string;
          startMemoryId?: string;
          memoryId?: string;
          memoryIds?: string | string[];
          tags?: string[];
          category?: string;
          ingestionScope?: string;
          k?: number;
          keywordFilter?: string | string[];
          scopeRegex?: string;
          maxHops?: number;
          edgeSimilarityThreshold?: number;
          responseFormat?: "raw" | "interpreted" | "both";
          dryRun?: boolean;
        }) {
          if (!isConfigured()) {
            return JSON.stringify({
              success: false,
              error: "Mem-Brain not configured. Set MEMBRAIN_API_KEY and MEMBRAIN_API_URL environment variables or create ~/.config/opencode/membrain.jsonc",
            });
          }

          const mode = args.mode || "help";

          try {
            switch (mode) {
              case "help": {
                return JSON.stringify({
                  success: true,
                  message: "Mem-Brain Usage Guide",
                  description: "Agentic memory system with semantic search and graph relationships",
                  commands: [
                    {
                      command: "add",
                      description: "Store a memory. Guardian automatically decides update vs create.",
                      args: ["content (required)", "tags?", "category?", "ingestionScope? (optional tag regex for merge/link candidates only)"],
                      examples: [
                        'membrain(mode: "add", content: "User prefers dark mode", tags: ["preference", "ui"])',
                        'membrain(mode: "add", content: "Uses React 18 with TypeScript", tags: ["project", "frontend", "react"], category: "tech")',
                        'membrain(mode: "add", content: "API rate limit is 1000 requests/hour", tags: ["project", "api", "config"])',
                        'membrain(mode: "add", content: "New fact", tags: ["scope.project"], ingestionScope: "scope\\\\.project")',
                      ],
                    },
                    {
                      command: "search",
                      description: "Search memories by semantic similarity. responseFormat: raw (default), interpreted (LLM summary), or both. Use either keywordFilter OR scopeRegex (shared subgraph with ingest/traverse).",
                      args: ["query (required)", "k? (default: 5)", "keywordFilter? (regex)", "scopeRegex? (single pattern)", "responseFormat? (raw|interpreted|both)"],
                      examples: [
                        'membrain(mode: "search", query: "react components", k: 3)',
                        'membrain(mode: "search", query: "What does the user prefer?", responseFormat: "interpreted")',
                        'membrain(mode: "search", query: "authentication methods", keywordFilter: "jwt|oauth", k: 5)',
                        'membrain(mode: "search", query: "project facts", scopeRegex: "scope\\\\.project", k: 5)',
                        'membrain(mode: "search", query: "database options", responseFormat: "both")',
                      ],
                    },
                    {
                      command: "traverse",
                      description: "Semantic graph traversal from a start memory along edges whose descriptions match the query (edge similarity threshold + hop limit). Optional scopeRegex on tags.",
                      args: ["startMemoryId (required)", "query (required)", "maxHops? (1-5)", "edgeSimilarityThreshold? (0-1)", "scopeRegex?"],
                      examples: [
                        'membrain(mode: "traverse", startMemoryId: "abc-123", query: "authentication and authorization")',
                        'membrain(mode: "traverse", startMemoryId: "abc-123", query: "compliance", maxHops: 3, edgeSimilarityThreshold: 0.8)',
                      ],
                    },
                    {
                      command: "get",
                      description: "Retrieve specific memories by ID(s) (memoryId or memoryIds - comma-separated or array)",
                      args: ["memoryId?", "memoryIds? (comma-separated or array)"],
                      examples: [
                        'membrain(mode: "get", memoryId: "abc-123")',
                        'membrain(mode: "get", memoryIds: ["abc-123", "def-456", "ghi-789"])',
                        'membrain(mode: "get", memoryIds: "abc-123, def-456")',
                      ],
                    },
                    {
                      command: "delete",
                      description: "Remove memory by ID OR by tags/category filters",
                      args: ["memoryId?", "tags?", "category?"],
                      examples: [
                        'membrain(mode: "delete", memoryId: "abc-123")',
                        'membrain(mode: "delete", tags: ["temp"])',
                        'membrain(mode: "delete", category: "draft")',
                        'membrain(mode: "delete", tags: ["temp", "test"], category: "draft")',
                      ],
                    },
                    {
                      command: "cleanup",
                      description: "Find and remove empty or low-quality memories",
                      args: ["dryRun? (default: true - preview only)"],
                      examples: [
                        'membrain(mode: "cleanup", dryRun: true)   // Preview what would be deleted',
                        'membrain(mode: "cleanup", dryRun: false) // Actually delete empty memories',
                      ],
                    },
                    {
                      command: "stats",
                      description: "View memory system statistics",
                      args: [],
                      examples: [
                        'membrain(mode: "stats")',
                      ],
                    },
                  ],
                  best_practices: [
                    "Use atomic notes (one fact per memory)",
                    "Use descriptive tags: scope.X, type.Y, domain.Z",
                    "Search before adding to avoid duplicates",
                    "Use regex keywordFilter for precise filtering",
                    "Trust the Guardian to handle auto-linking",
                    "Clean up empty memories regularly",
                  ],
                });
              }

              case "add": {
                if (!args.content) {
                  return JSON.stringify({
                    success: false,
                    error: "content parameter is required for add mode",
                  });
                }

                const sanitizedContent = stripPrivateContent(args.content);
                if (isFullyPrivate(args.content)) {
                  return JSON.stringify({
                    success: false,
                    error: "Cannot store fully private content",
                  });
                }

                // Auto-add scope and temporal tags
                const autoTags = [...(args.tags || [])];
                const { project } = getTags(directory);
                
                // Add scope tag if not present
                if (!autoTags.some(t => t.startsWith("scope."))) {
                  autoTags.push("scope.project");
                }

                // Generate robust temporal tags in plugin to keep behavior deterministic.
                const temporalTags = buildTemporalTags(new Date());
                for (const temporalTag of temporalTags) {
                  autoTags.push(temporalTag);
                }
                
                // Add type tag from category if provided
                if (args.category && !autoTags.some(t => t.startsWith("type."))) {
                  autoTags.push(`type.${args.category}`);
                }

                const result = await membrainClient.addMemory(
                  sanitizedContent,
                  [...new Set(autoTags)],
                  args.category,
                  args.ingestionScope,
                );

                if (!result.success) {
                  return JSON.stringify({
                    success: false,
                    error: result.error || "Failed to add memory",
                  });
                }

                return JSON.stringify({
                  success: true,
                  message: "Memory stored successfully",
                  id: result.data?.id,
                  content: result.data?.content,
                  tags: result.data?.tags,
                  category: result.data?.category,
                  note: "Guardian will automatically link related memories",
                });
              }

              case "search": {
                if (!args.query) {
                  return JSON.stringify({
                    success: false,
                    error: "query parameter is required for search mode",
                  });
                }

                const k = args.k || 5;
                const responseFormat = args.responseFormat || "raw";

                let envelope: SearchResponseEnvelope;
                try {
                  envelope = await membrainClient.searchMemoriesResponse(
                    args.query,
                    k,
                    args.keywordFilter,
                    responseFormat,
                    args.scopeRegex,
                  );
                } catch (err) {
                  return JSON.stringify({
                    success: false,
                    error: err instanceof Error ? err.message : String(err),
                  });
                }

                if (responseFormat === "interpreted" || responseFormat === "both") {
                  const parts: string[] = [];
                  if (envelope.interpreted_error) {
                    parts.push(`⚠ Interpreted summary unavailable: ${envelope.interpreted_error}`);
                  }
                  if (envelope.interpreted) {
                    parts.push("--- Interpreted Summary ---");
                    parts.push(`Answer: ${envelope.interpreted.answer_summary ?? "N/A"}`);
                    parts.push(`Confidence: ${envelope.interpreted.confidence ?? "N/A"}`);
                    if (envelope.interpreted.key_facts?.length) {
                      parts.push("", "Key Facts:");
                      for (const f of envelope.interpreted.key_facts) parts.push(`  • ${f}`);
                    }
                    if (envelope.interpreted.important_relationships?.length) {
                      parts.push("", "Relationships:");
                      for (const r of envelope.interpreted.important_relationships) parts.push(`  • ${r}`);
                    }
                    if (envelope.interpreted.conflicts_or_uncertainties?.length) {
                      parts.push("", "Conflicts/Uncertainties:");
                      for (const c of envelope.interpreted.conflicts_or_uncertainties) parts.push(`  ⚠ ${c}`);
                    }
                  }
                  if (responseFormat === "both" || (envelope.interpreted_error && envelope.results.length > 0)) {
                    parts.push("", "--- Raw Evidence ---");
                  }
                  if (envelope.results.length > 0) {
                    const formattedRaw = envelope.results.map((m, i) => {
                      if (m.type === "memory_node") {
                        const sim = m.semantic_score != null ? Math.round(m.semantic_score * 100) : 0;
                        return `${i + 1}. ${m.content?.slice(0, 150) ?? "[No content]"}... (${sim}%)`;
                      }
                      const edge = m as import("./types/index.js").RelationshipEdgeResult;
                      return `${i + 1}. Relationship: ${edge.description || "N/A"} (${edge.score != null ? Math.round(edge.score * 100) : 0}%)`;
                    });
                    parts.push(`Found ${envelope.count} results:\n${formattedRaw.join("\n")}`);
                  }
                  if (parts.length === 0 && envelope.results.length === 0) {
                    return JSON.stringify({
                      success: true,
                      query: args.query,
                      interpreted_error: envelope.interpreted_error,
                      message: "No memories found matching the query.",
                    });
                  }
                  return JSON.stringify({
                    success: true,
                    query: args.query,
                    responseFormat,
                    interpreted: envelope.interpreted,
                    interpreted_error: envelope.interpreted_error,
                    formatted: parts.join("\n"),
                    count: envelope.count,
                    results: envelope.results.map((m) => {
                      if (m.type === "memory_node") {
                        return { id: m.id, content: m.content?.slice(0, 200), similarity: m.semantic_score, type: "memory" };
                      }
                      const edge = m as import("./types/index.js").RelationshipEdgeResult;
                      return { id: edge.id, content: `Relationship: ${edge.description}`, similarity: edge.score, type: "relationship" };
                    }),
                  });
                }

                // raw format (existing behavior)
                const memories = envelope.results;
                const formattedResults = memories.map((m) => {
                  if (m.type === "memory_node") {
                    return {
                      id: m.id,
                      content: m.content ? m.content.slice(0, 200) + (m.content.length > 200 ? "..." : "") : "[No content]",
                      similarity: m.semantic_score != null ? Math.round(m.semantic_score * 100) : 0,
                      tags: m.tags || [],
                      type: "memory",
                    };
                  }
                  return {
                    id: m.id,
                    content: `Relationship: ${m.description || "N/A"}`,
                    similarity: m.score != null ? Math.round(m.score * 100) : 0,
                    tags: [],
                    type: "relationship",
                    source: m.source?.content?.slice(0, 50),
                    target: m.target?.content?.slice(0, 50),
                  };
                });

                return JSON.stringify({
                  success: true,
                  query: args.query,
                  keywordFilter: args.keywordFilter,
                  scopeRegex: envelope.scope_regex ?? args.scopeRegex,
                  count: memories.length,
                  results: formattedResults,
                });
              }

              case "traverse": {
                if (!args.startMemoryId?.trim() || !args.query?.trim()) {
                  return JSON.stringify({
                    success: false,
                    error: "startMemoryId and query are required for traverse mode",
                  });
                }

                const tr = await membrainClient.traverseGraph(
                  args.startMemoryId.trim(),
                  args.query.trim(),
                  {
                    maxHops: args.maxHops,
                    edgeSimilarityThreshold: args.edgeSimilarityThreshold,
                    scopeRegex: args.scopeRegex,
                  },
                );

                if (!tr.success || !tr.data) {
                  return JSON.stringify({
                    success: false,
                    error: tr.error || "Traverse failed",
                  });
                }

                return JSON.stringify({
                  success: true,
                  start_memory_id: args.startMemoryId,
                  query: args.query,
                  total_memories: tr.data.total_memories,
                  total_edges: tr.data.total_edges,
                  memories: tr.data.memories,
                  traversed_edges: tr.data.traversed_edges,
                });
              }

              case "get": {
                let memoryIds: string[] = [];
                
                if (args.memoryId) {
                  memoryIds = [args.memoryId];
                } else if (args.memoryIds) {
                  if (typeof args.memoryIds === "string") {
                    memoryIds = args.memoryIds.split(",").map(id => id.trim()).filter(id => id);
                  } else if (Array.isArray(args.memoryIds)) {
                    memoryIds = args.memoryIds;
                  }
                }
                
                if (memoryIds.length === 0) {
                  return JSON.stringify({
                    success: false,
                    error: "memoryId or memoryIds parameter is required for get mode",
                  });
                }

                if (memoryIds.length === 1) {
                  const result = await membrainClient.getMemory(memoryIds[0]);

                  if (!result.success) {
                    return JSON.stringify({
                      success: false,
                      error: result.error || "Failed to retrieve memory",
                    });
                  }

                  const memory = result.data;
                  return JSON.stringify({
                    success: true,
                    memory: {
                      id: memory?.id,
                      content: memory?.content,
                      tags: memory?.tags,
                      category: memory?.category,
                      version: memory?.version,
                      created_at: memory?.created_at,
                      updated_at: memory?.updated_at,
                      evolution_history: memory?.evolution_history,
                      linked_neighbors: memory?.linked_neighbors?.map((n) => ({
                        id: n.memory_id,
                        content: n.content ? n.content.slice(0, 100) + (n.content.length > 100 ? "..." : "") : "[No content]",
                        relationship: n.description || "[No description]",
                      })),
                    },
                  });
                } else {
                  const results = await Promise.all(
                    memoryIds.map(id => membrainClient.getMemory(id))
                  );
                  
                  const successfulResults = results.filter(r => r.success).map(r => r.data);
                  const failedCount = results.filter(r => !r.success).length;

                  return JSON.stringify({
                    success: true,
                    count: successfulResults.length,
                    failed: failedCount,
                    memories: successfulResults,
                  });
                }
              }

              case "delete": {
                const hasFilter = args.tags || args.category;
                
                if (!args.memoryId && !hasFilter) {
                  return JSON.stringify({
                    success: false,
                    error: "memoryId, tags, or category parameter is required for delete mode",
                  });
                }

                if (args.memoryId) {
                  const result = await membrainClient.deleteMemory(args.memoryId);

                  if (!result.success) {
                    return JSON.stringify({
                      success: false,
                      error: result.error || "Failed to delete memory",
                    });
                  }

                  return JSON.stringify({
                    success: true,
                    message: `Memory ${args.memoryId} deleted`,
                  });
                } else {
                  const result = await membrainClient.deleteMemories(args.tags, args.category);

                  if (!result.success) {
                    return JSON.stringify({
                      success: false,
                      error: result.error || "Failed to delete memories",
                    });
                  }

                  const deletedIds = result.data?.deletedIds || [];
                  return JSON.stringify({
                    success: true,
                    message: `Deleted ${deletedIds.length} memories`,
                    deletedCount: deletedIds.length,
                    deletedIds: deletedIds.slice(0, 10),
                  });
                }
              }

              case "cleanup": {
                const dryRun = args.dryRun !== false; // Default to true for safety
                
                // Search for potentially empty or low-quality memories
                const searchResult = await membrainClient.searchMemories("session test temp empty", 100);
                
                const emptyOrLowQuality = searchResult.data?.filter(m => {
                  // Only check memory nodes, skip relationship edges
                  if (m.type !== "memory_node") return false;
                  const content = m.content || "";
                  const tags = m.tags || [];
                  return !content || 
                    content === "[No content]" || 
                    content.trim() === "" ||
                    content.length < 10 ||
                    tags.length === 0;
                }) || [];
                
                if (dryRun) {
                  return JSON.stringify({
                    success: true,
                    dryRun: true,
                    wouldDelete: emptyOrLowQuality.length,
                    memories: emptyOrLowQuality
                      .filter((m): m is import("./types/index.js").MemoryNodeResult => m.type === "memory_node")
                      .map(m => ({ 
                        id: m.id, 
                        content: m.content?.slice(0, 100) || "[No content]",
                        tags: m.tags || [],
                      })),
                    message: `Found ${emptyOrLowQuality.length} memories to delete. Run with dryRun: false to actually delete.`,
                  });
                }
                
                // Actually delete
                const deletedIds: string[] = [];
                for (const memory of emptyOrLowQuality) {
                  if (memory.id) {
                    try {
                      await membrainClient.deleteMemory(memory.id);
                      deletedIds.push(memory.id);
                    } catch (e) {
                      log("Failed to delete memory during cleanup", { id: memory.id, error: String(e) });
                    }
                  }
                }
                
                return JSON.stringify({
                  success: true,
                  deleted: deletedIds.length,
                  deletedIds: deletedIds.slice(0, 20),
                  message: `Cleaned up ${deletedIds.length} empty/low-quality memories`,
                });
              }

              case "stats": {
                const result = await membrainClient.getStats();

                if (!result.success) {
                  return JSON.stringify({
                    success: false,
                    error: result.error || "Failed to fetch stats",
                  });
                }

                const stats = result.data;
                return JSON.stringify({
                  success: true,
                  stats: {
                    total_memories: stats?.total_memories,
                    total_links: stats?.total_links,
                    link_density: stats?.link_density,
                    top_tags: stats?.tags?.slice(0, 10),
                  },
                });
              }

              default:
                return JSON.stringify({
                  success: false,
                  error: `Unknown mode: ${mode}. Use "help" to see available modes.`,
                });
            }
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
      }),
    },

    event: async (input: { event: { type: string; properties?: unknown } }) => {
      if (compactionHook) {
        await compactionHook.event(input);
      }
    },
  };
};
