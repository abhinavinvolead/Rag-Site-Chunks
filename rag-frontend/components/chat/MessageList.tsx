'use client'

import React, { useRef, useEffect } from 'react'
import { useChatStore } from '@/store/chatStore'
import MessageBubble from './MessageBubble'
import { Loader2 } from 'lucide-react'

export default function MessageList() {
  const messages = useChatStore(state => state.messages)
  const isLoading = useChatStore(state => state.isLoading)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.length === 0 && !isLoading ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md animate-fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3 gradient-text">
              Ready to assist you
            </h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Upload your PDF documents and ask me anything. I'll provide detailed answers with exact page citations.
            </p>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          
          {isLoading && (
            <div className="flex gap-4 mb-6 animate-slide-in-up">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-600 shadow-md">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <div className="mb-1.5 px-1">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                    AI Assistant
                  </span>
                </div>
                <div className="message-bubble message-assistant">
                  <div className="loading-dots text-gray-400">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
