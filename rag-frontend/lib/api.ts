import axios from 'axios'
import type { 
  ModelInfo, 
  Settings, 
  DocumentInfo, 
  ChatRequest, 
  IndexRequest,
  EmbeddingModelInfo 
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ==================== Settings ====================

export async function getAvailableModels(): Promise<{
  llm_models: ModelInfo[]
  embedding_models: EmbeddingModelInfo[]
}> {
  const { data } = await api.get('/api/settings/models')
  return data
}

export async function getSettings(): Promise<Settings> {
  const { data } = await api.get('/api/settings')
  return data
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const { data } = await api.post('/api/settings', settings)
  return data
}

export async function resetSettings(): Promise<void> {
  await api.get('/api/settings/reset')
}

// ==================== Documents ====================

export async function uploadDocuments(files: File[]): Promise<{
  message: string
  files: Array<{ filename: string; size_mb: number }>
}> {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))

  const { data } = await api.post('/api/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function indexDocuments(request?: IndexRequest): Promise<{
  total_documents: number
  total_chunks: number
  embedding_model: string
  status: string
}> {
  const { data } = await api.post('/api/documents/index', request || {})
  return data
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const { data } = await api.get('/api/documents')
  return data
}

export async function deleteDocument(docId: string): Promise<void> {
  await api.delete(`/api/documents/${docId}`)
}

export async function getIndexStatus(): Promise<{
  indexed: boolean
  message: string
  embedding_model?: string
}> {
  const { data } = await api.get('/api/documents/status')
  return data
}

// ==================== Chat ====================

export interface StreamCallbacks {
  onToken: (token: string) => void
  onCitations: (citations: any[]) => void
  onDone: (data: any) => void
  onError: (error: string) => void
}

export function streamChat(request: ChatRequest, callbacks: StreamCallbacks): () => void {
  const params = new URLSearchParams({
    query: request.query,
    ...(request.llm_model && { llm_model: request.llm_model }),
    ...(request.temperature !== undefined && { temperature: request.temperature.toString() }),
    ...(request.top_k && { top_k: request.top_k.toString() }),
  })

  const eventSource = new EventSource(
    `${API_BASE}/api/chat/stream?${params.toString()}`
  )

  eventSource.addEventListener('token', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onToken(data.token)
    } catch (e) {
      console.error('Failed to parse token:', e)
    }
  })

  eventSource.addEventListener('citations', (event) => {
    try {
      const citations = JSON.parse(event.data)
      callbacks.onCitations(citations)
    } catch (e) {
      console.error('Failed to parse citations:', e)
    }
  })

  eventSource.addEventListener('done', (event) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onDone(data)
      eventSource.close()
    } catch (e) {
      console.error('Failed to parse done event:', e)
      eventSource.close()
    }
  })

  eventSource.addEventListener('error', (event: any) => {
    try {
      const data = JSON.parse(event.data)
      callbacks.onError(data.error)
    } catch (e) {
      callbacks.onError('Connection error')
    }
    eventSource.close()
  })

  eventSource.onerror = () => {
    callbacks.onError('Connection lost')
    eventSource.close()
  }

  // Return cleanup function
  return () => eventSource.close()
}

export async function chatNonStreaming(request: ChatRequest): Promise<{
  answer: string
  citations: any[]
  model_used: string
  query: string
}> {
  const { data } = await api.post('/api/chat', request)
  return data
}

// ==================== Health ====================

export async function healthCheck(): Promise<{ status: string; version: string }> {
  const { data } = await api.get('/api/health')
  return data
}
