// components/pdf/PDFUploader.tsx
'use client'

import React, { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { uploadDocuments, indexDocuments, listDocuments, getIndexStatus } from '@/lib/api'
import { useChatStore } from '@/store/chatStore'
import { toast } from 'react-hot-toast'
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function PDFUploader() {
  const { setDocuments, setIsIndexed, settings } = useChatStore()
  const [isUploading, setIsUploading] = useState(false)
  const [isIndexing, setIsIndexing] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([])

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const pdfFiles = acceptedFiles.filter(file => file.type === 'application/pdf')
    
    if (pdfFiles.length === 0) {
      toast.error('Please upload PDF files only')
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadDocuments(pdfFiles)
      setUploadedFiles(result.files)
      toast.success(`Uploaded ${result.files.length} file(s)`)
      
      // Refresh document list
      const docs = await listDocuments()
      setDocuments(docs)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [setDocuments])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  })

  const handleIndex = async () => {
    setIsIndexing(true)
    try {
      const result = await indexDocuments({
        chunk_size: settings?.chunk_size,
        chunk_overlap: settings?.chunk_overlap,
        embedding_model: settings?.embedding_model,
      })
      
      toast.success(
        `Indexed ${result.total_documents} document(s) into ${result.total_chunks} chunks!`
      )
      
      // Update index status
      const status = await getIndexStatus()
      setIsIndexed(status.indexed)
      
      setUploadedFiles([])
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Indexing failed')
    } finally {
      setIsIndexing(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <Card
        {...getRootProps()}
        className={`
          border-2 border-dashed cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="p-8 text-center">
          {isUploading ? (
            <div className="space-y-3">
              <Loader2 className="w-12 h-12 mx-auto text-blue-600 animate-spin" />
              <p className="text-sm font-medium text-gray-600">Uploading files...</p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <p className="text-lg font-semibold mb-2">
                {isDragActive ? 'Drop PDFs here...' : 'Upload PDF Documents'}
              </p>
              <p className="text-sm text-gray-500">
                Drag & drop or click to select files
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Multiple PDFs supported • Max 50MB per file
              </p>
            </>
          )}
        </div>
      </Card>

      {/* Uploaded Files Preview */}
      {uploadedFiles.length > 0 && (
        <Card className="p-4 border-2 border-green-200 bg-green-50 dark:bg-green-950/20">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Files uploaded successfully!
              </p>
              {uploadedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                  <FileText className="w-3 h-3" />
                  <span>{file.filename}</span>
                  <span className="text-green-600">({file.size_mb} MB)</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Index Button */}
      {uploadedFiles.length > 0 && (
        <Button
          onClick={handleIndex}
          disabled={isIndexing}
          className="w-full h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-md"
        >
          {isIndexing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Indexing Documents...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Build Index
            </>
          )}
        </Button>
      )}

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <p className="font-semibold">How it works:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Upload one or more PDF files</li>
              <li>Click "Build Index" to process and embed documents</li>
              <li>Start asking questions about your PDFs!</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  )
}
