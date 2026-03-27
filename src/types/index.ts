/**
 * Mem-Brain types - aligned with API response structure
 */

export interface Memory {
  id: string;
  content: string;
  tags?: string[];
  category?: string;
  embedding?: number[];
  evolution_history?: MemoryVersion[];
  linked_memories?: string[];
  linked_neighbors?: LinkedMemory[];
  created_at?: string;
  updated_at?: string;
  version?: number;
}

export interface MemoryVersion {
  version: number;
  content: string;
  updated_at: string;
  update_type?: "revision" | "append" | "contradiction";
}

export interface LinkedMemory {
  memory_id: string;
  content: string;
  description: string;
  similarity?: number;
}

// Related memory in search results
export interface RelatedMemory {
  id: string;
  content: string;
  context: string;
  tags?: string[];
  keywords?: string[];
}

// Memory node result from search
export interface MemoryNodeResult {
  type: "memory_node";
  id: string;
  content: string;
  tags?: string[];
  category?: string;
  context?: string;
  keywords?: string[];
  semantic_score: number;
  related_memories?: RelatedMemory[];
}

// Relationship edge result from search
export interface RelationshipEdgeResult {
  type: "relationship_edge";
  id: string;
  score: number;
  description?: string;
  source: {
    id: string;
    content: string;
    context: string;
    tags?: string[];
    keywords?: string[];
    neighbors?: RelatedMemory[];
  };
  target: {
    id: string;
    content: string;
    context: string;
    tags?: string[];
    keywords?: string[];
    neighbors?: RelatedMemory[];
  };
  is_edge_hit?: boolean;
}

// Union type for search results
export type SearchResult = MemoryNodeResult | RelationshipEdgeResult;

// Search response format
export type ResponseFormat = "raw" | "interpreted" | "both";

// Interpreted summary from API
export interface InterpretedSummary {
  answer_summary?: string;
  key_facts?: string[];
  important_relationships?: string[];
  conflicts_or_uncertainties?: string[];
  supporting_memory_ids?: string[];
  supporting_edge_ids?: string[];
  confidence?: string;
}

// Full search response envelope
export interface SearchResponseEnvelope {
  count: number;
  results: SearchResult[];
  interpreted?: InterpretedSummary;
  interpreted_error?: string;
  /** Echoed when the request used scope_regex */
  scope_regex?: string | null;
}

// Helper to check if result is a memory node
export function isMemoryNode(result: SearchResult): result is MemoryNodeResult {
  return result.type === "memory_node";
}

// Helper to check if result is a relationship edge
export function isRelationshipEdge(result: SearchResult): result is RelationshipEdgeResult {
  return result.type === "relationship_edge";
}

export interface MemoryStats {
  total_memories: number;
  total_links: number;
  link_density: number;
  tags: Array<{ tag: string; count: number }>;
  top_keywords: Array<{ keyword: string; count: number }>;
}

export interface DeleteResult {
  deletedCount: number;
  deletedIds: string[];
}

// Response from add memory API
export interface AddMemoryResponse {
  memory_id: string;
  action: "created" | "updated";
  memory: Memory;
}

export interface MembrainResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
