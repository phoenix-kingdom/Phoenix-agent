'use client';

/**
 * Chat Interface Component
 * 
 * This component handles:
 * - Displaying chat messages (user questions and AI responses)
 * - Sending questions to the backend API
 * - Receiving and displaying AI responses
 * - Showing source citations from the PDF
 * - Auto-scrolling to latest message
 */

// Import React hooks
// useState: Manages component state (messages, input text, loading state)
// useRef: Reference to DOM element for auto-scrolling
// useEffect: Runs code when component updates (like when messages change)
import { useState, useRef, useEffect } from 'react';

/**
 * Message Type Definition
 * 
 * This defines the structure of a chat message
 */
interface Message {
  role: 'user' | 'assistant'; // Who sent the message
  content: string; // The message text
  sources?: Array<{ // Optional: sources from the PDF (for assistant messages)
    pageContent: string; // The text chunk from PDF
    metadata?: any; // Additional metadata about the source
  }>;
}

/**
 * Props Interface - defines what props this component receives
 */
interface ChatInterfaceProps {
  fileId: string | null; // ID of the uploaded PDF (null if no PDF uploaded)
  isProcessing: boolean; // Whether a PDF is currently being processed
}

/**
 * ChatInterface Component
 * 
 * @param fileId - The ID of the uploaded PDF (from backend)
 * @param isProcessing - Whether PDF is being processed
 */
export default function ChatInterface({ fileId, isProcessing }: ChatInterfaceProps) {
  // State: Array of all chat messages
  // Each message has: role (user/assistant), content, and optional sources
  const [messages, setMessages] = useState<Message[]>([]);
  
  // State: The current text in the input field
  const [input, setInput] = useState('');
  
  // State: Whether we're waiting for a response from the backend
  const [isLoading, setIsLoading] = useState(false);
  
  // Ref: Reference to the bottom of the messages container
  // We use this to auto-scroll to the latest message
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * useEffect Hook - Auto-scroll to bottom when messages change
   * 
   * useEffect runs code after the component renders
   * The dependency array [messages] means it runs whenever messages change
   */
  useEffect(() => {
    // Scroll to the bottom element smoothly
    // ?. is optional chaining - only call if messagesEndRef.current exists
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // Re-run when messages array changes

  /**
   * handleSend - Sends a question to the backend and gets AI response
   * 
   * This function:
   * 1. Validates the input
   * 2. Adds the user message to the chat
   * 3. Sends request to backend API
   * 4. Adds the AI response to the chat
   * 5. Handles errors gracefully
   */
  const handleSend = async () => {
    // Validation: Don't send if input is empty, no fileId, or already loading
    if (!input.trim() || !fileId || isLoading) return;

    // Create a user message object
    const userMessage: Message = {
      role: 'user', // This is from the user
      content: input.trim(), // Remove leading/trailing whitespace
    };

    // Add user message to the messages array
    // setMessages with a function gets the previous state (prev)
    // Spread operator (...) creates a new array with old messages + new message
    setMessages((prev) => [...prev, userMessage]);
    
    // Clear the input field
    setInput('');
    
    // Set loading state (shows loading indicator)
    setIsLoading(true);

    try {
      // Send POST request to backend chat endpoint
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST', // HTTP method
        headers: {
          'Content-Type': 'application/json', // Tell server we're sending JSON
        },
        body: JSON.stringify({ // Convert JavaScript object to JSON string
          question: userMessage.content, // The user's question
          fileId: fileId, // Which PDF to search in
        }),
      });

      // Check if request was successful
      if (!response.ok) {
        throw new Error(`Chat request failed: ${response.statusText}`);
      }

      // Parse JSON response from backend
      // Backend returns: { success: true, answer: "...", sources: [...] }
      const data = await response.json();

      if (data.success) {
        // Create assistant message object
        const assistantMessage: Message = {
          role: 'assistant', // This is from the AI
          content: data.answer, // The AI's response
          sources: data.sources, // Optional: PDF chunks used for answer
        };
        // Add assistant message to chat
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        // Backend returned success: false
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (err) {
      // Something went wrong - show error message in chat
      const errorMessage: Message = {
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to process your question'}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      // Always set loading to false, even if there was an error
      setIsLoading(false);
    }
  };

  /**
   * handleKeyPress - Handles Enter key to send message
   * 
   * @param e - Keyboard event from textarea
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed (without Shift)
    // Shift+Enter creates a new line, Enter alone sends the message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default behavior (new line)
      handleSend(); // Send the message
    }
  };

  /**
   * JSX Return - The component's UI
   */
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex flex-col h-[600px]">
      {/* Header Section */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">
          Chat
        </h2>
        {/* Show hint if no PDF uploaded */}
        {!fileId && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Please upload a PDF first to start chatting
          </p>
        )}
      </div>

      {/* Messages Container - Scrollable area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Empty state - shown when no messages but PDF is uploaded */}
        {messages.length === 0 && fileId && (
          <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
            <p>Ask a question about your PDF!</p>
          </div>
        )}

        {/* Map through messages array and render each message */}
        {/* map() creates a new array by calling a function on each element */}
        {messages.map((message, index) => (
          <div
            key={index} // React needs a unique key for each item in a list
            // Align user messages to right, assistant messages to left
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                // Different styling for user vs assistant messages
                message.role === 'user'
                  ? 'bg-blue-600 text-white' // User: blue background
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' // Assistant: gray background
              }`}
            >
              {/* Message content */}
              {/* whitespace-pre-wrap preserves line breaks */}
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Source citations - only show if sources exist */}
              {message.sources && message.sources.length > 0 && (
                <details className="mt-2 text-xs">
                  {/* Collapsible summary */}
                  <summary className="cursor-pointer opacity-70 hover:opacity-100">
                    View sources ({message.sources.length})
                  </summary>
                  {/* Source content - shown when expanded */}
                  <div className="mt-2 space-y-1">
                    {/* Map through sources and display each one */}
                    {message.sources.map((source, idx) => (
                      <div key={idx} className="p-2 bg-gray-200 dark:bg-gray-600 rounded">
                        <p className="opacity-90">{source.pageContent}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Loading Indicator - shown while waiting for AI response */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
              {/* Animated dots */}
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Invisible div at bottom - used for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          {/* Text Input */}
          <textarea
            value={input} // Controlled component - value comes from state
            onChange={(e) => setInput(e.target.value)} // Update state when user types
            onKeyPress={handleKeyPress} // Handle Enter key
            placeholder={fileId ? "Ask a question about your PDF..." : "Upload a PDF first..."}
            disabled={!fileId || isLoading || isProcessing} // Disable if no PDF or loading
            className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600 
              bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 
              px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500
              disabled:opacity-50 disabled:cursor-not-allowed"
            rows={2}
          />
          {/* Send Button */}
          <button
            onClick={handleSend} // Call handler when clicked
            disabled={!fileId || !input.trim() || isLoading || isProcessing} // Disable conditions
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
              text-white font-medium px-6 py-2 rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
