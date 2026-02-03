// components/layout/Sidebar.tsx
'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useChatStore } from '@/store/chatStore'
import { listDocuments, deleteDocument } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { 
  FileText, 
  Trash2, 
  Upload, 
  CheckCircle, 
  XCircle,
  Loader2,
  X 
} from 'lucide-react'
import PDFUploader from '@/components/pdf/PDFUploader'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { documents, setDocuments, isIndexed } = useChatStore()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'documents' | 'upload'>('documents')

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    setIsLoading(true)
    try {
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (docId: string, docName: string) => {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return

    try {
      await deleteDocument(docId)
      toast.success('Document deleted')
      loadDocuments()
    } catch (error: any) {
      toast.error('Failed to delete document')
    }
  }

  return (
    <>
      {/* Overlay (Mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}
      >
        {/* Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold">Document Library</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="lg:hidden"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setActiveTab('documents')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === 'documents'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }
            `}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`
              flex-1 px-4 py-3 text-sm font-medium transition-colors
              ${activeTab === 'upload'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
              }
            `}
          >
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'upload' ? (
            <PDFUploader />
          ) : (
            <div className="space-y-3">
              {/* Index Status */}
              <Card className={`p-3 ${isIndexed ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200'}`}>
                <div className="flex items-center gap-2">
                  {isIndexed ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">
                        Index Ready
                      </span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        Not Indexed
                      </span>
                    </>
                  )}
                </div>
              </Card>

              {/* Documents List */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : documents.length === 0 ? (
                <div className="text-center py-8">
                  <Upload className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No documents yet
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Upload PDFs to get started
                  </p>
                </div>
              ) : (
                documents.map((doc) => (
                  <Card key={doc.doc_id} className="p-3 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">
                          {doc.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {doc.num_pages} {doc.num_pages === 1 ? 'page' : 'pages'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.doc_id, doc.name)}
                        className="flex-shrink-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
