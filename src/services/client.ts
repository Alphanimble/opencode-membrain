import { getMembrainConfig } from "../config.js";
import type {
  Memory,
  SearchResult,
  MemoryStats,
  MembrainResponse,
  DeleteResult,
  ResponseFormat,
  SearchResponseEnvelope,
} from "../types/index.js";
import { log } from "./logger.js";

interface ApiRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

interface IngestJobAcceptedResponse {
  status: "accepted";
  job_id: string;
  job_status: "queued" | "processing";
  status_url: string;
  created_at: string;
}

interface IngestJobErrorResponse {
  code: string;
  message: string;
  retryable?: boolean;
}

interface IngestJobStatusResponse {
  job_id: string;
  status: "queued" | "processing" | "completed" | "failed";
  created_at: string;
  started_at?: string;
  completed_at?: string;
  result?: {
    memory_id: string;
    action: "created" | "updated";
    memory?: Memory;
  };
  error?: IngestJobErrorResponse;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeScopePatterns(scope?: string | string[]): string[] | undefined {
  if (scope == null) return undefined;
  if (Array.isArray(scope)) {
    const out = scope.map((s) => String(s).trim()).filter(Boolean);
    return out.length ? out : undefined;
  }
  const t = String(scope).trim();
  return t ? [t] : undefined;
}

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<MembrainResponse<T>> {
  // Get config at runtime
  const { MEMBRAIN_API_KEY, MEMBRAIN_API_URL } = getMembrainConfig();

  if (!MEMBRAIN_API_URL) {
    return {
      success: false,
      error: "Mem-Brain API URL not configured",
    };
  }

  const url = `${MEMBRAIN_API_URL}/api/v1${endpoint}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-API-Key": MEMBRAIN_API_KEY || "",
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data: data as T,
    };
  } catch (error) {
    log("API request failed", { endpoint, error: String(error) });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const membrainClient = {
  async waitForIngestJob(jobId: string): Promise<MembrainResponse<{ memory_id: string; action: "created" | "updated"; memory?: Memory }>> {
    const maxAttempts = 120;
    const delayMs = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const response = await apiRequest<IngestJobStatusResponse>(`/memories/jobs/${jobId}`, {
        method: "GET",
      });

      if (!response.success || !response.data) {
        return {
          success: false,
          error: response.error ?? `Failed to poll ingest job ${jobId}`,
        };
      }

      if (response.data.status === "completed" && response.data.result) {
        return {
          success: true,
          data: response.data.result,
        };
      }

      if (response.data.status === "failed") {
        const error = response.data.error;
        return {
          success: false,
          error: error ? `${error.code}: ${error.message}` : `Ingest job ${jobId} failed`,
        };
      }

      await sleep(delayMs);
    }

    return {
      success: false,
      error: `Timed out waiting for ingest job ${jobId}`,
    };
  },

  async addMemory(
    content: string,
    scope: string[] = [],
    category?: string,
  ): Promise<MembrainResponse<Memory> & { action?: "created" | "updated" }> {
    const body: Record<string, unknown> = {
      content,
    };

    if (scope.length > 0) {
      body.scope = scope;
    }

    if (category) {
      body.category = category;
    }

    const accepted = await apiRequest<IngestJobAcceptedResponse>("/memories", {
      method: "POST",
      body,
    });

    if (!accepted.success || !accepted.data) {
      return {
        success: false,
        error: accepted.error,
      };
    }

    const response = await this.waitForIngestJob(accepted.data.job_id);

    log("addMemory", { success: response.success, id: response.data?.memory_id, action: response.data?.action, category });

    return {
      success: response.success,
      data: response.data?.memory,
      action: response.data?.action,
      error: response.error,
    };
  },

  async searchMemories(
    query: string,
    k: number = 5,
    scope?: string | string[],
  ): Promise<MembrainResponse<SearchResult[]>> {
    const patterns = normalizeScopePatterns(scope);
    const body: Record<string, unknown> = {
      query,
      k,
      response_format: "raw",
    };
    if (patterns) body.scope = patterns;

    const response = await apiRequest<{ results: SearchResult[] }>(
      "/memories/search",
      { method: "POST", body },
    );

    log("searchMemories", {
      success: response.success,
      query: query.slice(0, 50),
      count: response.data?.results?.length,
    });

    return {
      success: response.success,
      data: response.data?.results,
      error: response.error,
    };
  },

  async searchMemoriesResponse(
    query: string,
    k: number = 5,
    responseFormat: ResponseFormat = "raw",
    scope?: string | string[],
  ): Promise<SearchResponseEnvelope> {
    const patterns = normalizeScopePatterns(scope);
    const body: Record<string, unknown> = {
      query,
      k,
      response_format: responseFormat,
    };
    if (patterns) body.scope = patterns;

    const response = await apiRequest<{
      count: number;
      results: SearchResult[];
      interpreted?: import("../types/index.js").InterpretedSummary;
      interpreted_error?: string;
      scope?: string[] | null;
    }>("/memories/search", {
      method: "POST",
      body,
    });

    log("searchMemoriesResponse", {
      success: response.success,
      query: query.slice(0, 50),
      responseFormat,
      count: response.data?.results?.length,
    });

    if (!response.success || !response.data) {
      throw new Error(response.error ?? "Search request failed");
    }

    return {
      count: response.data.count ?? response.data.results?.length ?? 0,
      results: response.data.results ?? [],
      interpreted: response.data.interpreted,
      interpreted_error: response.data.interpreted_error,
      scope: response.data.scope ?? undefined,
    };
  },

  async traverseGraph(
    startMemoryId: string,
    query: string,
    options?: {
      maxHops?: number;
      edgeSimilarityThreshold?: number;
      scope?: string | string[];
    },
  ): Promise<
    MembrainResponse<{
      memories: unknown[];
      traversed_edges: unknown[];
      total_memories?: number;
      total_edges?: number;
    }>
  > {
    const params = new URLSearchParams({
      start_memory_id: startMemoryId,
      query,
      max_hops: String(options?.maxHops ?? 2),
      edge_similarity_threshold: String(options?.edgeSimilarityThreshold ?? 0.7),
    });
    const patterns = normalizeScopePatterns(options?.scope);
    if (patterns) {
      for (const p of patterns) {
        params.append("scope", p);
      }
    }

    const response = await apiRequest<{
      memories: unknown[];
      traversed_edges: unknown[];
      total_memories?: number;
      total_edges?: number;
    }>(`/graph/traverse?${params.toString()}`, { method: "GET" });

    if (!response.success || !response.data) {
      return {
        success: false,
        error: response.error ?? "Traverse failed",
      };
    }

    return {
      success: true,
      data: response.data,
    };
  },

  async getMemory(memoryId: string): Promise<MembrainResponse<Memory>> {
    const response = await apiRequest<{ memory: Memory }>(`/memories/${memoryId}`, {
      method: "GET",
    });

    log("getMemory", { success: response.success, id: memoryId });

    // Extract memory from nested response
    return {
      success: response.success,
      data: response.data?.memory,
      error: response.error,
    };
  },

  async deleteMemory(memoryId: string): Promise<MembrainResponse<void>> {
    const response = await apiRequest<void>(`/memories/${memoryId}`, {
      method: "DELETE",
    });

    log("deleteMemory", { success: response.success, id: memoryId });
    return response;
  },

  async deleteMemories(scope?: string[], category?: string): Promise<MembrainResponse<DeleteResult>> {
    const params = new URLSearchParams();

    if (scope && scope.length > 0) {
      for (const p of scope) {
        params.append("scope", p);
      }
    }

    if (category) {
      params.append("category", category);
    }

    const queryString = params.toString();
    const endpoint = queryString ? `/memories/bulk?${queryString}` : "/memories/bulk";

    const response = await apiRequest<{ deleted_count: number; memory_ids: string[] }>(endpoint, {
      method: "DELETE",
    });

    log("deleteMemories", {
      success: response.success,
      scope: scope?.join(","),
      category,
      deletedCount: response.data?.deleted_count,
    });

    return {
      success: response.success,
      data: response.data
        ? {
            deletedCount: response.data.deleted_count,
            deletedIds: response.data.memory_ids,
          }
        : undefined,
      error: response.error,
    };
  },

  async getStats(): Promise<MembrainResponse<MemoryStats>> {
    const response = await apiRequest<MemoryStats>("/stats", {
      method: "GET",
    });

    log("getStats", { success: response.success });
    return response;
  },
};
