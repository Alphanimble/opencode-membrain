import type { Tags } from "./tags.js";
import type { SearchResult, MemoryStats, MemoryNodeResult, RelationshipEdgeResult } from "../types/index.js";

interface ContextData {
  userMemories?: SearchResult[];
  projectMemories?: SearchResult[];
  stats?: MemoryStats;
}

// Helper to extract content from search result
function getResultContent(result: SearchResult): string {
  if (result.type === "memory_node") {
    return result.content || "[No content]";
  } else if (result.type === "relationship_edge") {
    return `Link: ${result.description || "Related memories"}`;
  }
  return "[Unknown]";
}

// Helper to extract score from search result
function getResultScore(result: SearchResult): number {
  if (result.type === "memory_node") {
    return result.semantic_score || 0;
  } else if (result.type === "relationship_edge") {
    return result.score || 0;
  }
  return 0;
}

export function formatContextForPrompt(data: ContextData): string | null {
  const parts: string[] = ["[MEMBRAIN CONTEXT]"];
  let hasContent = false;

  // Add stats
  if (data.stats) {
    parts.push(`\nSystem: ${data.stats.total_memories} memories, ${data.stats.total_links} links`);
    hasContent = true;
  }

  // Add user memories
  if (data.userMemories && data.userMemories.length > 0) {
    parts.push("\nUser Preferences:");
    for (const memory of data.userMemories.slice(0, 5)) {
      const score = getResultScore(memory);
      const similarity = Math.round(score * 100);
      const content = getResultContent(memory);
      parts.push(`- [${similarity}%] ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`);
    }
    hasContent = true;
  }

  // Add project memories
  if (data.projectMemories && data.projectMemories.length > 0) {
    parts.push("\nProject Knowledge:");
    for (const memory of data.projectMemories.slice(0, 10)) {
      const score = getResultScore(memory);
      const similarity = Math.round(score * 100);
      const content = getResultContent(memory);
      parts.push(`- [${similarity}%] ${content.slice(0, 100)}${content.length > 100 ? "..." : ""}`);
    }
    hasContent = true;
  }

  if (!hasContent) {
    return null;
  }

  parts.push("\nUse this context to provide personalized, informed responses.");
  
  return parts.join("\n");
}
