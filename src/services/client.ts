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

  async addMemory(content: string, tags: string[] = [], category?: string): Promise<MembrainResponse<Memory> & { action?: "created" | "updated" }> {
    const body: Record<string, unknown> = {
      content,
      tags,
    };
    
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
    keywordFilter?: string | string[],
  ): Promise<MembrainResponse<SearchResult[]>> {
    const body: Record<string, unknown> = {
      query,
      k,
      response_format: "raw",
    };
    if (keywordFilter) body.keyword_filter = keywordFilter;

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
    keywordFilter?: string | string[],
    responseFormat: ResponseFormat = "raw",
  ): Promise<SearchResponseEnvelope> {
    const body: Record<string, unknown> = {
      query,
      k,
      response_format: responseFormat,
    };

    if (keywordFilter) {
      body.keyword_filter = keywordFilter;
    }

    const response = await apiRequest<{
      count: number;
      results: SearchResult[];
      interpreted?: import("../types/index.js").InterpretedSummary;
      interpreted_error?: string;
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

  async deleteMemories(tags?: string[], category?: string): Promise<MembrainResponse<DeleteResult>> {
    // Build query parameters for filter-based deletion
    const params = new URLSearchParams();
    
    if (tags && tags.length > 0) {
      params.append("tags", tags.join(","));
    }
    
    if (category) {
      params.append("category", category);
    }
    
    const queryString = params.toString();
    const endpoint = queryString ? `/memories?${queryString}` : "/memories";
    
    const response = await apiRequest<{ deleted_count: number; memory_ids: string[] }>(endpoint, {
      method: "DELETE",
    });
    
    log("deleteMemories", { 
      success: response.success, 
      tags: tags?.join(','),
      category,
      deletedCount: response.data?.deleted_count 
    });
    
    return {
      success: response.success,
      data: response.data ? {
        deletedCount: response.data.deleted_count,
        deletedIds: response.data.memory_ids,
      } : undefined,
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
