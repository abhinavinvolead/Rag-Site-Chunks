// app/chat/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatInterface from '@/components/chat/ChatInterface'
import { useChatStore } from '@/store/chatStore'
import { getSettings, getAvailableModels, listDocuments, getIndexStatus } from '@/lib/api'
import { toast } from 'react-hot-toast'

export default function ChatPage() {
  const router = useRouter()
  const { setSettings, setAvailableModels, setDocuments, setIsIndexed } = useChatStore()

  useEffect(() => {
    // Check disclaimer acceptance (session-based, not permanent)
    const hasAccepted = sessionStorage.getItem('disclaimer-accepted')
    if (hasAccepted !== 'true') {
      router.push('/')
      return
    }

    // Load initial data
    const loadData = async () => {
      try {
        // Load settings
        const settings = await getSettings()
        setSettings(settings)

        // Load available models
        const { llm_models, embedding_models } = await getAvailableModels()
        setAvailableModels(llm_models, embedding_models)

        // Load documents
        const docs = await listDocuments()
        setDocuments(docs)

        // Check index status
        const status = await getIndexStatus()
        setIsIndexed(status.indexed)

        if (!status.indexed && docs.length > 0) {
          toast('Please index your documents before chatting', {
            icon: '📚',
            duration: 4000,
          })
        }
      } catch (error: any) {
        console.error('Failed to load initial data:', error)
        toast.error('Failed to connect to backend')
      }
    }

    loadData()
  }, [router, setSettings, setAvailableModels, setDocuments, setIsIndexed])

  return <ChatInterface />
}
