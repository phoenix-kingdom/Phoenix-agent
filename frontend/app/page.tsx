'use client';

// Import React hooks - useState allows us to manage component state
import { useState } from 'react';
// Import Next.js Image component for optimized images
import Image from 'next/image';
// Import our custom components
import LeftSidebar from './components/LeftSidebar';
import PDFPreview from './components/PDFPreview';
import ChatSidebar from './components/ChatSidebar';
import ChatButton from './components/ChatButton';

/**
 * Main Home Page Component
 * 
 * Three-part layout:
 * - Left Sidebar: Settings, model selection, temperature, upload
 * - Middle: PDF preview
 * - Right Sidebar: Chat interface (toggleable)
 */
export default function Home() {
  // State to store the file ID returned from the backend after PDF upload
  const [fileId, setFileId] = useState<string | null>(null);
  
  // State to track if a PDF is currently being processed
  const [isProcessing, setIsProcessing] = useState(false);

  // State for chat sidebar visibility
  const [isChatOpen, setIsChatOpen] = useState(false);

  // State for AI settings
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [temperature, setTemperature] = useState(0.7);

  // State for PDF file info (for preview)
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Handle file upload success - also store file info for preview
  const handleUploadSuccess = (id: string, file: File) => {
    setFileId(id);
    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Image
            src="/logo.jpg"
            alt="PDF Chatbot Logo"
            width={40}
            height={40}
            className="rounded-full"
            priority
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800">PDF Chatbot</h1>
            <p className="text-sm text-gray-500">AI-powered document assistant</p>
          </div>
        </div>
      </header>

      {/* Main Content Area - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Settings & Upload */}
        <div className="w-80 flex-shrink-0">
          <LeftSidebar
            onUploadSuccess={handleUploadSuccess}
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            temperature={temperature}
            setTemperature={setTemperature}
          />
        </div>

        {/* Middle Section - PDF Preview */}
        <div className="flex-1 overflow-hidden">
          <PDFPreview
            fileId={fileId}
            fileUrl={fileUrl}
            fileName={fileName}
          />
        </div>

        {/* Right Sidebar - Chat (conditional rendering) */}
        {isChatOpen && (
          <div className="w-96 flex-shrink-0">
            <ChatSidebar
              fileId={fileId}
              isProcessing={isProcessing}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
              selectedModel={selectedModel}
              temperature={temperature}
            />
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <ChatButton
        onClick={() => setIsChatOpen(!isChatOpen)}
        isOpen={isChatOpen}
      />
    </div>
  );
}
