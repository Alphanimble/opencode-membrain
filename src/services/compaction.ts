import type { PluginInput } from "@opencode-ai/plugin";
import { membrainClient } from "./client.js";
import type { Tags } from "./tags.js";
import { getMembrainConfig } from "../config.js";
import { log } from "./logger.js";

export interface CompactionContext extends PluginInput {
  client: NonNullable<PluginInput["client"]>;
}

interface CompactionOptions {
  threshold: number;
  getModelLimit: (providerID: string, modelID: string) => number | undefined;
}

// Extract key facts from session content
function extractSessionFacts(content: string): string[] {
  const facts: string[] = [];
  
  // Look for key patterns
  const patterns = [
    // Decisions made
    /(?:decided|chosen|selected|went with|opted for)[\s:]+([^.;\n]+)/gi,
    // Important discoveries
    /(?:discovered|found|realized|learned|figured out)[\s:]+([^.;\n]+)/gi,
    // Configuration set
    /(?:configured|set up|enabled|disabled|set to)[\s:]+([^.;\n]+)/gi,
    // Problems solved
    /(?:fixed|solved|resolved|addressed|worked around)[\s:]+([^.;\n]+)/gi,
    // Preferences stated
    /(?:prefers|likes|wants|needs|requires)[\s:]+([^.;\n]+)/gi,
    // Key commands/code
    /(?:command|script|code|function)[\s:]+(?:is|to)[\s:]+`?([^`\n;]+)/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const fact = match[1]?.trim();
      if (fact && fact.length > 10 && fact.length < 200) {
        facts.push(fact);
      }
    }
  }
  
  return [...new Set(facts)].slice(0, 10); // Deduplicate and limit
}

export function createCompactionHook(
  ctx: CompactionContext,
  tags: Tags,
  options: CompactionOptions
) {
  const { threshold, getModelLimit } = options;

  return {
    async event(input: { event: { type: string; properties?: unknown } }) {
      if (input.event.type !== "context.compaction") return;

      const event = input.event as { 
        type: string; 
        properties: { 
          providerID: string; 
          modelID: string;
          usage: { input: number; output: number };
        } 
      };

      try {
        const modelLimit = getModelLimit(event.properties.providerID, event.properties.modelID);
        if (!modelLimit) return;

        const totalUsage = event.properties.usage.input + event.properties.usage.output;
        const usageRatio = totalUsage / modelLimit;

        if (usageRatio < threshold) return;

        log("Compaction triggered - extracting session facts", { usageRatio, threshold, modelLimit });

        // Load config at runtime
        const { CONFIG } = getMembrainConfig();

        // Get recent memories to understand what was discussed
        const [recentMemories, stats] = await Promise.all([
          membrainClient.searchMemories("session learnings decisions preferences", 10),
          membrainClient.getStats(),
        ]);

        // Extract facts from memory content (only from memory nodes, not relationship edges)
        const allContent = recentMemories.data
          ?.filter(m => m.type === "memory_node")
          .map(m => m.content)
          .filter(Boolean)
          .join("\n") || "";
        
        const extractedFacts = extractSessionFacts(allContent);
        
        log("Extracted session facts", { count: extractedFacts.length });

        // Save extracted facts as individual atomic memories
        const savedFacts: string[] = [];
        for (const fact of extractedFacts.slice(0, 5)) { // Limit to top 5 most important
          try {
            const result = await membrainClient.addMemory(
              `Session learning: ${fact}`,
              ["session-learning", "compaction", "learned-pattern", tags.project],
              "session"
            );
            if (result.success) {
              savedFacts.push(fact);
            }
          } catch (e) {
            log("Failed to save fact", { fact: fact.slice(0, 50), error: String(e) });
          }
        }

        // Also save a high-level session summary
        const timestamp = new Date().toISOString();
        const summaryContent = `
Session Summary (${timestamp})
- Total memories in system: ${stats.data?.total_memories || 0}
- Context usage ratio: ${Math.round(usageRatio * 100)}%
- Key facts learned: ${savedFacts.length}
- Topics covered: ${extractedFacts.slice(0, 3).join("; ")}
        `.trim();

        await membrainClient.addMemory(
          summaryContent,
          ["session-summary", "compaction", "stats", tags.project],
          "session"
        );

        log("Session summary saved", { 
          factsSaved: savedFacts.length, 
          totalFacts: extractedFacts.length,
          contextRatio: Math.round(usageRatio * 100)
        });

      } catch (error) {
        log("Compaction hook error", { error: String(error) });
      }
    },
  };
}
