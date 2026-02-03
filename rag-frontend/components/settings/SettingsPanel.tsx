// components/settings/SettingsPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useChatStore } from '@/store/chatStore'
import { updateSettings } from '@/lib/api'
import { toast } from 'react-hot-toast'
import { Settings2, Sparkles, Layers, Sliders, Thermometer, Target, CheckCircle2 } from 'lucide-react'

interface SettingsPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsPanel({ open, onOpenChange }: SettingsPanelProps) {
  const { settings, availableModels, setSettings } = useChatStore()

  const [localSettings, setLocalSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = async () => {
    if (!localSettings) return

    setIsSaving(true)
    try {
      const updated = await updateSettings(localSettings)
      setSettings(updated)
      toast.success('Settings saved successfully!')
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (settings) {
      setLocalSettings(settings)
      toast.success('Settings reset to current values')
    }
  }

  if (!localSettings) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Settings2 className="w-4 h-4 text-white" />
            </div>
            RAG Settings
          </DialogTitle>
          <DialogDescription>
            Configure your AI model and retrieval parameters for optimal performance
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* LLM Model Selection */}
          <Card className="border-2 hover:border-blue-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Language Model
              </CardTitle>
              <CardDescription>
                Choose the AI model that will generate responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={localSettings.llm_model}
                onValueChange={(value) =>
                  setLocalSettings({ ...localSettings, llm_model: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{model.name}</span>
                        <span className="text-xs text-gray-500">{model.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Model Info */}
              {availableModels.find(m => m.id === localSettings.llm_model) && (
                <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {availableModels.find(m => m.id === localSettings.llm_model)?.description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card className="border-2 hover:border-purple-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Thermometer className="w-5 h-5 text-purple-600" />
                Temperature
              </CardTitle>
              <CardDescription>
                Controls randomness in responses (0 = focused, 2 = creative)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current: {localSettings.temperature.toFixed(2)}</span>
                  <span className="text-xs text-gray-500">
                    {localSettings.temperature < 0.3 ? '🎯 Precise' : 
                     localSettings.temperature < 0.7 ? '⚖️ Balanced' : 
                     '🎨 Creative'}
                  </span>
                </div>
                <Slider
                  value={[localSettings.temperature]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, temperature: value })
                  }
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>0.0</span>
                  <span>1.0</span>
                  <span>2.0</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Retrieval Parameters */}
          <Card className="border-2 hover:border-green-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="w-5 h-5 text-green-600" />
                Retrieval Parameters
              </CardTitle>
              <CardDescription>
                Configure how many document chunks to retrieve
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Top K */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Top-K Results</label>
                  <span className="text-sm font-bold text-green-600">{localSettings.top_k}</span>
                </div>
                <Slider
                  value={[localSettings.top_k]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, top_k: value })
                  }
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Number of relevant chunks returned after re-ranking
                </p>
              </div>

              {/* Fetch K */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Fetch-K Candidates</label>
                  <span className="text-sm font-bold text-green-600">{localSettings.fetch_k}</span>
                </div>
                <Slider
                  value={[localSettings.fetch_k]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, fetch_k: value })
                  }
                  min={10}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  Initial candidates fetched before MMR re-ranking
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Chunking Parameters */}
          <Card className="border-2 hover:border-orange-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="w-5 h-5 text-orange-600" />
                Document Chunking
              </CardTitle>
              <CardDescription>
                Control how documents are split into chunks (requires re-indexing)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chunk Size */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Chunk Size</label>
                  <span className="text-sm font-bold text-orange-600">{localSettings.chunk_size} chars</span>
                </div>
                <Slider
                  value={[localSettings.chunk_size]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, chunk_size: value })
                  }
                  min={200}
                  max={2000}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Chunk Overlap */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Chunk Overlap</label>
                  <span className="text-sm font-bold text-orange-600">{localSettings.chunk_overlap} chars</span>
                </div>
                <Slider
                  value={[localSettings.chunk_overlap]}
                  onValueChange={([value]) =>
                    setLocalSettings({ ...localSettings, chunk_overlap: value })
                  }
                  min={0}
                  max={500}
                  step={10}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  ⚠️ Changes to chunking parameters require re-indexing your documents
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card className="border-2 hover:border-gray-300 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sliders className="w-5 h-5 text-gray-600" />
                Advanced Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Maximal Marginal Relevance (MMR)</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Reduces redundancy by diversifying retrieved chunks
                  </p>
                </div>
                <button
                  onClick={() =>
                    setLocalSettings({ ...localSettings, use_mmr: !localSettings.use_mmr })
                  }
                  className={`
                    relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                    ${localSettings.use_mmr ? 'bg-blue-600' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                      ${localSettings.use_mmr ? 'translate-x-6' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="flex-1"
            disabled={isSaving}
          >
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSaving ? (
              <>
                <div className="loading-dots mr-2">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
