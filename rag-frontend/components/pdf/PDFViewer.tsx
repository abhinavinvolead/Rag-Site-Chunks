'use client'

import React, { useEffect, useState } from 'react'
import { X, FileText, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useChatStore } from '@/store/chatStore'
import type { Citation } from '@/lib/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PDFViewerProps {
  citation: Citation | null
  onClose: () => void
}

export default function PDFViewer({ citation, onClose }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle Escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  useEffect(() => {
    if (!citation) {
      setPdfUrl(null)
      return
    }

    // Generate highlighted PDF
    const generateHighlightedPDF = async () => {
      setLoading(true)
      setError(null)

      const loadingToast = toast.loading('Generating highlighted PDF...')

      try {
        const formData = new FormData()
        formData.append('doc_id', citation.doc_id)
        formData.append('page', citation.page.toString())
        formData.append('span_start', citation.span_start.toString())
        formData.append('span_end', citation.span_end.toString())

        const response = await fetch(`${API_BASE}/api/documents/highlight`, {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Failed to generate highlighted PDF: ${errorText}`)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
        
        toast.success('PDF loaded successfully!', { id: loadingToast })
      } catch (err: any) {
        console.error('PDF generation error:', err)
        const errorMessage = err.message || 'Failed to load PDF'
        setError(errorMessage)
        toast.error(errorMessage, { id: loadingToast })
      } finally {
        setLoading(false)
      }
    }

    generateHighlightedPDF()

    // Cleanup: revoke object URL when component unmounts or citation changes
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl)
      }
    }
  }, [citation])

  if (!citation) return null

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {citation.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Page {citation.page}, ¶{citation.paragraph_num}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
          aria-label="Close PDF viewer"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* PDF Content */}
      <div className="flex-1 overflow-hidden bg-gray-100 dark:bg-gray-950 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-900 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm text-gray-500">Generating highlighted PDF...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 bg-white dark:bg-gray-900 z-10">
            <div className="text-red-500 text-center max-w-md">
              <p className="font-semibold mb-2">Failed to load PDF</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {pdfUrl && !loading && !error && (
          <iframe
            src={`${pdfUrl}#page=${citation.page}&zoom=page-fit`}
            className="w-full h-full border-0"
            title={`${citation.name} - Page ${citation.page}`}
          />
        )}
      </div>

      {/* Context Preview */}
      {citation.chunk_preview && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 max-h-32 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
            CONTEXT PREVIEW
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {citation.chunk_preview}
          </p>
        </div>
      )}
    </div>
  )
}
