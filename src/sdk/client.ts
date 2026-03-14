export interface SearchRequest {
  query: string;
  topK?: number;
  threshold?: number;
  source?: string;
  mode?: 'vector' | 'text' | 'hybrid';
}

export interface SearchResultItem {
  content: string;
  source: string;
  similarity: number;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  mode: string;
  count: number;
  results: SearchResultItem[];
}

export interface HealthResponse {
  status: string;
  documents: number;
}

export class SemanticSearchClient {
  private readonly baseUrl: string;

  constructor(baseUrl = 'http://localhost:3420') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const res = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Search failed (${res.status}): ${error}`);
    }

    return res.json() as Promise<SearchResponse>;
  }

  async getContext(query: string, topK = 3): Promise<string> {
    const response = await this.search({ query, topK, mode: 'hybrid' });
    return response.results.map((r) => r.content).join('\n\n---\n\n');
  }

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`);
    return res.json() as Promise<HealthResponse>;
  }
}
