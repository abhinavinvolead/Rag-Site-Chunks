'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { User, Sparkles, FileText } from 'lucide-react'
import type { Message } from '@/lib/types'
import { useChatStore } from '@/store/chatStore'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const setSelectedCitation = useChatStore(state => state.setSelectedCitation)
  const isUser = message.role === 'user'

  const handleCitationClick = (citation: any) => {
    setSelectedCitation(citation)
  }

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-in-up`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center shadow-md
          ${isUser 
            ? 'bg-gradient-to-br from-blue-600 to-blue-500' 
            : 'bg-gradient-to-br from-purple-600 to-pink-600'
          }
        `}>
          {isUser ? (
            <User className="w-5 h-5 text-white" />
          ) : (
            <Sparkles className="w-5 h-5 text-white" />
          )}
        </div>
      </div>

      {/* Message Content */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[75%]`}>
        {/* Sender Name */}
        <div className="mb-1.5 px-1">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
          {message.model && !isUser && (
            <span className="text-xs text-gray-400 ml-2">
              • {message.model}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div className={`message-bubble ${isUser ? 'message-user' : 'message-assistant'}`}>
          {isUser ? (
            <p className="text-[15px] leading-relaxed">{message.content}</p>
          ) : (
            <div className="markdown-content text-[15px]">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Citations */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-1 w-full">
              <FileText className="w-3.5 h-3.5" />
              <span>Sources:</span>
            </div>
            {message.citations.map((citation, idx) => (
              <button
                key={idx}
                onClick={() => handleCitationClick(citation)}
                className="citation-badge group"
              >
                <FileText className="w-3 h-3" />
                <span>{citation.name}</span>
                <span className="opacity-75">p.{citation.page}, ¶{citation.paragraph_num}</span>
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <div className="mt-1.5 px-1">
          <span className="text-[11px] text-gray-400">
            {message.timestamp.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    </div>
  )
}
