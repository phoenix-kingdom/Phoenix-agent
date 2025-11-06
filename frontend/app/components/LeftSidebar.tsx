'use client';

/**
 * Left Sidebar Component
 * 
 * This component contains:
 * - OpenAI model selection
 * - Temperature control
 * - PDF upload functionality
 * - Settings and options
 */

import { useState, useRef, useEffect } from 'react';

interface LeftSidebarProps {
  onUploadSuccess: (fileId: string, file: File) => void;
  isProcessing: boolean;
  setIsProcessing: (processing: boolean) => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
}

export default function LeftSidebar({
  onUploadSuccess,
  isProcessing,
  setIsProcessing,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
}: LeftSidebarProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [models, setModels] = useState<Array<{ value: string; label: string }>>([
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);

  // Fetch available models from API on component mount
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/models');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.models && data.models.length > 0) {
            // Transform API response to match our format
            const formattedModels = data.models.map((model: { id: string; label: string }) => ({
              value: model.id,
              label: model.label,
            }));
            setModels(formattedModels);
            // Set default model to first one if current selection is not in list
            if (!formattedModels.find((m: { value: string }) => m.value === selectedModel)) {
              setSelectedModel(formattedModels[0].value);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
        // Keep default models on error
      } finally {
        setIsLoadingModels(false);
      }
    };

    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setError('');
        setUploadStatus('');
        
        // Automatically upload and preview the PDF
        // First, show preview immediately
        onUploadSuccess('', selectedFile);
        
        // Then start the upload process
        setIsProcessing(true);
        setUploadStatus('Uploading and processing PDF...');

        const formData = new FormData();
        formData.append('pdf', selectedFile);

        try {
          const response = await fetch('http://localhost:3001/api/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
          }

          const data = await response.json();

          if (data.success) {
            setUploadStatus(`✅ PDF processed successfully! (${data.chunks} chunks)`);
            // Update with actual fileId from backend
            onUploadSuccess(data.fileId, selectedFile);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          } else {
            throw new Error(data.error || 'Upload failed');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to upload PDF');
          setUploadStatus('');
          // Keep preview visible even on error so user can see what they tried to upload
          onUploadSuccess('', selectedFile);
        } finally {
          setIsProcessing(false);
        }
      } else {
        setError('Please select a PDF file');
        setFile(null);
      }
    }
  };


  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header - Responsive */}
      <div className="p-3 sm:p-4 border-b border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800">Settings</h2>
      </div>

      {/* Content - Responsive padding */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            OpenAI Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={isProcessing || isLoadingModels}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoadingModels ? (
              <option>Loading models...</option>
            ) : (
              models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))
            )}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {isLoadingModels ? 'Fetching available models...' : 'Choose the AI model for responses'}
          </p>
        </div>

        {/* Temperature Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Temperature: {temperature.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            disabled={isProcessing}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Precise (0.0)</span>
            <span>Creative (1.0)</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Controls randomness in responses
          </p>
        </div>

        {/* PDF Upload Section */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Upload PDF</h3>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select PDF File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                PDF will be automatically uploaded and previewed when selected
              </p>
            </div>

            {file && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700">📄 {file.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {uploadStatus && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">{uploadStatus}</p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

