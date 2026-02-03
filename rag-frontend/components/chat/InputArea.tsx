'use client'

import React, { useState, useRef, KeyboardEvent } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, Loader2, Settings2 } from 'lucide-react'
import { useChatStore } from '@/store/chatStore'
import { streamChat } from '@/lib/api'
import { toast } from 'react-hot-toast'

interface InputAreaProps {
  onSettingsClick: () => void
}

export default function InputArea({ onSettingsClick }: InputAreaProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { addMessage, updateLastMessage, setIsLoading, isLoading, settings } = useChatStore()

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input.trim(),
      timestamp: new Date(),
    }

    addMessage(userMessage)
    setInput('')
    setIsLoading(true)

    // Create assistant message placeholder
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: '',
      timestamp: new Date(),
      citations: [],
    }
    addMessage(assistantMessage)

    try {
      const cleanup = streamChat(
        {
          query: userMessage.content,
          llm_model: settings?.llm_model,
          temperature: settings?.temperature,
          top_k: settings?.top_k,
          stream: true,
        },
        {
          onToken: (token) => {
            updateLastMessage(token)
          },
          onCitations: (citations) => {
            // Update citations in the last message
            const messages = useChatStore.getState().messages
            const lastMessage = messages[messages.length - 1]
            if (lastMessage) {
              lastMessage.citations = citations
            }
          },
          onDone: (data) => {
            setIsLoading(false)
            // Update model info in last message
            const messages = useChatStore.getState().messages
            const lastMessage = messages[messages.length - 1]
            if (lastMessage) {
              lastMessage.model = data.model
            }
          },
          onError: (error) => {
            setIsLoading(false)
            toast.error(`Error: ${error}`)
          },
        }
      )

      // Store cleanup function if needed
      return cleanup
    } catch (error: any) {
      setIsLoading(false)
      toast.error(error.message || 'Failed to send message')
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Input Container */}
          <div className="relative flex items-end gap-3">
            {/* Textarea */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your documents..."
                className="min-h-[56px] max-h-[200px] pr-12 resize-none 
                          shadow-sm hover:shadow-md focus:shadow-lg
                          transition-shadow duration-200"
                disabled={isLoading}
              />
              
              {/* Character Count */}
              <div className="absolute bottom-2 right-3 text-xs text-gray-400">
                {input.length}/2000
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {/* Settings Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={onSettingsClick}
                className="h-[56px] w-[56px] rounded-xl btn-hover-lift"
                disabled={isLoading}
              >
                <Settings2 className="w-5 h-5" />
              </Button>

              {/* Send Button */}
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="h-[56px] w-[56px] rounded-xl
                          bg-gradient-to-r from-blue-600 to-purple-600 
                          hover:from-blue-700 hover:to-purple-700
                          disabled:opacity-50 disabled:cursor-not-allowed
                          shadow-md hover:shadow-lg
                          transition-all duration-200 btn-hover-lift"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          {/* Helper Text */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <p>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                Enter
              </kbd>
              <span className="ml-2">to send</span>
              <span className="mx-2">•</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-700">
                Shift + Enter
              </kbd>
              <span className="ml-2">for new line</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
