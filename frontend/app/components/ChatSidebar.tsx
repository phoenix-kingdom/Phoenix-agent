'use client';

/**
 * Chat Sidebar Component
 * 
 * Right sidebar that contains the chat interface
 * Can be toggled open/closed via a floating button
 */

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ pageContent: string; metadata?: { page?: number; loc?: any; [key: string]: any } }>;
}

interface ChatSidebarProps {
  fileId: string | null;
  isProcessing: boolean;
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  setSelectedModel: (model: string) => void;
  temperature: number;
  setTemperature: (temp: number) => void;
  onSourceClick?: (page: number, text?: string) => void;
}

export default function ChatSidebar({
  fileId,
  isProcessing,
  isOpen,
  onClose,
  selectedModel,
  setSelectedModel,
  temperature,
  setTemperature,
  onSourceClick,
}: ChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [models, setModels] = useState<Array<{ value: string; label: string }>>([
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const response = await fetch('http://localhost:3001/api/models');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.models && data.models.length > 0) {
            const formattedModels = data.models.map((model: { id: string; label: string }) => ({
              value: model.id,
              label: model.label,
            }));
            setModels(formattedModels);
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !fileId || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create placeholder for streaming response
    const assistantMessageId = Date.now().toString();
    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      sources: undefined,
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Use streaming endpoint
      const response = await fetch('http://localhost:3001/api/chat?stream=true', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify({
          question: userMessage.content,
          fileId: fileId,
          model: selectedModel,
          temperature: temperature,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';

      if (!reader) {
        throw new Error('Stream reader not available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'token' && data.content) {
                accumulatedContent += data.content;
                // Update message in real-time
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: accumulatedContent,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'done') {
                // Final message with sources
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  if (updated[lastIndex]?.role === 'assistant') {
                    updated[lastIndex] = {
                      ...updated[lastIndex],
                      content: data.answer || accumulatedContent,
                      sources: data.sources || undefined,
                    };
                  }
                  return updated;
                });
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      // Remove the placeholder message and add error
      setMessages((prev) => {
        const updated = prev.slice(0, -1);
        updated.push({
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to process your question'}`,
        });
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="h-full bg-white border-l border-gray-200 flex flex-col">
      {/* Header - Responsive */}
      <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Chat with AI</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors group"
              aria-label="Toggle settings"
              title="Toggle settings"
            >
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors group"
              aria-label="Close chat"
              title="Close chat"
            >
              <svg
                className="w-5 h-5 text-gray-600 group-hover:text-gray-800"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Settings Panel - Collapsible */}
        {showSettings && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
            {/* Model Selection */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Model
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={isProcessing || isLoadingModels || isLoading}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              >
                {isLoadingModels ? (
                  <option>Loading...</option>
                ) : (
                  models.map((model) => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Temperature Control */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Temperature: {temperature.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                disabled={isProcessing || isLoading}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-0.5">
                <span>0.0</span>
                <span>1.0</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Messages - Responsive */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {messages.length === 0 && fileId && (
          <div className="text-center text-gray-500 mt-8">
            <p>Ask a question about your PDF!</p>
          </div>
        )}

        {!fileId && (
          <div className="text-center text-gray-500 mt-8">
            <p>Upload a PDF first to start chatting</p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-2`}
          >
            {/* Bot Avatar - only show for assistant messages */}
            {message.role === 'assistant' && (
              <div className="flex-shrink-0 mt-1">
                <Image
                  src="/bot_avatar.jpg"
                  alt="Phoenix Bot"
                  width={32}
                  height={32}
                  className="rounded-full w-8 h-8"
                />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 border-t border-gray-300 pt-3">
                  <div className="mb-2">
                    <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wide">
                      📚 Sources ({message.sources.length})
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">Click any source to navigate and highlight in PDF</p>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {message.sources.map((source, idx) => {
                      const pageNumber = source.metadata?.page || source.metadata?.loc?.pageNumber;
                      const hasPage = pageNumber !== undefined && pageNumber !== null;
                      
                      // Extract text for highlighting - use the precise snippet from source
                      // Source already contains a precise snippet (first sentence, 50 chars max)
                      const textToHighlight = source.pageContent
                        .replace(/\[.*?\]/g, '') // Remove [Chunk X] markers if any
                        .trim();
                      
                      return (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-lg border-2 transition-all ${
                            hasPage 
                              ? 'bg-yellow-50 border-yellow-300 hover:bg-yellow-100 hover:border-yellow-400 cursor-pointer shadow-sm hover:shadow-md' 
                              : 'bg-gray-100 border-gray-300'
                          }`}
                          onClick={() => {
                            if (onSourceClick) {
                              onSourceClick(pageNumber || 1, textToHighlight || source.pageContent.substring(0, 30));
                            }
                          }}
                          title={hasPage ? `Click to jump to page ${pageNumber} and highlight text` : 'No page information available'}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1">
                              <p className="opacity-95 text-xs leading-relaxed whitespace-pre-wrap break-words bg-white p-2 rounded border border-gray-200 font-sans">
                                {source.pageContent}
                              </p>
                            </div>
                            {hasPage && (
                              <button className="flex-shrink-0 px-2.5 py-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-md text-xs font-bold shadow-sm transition-colors">
                                📄 Page {pageNumber}
                              </button>
                            )}
                          </div>
                          {hasPage && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-xs text-yellow-700 font-semibold">
                                ✨ Click to highlight and navigate
                              </span>
                              {textToHighlight && (
                                <span className="text-xs text-gray-500 italic">
                                  (Will highlight: "{textToHighlight}...")
                                </span>
                              )}
                            </div>
                          )}
                          {!hasPage && source.metadata?.query && (
                            <p className="text-xs text-gray-500 mt-1 italic">
                              Query: "{source.metadata.query}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start items-start gap-2">
            <div className="flex-shrink-0 mt-1">
              <Image
                src="/bot_avatar.jpg"
                alt="Phoenix Bot"
                width={32}
                height={32}
                className="rounded-full w-8 h-8"
              />
            </div>
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Responsive */}
      <div className="p-3 sm:p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={fileId ? 'Ask a question about your PDF...' : 'Upload a PDF first...'}
              disabled={!fileId || isLoading || isProcessing}
              className="w-full resize-none rounded-xl border-2 border-gray-300 bg-white text-gray-800 px-4 py-3 pr-12 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 text-sm shadow-sm transition-all"
              rows={2}
            />
            {/* Send button inside textarea */}
            <button
              onClick={handleSend}
              disabled={!fileId || !input.trim() || isLoading || isProcessing}
              className="absolute right-2 bottom-2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
              title="Send message"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 ml-1">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

