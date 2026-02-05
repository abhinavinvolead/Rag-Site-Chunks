import { create } from 'zustand'
import type { Message, Settings, ModelInfo, DocumentInfo, EmbeddingModelInfo } from '@/lib/types'

interface ChatStore {
  // Messages
  messages: Message[]
  addMessage: (message: Message) => void
  updateLastMessage: (content: string) => void
  clearMessages: () => void
  
  // Documents
  documents: DocumentInfo[]
  setDocuments: (docs: DocumentInfo[]) => void
  
  // Settings
  settings: Settings | null
  setSettings: (settings: Settings) => void
  
  // Models
  // full list as returned by the backend
  allAvailableModels: ModelInfo[]
  availableModels: ModelInfo[]
  availableEmbeddings: EmbeddingModelInfo[]
  setAvailableModels: (models: ModelInfo[], embeddings: EmbeddingModelInfo[]) => void
  
  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  isSidebarOpen: boolean
  toggleSidebar: () => void
  
  // Mode: 'groq' (LLM) | 'rag' (retrieval-augmented)
  mode: 'groq' | 'rag'
  setMode: (m: 'groq' | 'rag') => void
  
  selectedCitation: any | null
  setSelectedCitation: (citation: any) => void
  
  // Index status
  isIndexed: boolean
  setIsIndexed: (indexed: boolean) => void
}

export const useChatStore = create<ChatStore>((set) => ({
  // Messages
  messages: [],
  addMessage: (message) => set((state) => ({ 
    messages: [...state.messages, message] 
  })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages]
    if (messages.length > 0) {
      messages[messages.length - 1].content += content
    }
    return { messages }
  }),
  clearMessages: () => set({ messages: [] }),
  
  // Documents
  documents: [],
  setDocuments: (docs) => set({ documents: docs }),
  
  // Settings
  settings: null,
  setSettings: (settings) => set({ settings }),
  
  // Models
  allAvailableModels: [],
  availableModels: [],
  availableEmbeddings: [],
  setAvailableModels: (models, embeddings) => set((state) => {
    // Apply current mode filter immediately when setting models
    const filtered = state.mode === 'groq'
      ? models.filter(m => (m.provider || '').toLowerCase() === 'groq')
      : models.filter(m => (m.provider || '').toLowerCase() !== 'groq')

    return {
      allAvailableModels: models,
      availableModels: filtered,
      availableEmbeddings: embeddings,
    }
  }),
  
  // UI State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),

  mode: 'groq',
  setMode: (m) => set((state) => {
    // Update available models according to the selected mode
    const all = state.allAvailableModels || []
    const filtered = m === 'groq'
      ? all.filter(x => (x.provider || '').toLowerCase() === 'groq')
      : all.filter(x => (x.provider || '').toLowerCase() !== 'groq')

    // pick a default model id for the mode
    // GROQ always uses the fixed Llama model id; RAG picks the first available non-groq model
    const defaultModelId = m === 'groq'
      ? 'llama-3.3-70b-versatile'
      : (filtered.length > 0 ? filtered[0].id : (state.settings?.llm_model || ''))

    return {
      mode: m,
      isSidebarOpen: m === 'rag' ? true : false,
      availableModels: filtered,
      settings: state.settings ? { ...state.settings, llm_model: defaultModelId } : state.settings,
    }
  }),
  
  selectedCitation: null,
  setSelectedCitation: (citation) => set({ selectedCitation: citation }),
  
  // Index status
  isIndexed: false,
  setIsIndexed: (indexed) => set({ isIndexed: indexed }),
}))
