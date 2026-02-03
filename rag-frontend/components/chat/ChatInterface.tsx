// components/chat/ChatInterface.tsx (Updated)
'use client'

import React, { useState } from 'react'
import Header from '@/components/layout/Header'
import Sidebar from '@/components/layout/Sidebar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import SettingsPanel from '@/components/settings/SettingsPanel'
import PDFViewer from '@/components/pdf/PDFViewer'
import { useChatStore } from '@/store/chatStore'

export default function ChatInterface() {
  const [showSidebar, setShowSidebar] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const selectedCitation = useChatStore(state => state.selectedCitation)
  const setSelectedCitation = useChatStore(state => state.setSelectedCitation)

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuClick={() => setShowSidebar(true)} />

        {/* Chat Area with PDF Viewer */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Chat Messages */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
            selectedCitation ? 'hidden md:flex md:w-1/2' : 'w-full'
          }`}>
            <MessageList />
            <InputArea onSettingsClick={() => setShowSettings(true)} />
          </div>

          {/* PDF Viewer - Slides in from right or takes full screen on mobile */}
          {selectedCitation && (
            <div className="absolute inset-0 md:relative md:inset-auto w-full md:w-1/2 lg:w-[600px] animate-slide-in-right z-20 md:z-auto">
              <PDFViewer 
                citation={selectedCitation} 
                onClose={() => setSelectedCitation(null)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsPanel open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}
