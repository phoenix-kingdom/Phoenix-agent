'use client';

// Import React hooks - useState and useEffect for state management and cleanup
import { useState, useEffect } from 'react';
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
  
  // State for chat sidebar width (resizable)
  // Load saved width from localStorage or use default
  const [chatWidth, setChatWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('chatSidebarWidth');
      return saved ? parseInt(saved, 10) : 384;
    }
    return 384; // Default: 384px (w-96)
  });
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Detect desktop viewport
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Save chat width to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('chatSidebarWidth', chatWidth.toString());
    }
  }, [chatWidth]);

  // State for AI settings
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo');
  const [temperature, setTemperature] = useState(0.7);

  // State for PDF file info (for preview)
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    // Cleanup function: revoke the object URL when component unmounts or fileUrl changes
    return () => {
      if (fileUrl) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [fileUrl]); // Re-run cleanup when fileUrl changes

  // Handle file upload success - also store file info for preview
  const handleUploadSuccess = (id: string, file: File) => {
    // Only update fileId if it's not empty (empty means just preview, not processed yet)
    if (id) {
      setFileId(id);
    }
    
    // Revoke previous object URL before creating a new one to prevent memory leaks
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
    }
    
    // Always update preview URL and filename
    // Create object URL for preview
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    setFileName(file.name);
  };

  // Handle chat sidebar resize
  useEffect(() => {
    if (!isDesktop) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Calculate new width based on mouse position
      // Chat sidebar is on the right, so we calculate from the right edge
      const newWidth = window.innerWidth - e.clientX;
      
      // Constrain width between min and max values
      const minWidth = 280; // Minimum width for usability
      const maxWidth = Math.min(800, window.innerWidth * 0.6); // Max 60% of screen or 800px
      
      setChatWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, isDesktop]);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header - Responsive */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
          <Image
            src="/logo.jpg"
            alt="PDF Chatbot Logo"
            width={32}
            height={32}
            className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
            priority
          />
          <div>
            <h1 className="text-base sm:text-lg md:text-xl font-bold text-gray-800">PDF Chatbot</h1>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">AI-powered document assistant</p>
          </div>
        </div>
      </header>

      {/* Main Content Area - Responsive Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Sidebar - Settings & Upload - Hidden on mobile when chat is open */}
        {/* Made much narrower to maximize PDF preview space */}
        <div className={`${isChatOpen ? 'hidden md:flex' : 'flex'} w-full md:w-56 lg:w-64 flex-shrink-0 flex-col h-full md:h-auto`}>
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

        {/* Middle Section - PDF Preview - Hidden on mobile when chat is open */}
        {/* Set to 95% width for better readability and proper left alignment */}
        <div className={`${isChatOpen ? 'hidden md:flex' : 'flex'} flex-1 overflow-hidden`}>
          <div className="w-[95%] h-full">
            <PDFPreview
              fileId={fileId}
              fileUrl={fileUrl}
              fileName={fileName}
            />
          </div>
        </div>

        {/* Right Sidebar - Chat - Full screen on mobile, resizable sidebar on desktop */}
        {isChatOpen && (
          <>
            {/* Chat Sidebar with flexible width */}
            <div 
              className="fixed md:relative inset-0 md:inset-auto flex-shrink-0 z-50 md:z-auto relative"
              style={{ 
                width: isDesktop ? `${chatWidth}px` : '100%'
              }}
            >
              {/* Resize handle - only visible on desktop, positioned on left edge */}
              {isDesktop && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-20 flex items-center justify-center group"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsResizing(true);
                  }}
                  title="Drag to resize chat"
                >
                  {/* Visual resize indicator */}
                  <div className="w-1 h-20 bg-gray-300 group-hover:bg-blue-500 rounded-full transition-colors" />
                </div>
              )}
              
              <ChatSidebar
                fileId={fileId}
                isProcessing={isProcessing}
                isOpen={isChatOpen}
                onClose={() => setIsChatOpen(false)}
                selectedModel={selectedModel}
                temperature={temperature}
              />
            </div>
          </>
        )}
      </div>

      {/* Floating Chat Button - Responsive positioning */}
      <ChatButton
        onClick={() => setIsChatOpen(!isChatOpen)}
        isOpen={isChatOpen}
      />
    </div>
  );
}
