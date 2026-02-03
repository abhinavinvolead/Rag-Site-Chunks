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
  availableModels: ModelInfo[]
  availableEmbeddings: EmbeddingModelInfo[]
  setAvailableModels: (models: ModelInfo[], embeddings: EmbeddingModelInfo[]) => void
  
  // UI State
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  
  isSidebarOpen: boolean
  toggleSidebar: () => void
  
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
  availableModels: [],
  availableEmbeddings: [],
  setAvailableModels: (models, embeddings) => set({ 
    availableModels: models,
    availableEmbeddings: embeddings 
  }),
  
  // UI State
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ 
    isSidebarOpen: !state.isSidebarOpen 
  })),
  
  selectedCitation: null,
  setSelectedCitation: (citation) => set({ selectedCitation: citation }),
  
  // Index status
  isIndexed: false,
  setIsIndexed: (indexed) => set({ isIndexed: indexed }),
}))
