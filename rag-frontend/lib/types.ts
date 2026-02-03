// lib/types.ts

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: Date
  model?: string
}

export interface Citation {
  doc_id: string
  name: string
  page: number
  paragraph_num: number
  span_start: number
  span_end: number
  chunk_preview: string
  source_path?: string
}

export interface ModelInfo {
  id: string
  name: string
  description: string
  provider: string
  context_window?: number
  recommended_temp?: number
}

export interface EmbeddingModelInfo {
  id: string
  name: string
  dimensions: number
  provider: string
}

export interface Settings {
  llm_model: string
  embedding_model: string
  chunk_size: number
  chunk_overlap: number
  top_k: number
  fetch_k: number
  temperature: number
  use_mmr: boolean
}

export interface DocumentInfo {
  doc_id: string
  name: string
  num_pages: number
  source_path: string
  indexed_at?: string
}

export interface ChatRequest {
  query: string
  llm_model?: string
  temperature?: number
  top_k?: number
  stream?: boolean
}

export interface IndexRequest {
  chunk_size?: number
  chunk_overlap?: number
  embedding_model?: string
  force_reindex?: boolean
}
