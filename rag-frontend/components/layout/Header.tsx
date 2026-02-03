'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Menu, FileText, Trash2, Sparkles } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { toast } from 'react-hot-toast'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { messages, clearMessages, documents } = useChatStore()

  const handleClearChat = () => {
    if (messages.length === 0) return
    
    if (confirm('Are you sure you want to clear the conversation?')) {
      clearMessages()
      toast.success('Conversation cleared')
    }
  }

  return (
    <header className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      <div className="h-full px-4 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Menu Button (Mobile) */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold gradient-text">
                RAG Chatbot
              </h1>
              <p className="text-xs text-gray-500">
                AI-Powered Document Q&A
              </p>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Document Count */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
            <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </span>
          </div>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearChat}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Clear Chat</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
