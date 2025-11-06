'use client';

/**
 * PDF Upload Component
 * 
 * This component handles:
 * - File selection from the user's device
 * - PDF file validation (only accepts PDF files)
 * - Uploading the PDF to the backend server
 * - Displaying upload status and errors
 * - Notifying the parent component when upload succeeds
 */

// Import React hooks
// useState: Manages component state (like file, error messages, etc.)
// useRef: Creates a reference to DOM elements (like the file input)
import { useState, useRef } from 'react';

/**
 * TypeScript Interface - defines what props this component expects
 * 
 * Props are data passed from parent component to child component
 */
interface PDFUploadProps {
  // Function that gets called when PDF is successfully uploaded
  // It receives the fileId (a string) from the backend
  onUploadSuccess: (fileId: string) => void;
  // Boolean that tells us if a PDF is currently being processed
  isProcessing: boolean;
  // Function to update the processing state in the parent component
  setIsProcessing: (processing: boolean) => void;
}

/**
 * PDFUpload Component
 * 
 * @param onUploadSuccess - Callback function when upload succeeds
 * @param isProcessing - Current processing state
 * @param setIsProcessing - Function to update processing state
 */
export default function PDFUpload({ onUploadSuccess, isProcessing, setIsProcessing }: PDFUploadProps) {
  // State: Stores the selected PDF file (or null if no file selected)
  // File is a browser API type for file objects
  const [file, setFile] = useState<File | null>(null);
  
  // State: Stores status messages to show the user (like "Uploading...")
  const [uploadStatus, setUploadStatus] = useState<string>('');
  
  // State: Stores error messages if something goes wrong
  const [error, setError] = useState<string>('');
  
  // Ref: Reference to the file input element
  // We use this to clear the file input after successful upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * handleFileChange - Called when user selects a file
   * 
   * This function:
   * 1. Gets the selected file from the input
   * 2. Checks if it's a PDF file
   * 3. If valid, stores it in state
   * 4. If invalid, shows an error
   * 
   * @param e - The change event from the file input
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Check if a file was actually selected
    // e.target.files is an array-like object containing selected files
    if (e.target.files && e.target.files[0]) {
      // Get the first (and only) selected file
      const selectedFile = e.target.files[0];
      
      // Validate that it's a PDF file
      // MIME type for PDF is 'application/pdf'
      if (selectedFile.type === 'application/pdf') {
        // Valid PDF - store it in state
        setFile(selectedFile);
        // Clear any previous errors
        setError('');
        // Clear any previous status messages
        setUploadStatus('');
      } else {
        // Invalid file type - show error
        setError('Please select a PDF file');
        // Clear the file from state
        setFile(null);
      }
    }
  };

  /**
   * handleUpload - Called when user clicks the upload button
   * 
   * This function:
   * 1. Validates that a file is selected
   * 2. Creates FormData to send the file to the server
   * 3. Sends a POST request to the backend
   * 4. Handles the response and updates UI
   * 5. Notifies parent component on success
   */
  const handleUpload = async () => {
    // Check if a file is selected
    if (!file) {
      setError('Please select a file first');
      return; // Exit early if no file
    }

    // Set processing state to true - this disables buttons and shows loading
    setIsProcessing(true);
    // Clear any previous errors
    setError('');
    // Show status message to user
    setUploadStatus('Uploading and processing PDF...');

    // FormData is a browser API for sending files
    // It's like a form submission but done via JavaScript
    const formData = new FormData();
    // Append the file to FormData
    // 'pdf' is the field name the backend expects
    formData.append('pdf', file);

    try {
      // Send POST request to backend upload endpoint
      // fetch() is the modern way to make HTTP requests in JavaScript
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST', // HTTP method for sending data
        body: formData, // The file data
        // Note: We don't set Content-Type header - browser sets it automatically
        // with the correct boundary for multipart/form-data
      });

      // Check if the request was successful (status 200-299)
      if (!response.ok) {
        // If not successful, throw an error
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Parse the JSON response from the backend
      // The backend returns: { success: true, fileId: "...", chunks: 5, ... }
      const data = await response.json();
      
      // Check if backend reported success
      if (data.success) {
        // Success! Show success message with chunk count
        setUploadStatus(`✅ PDF processed successfully! (${data.chunks} chunks)`);
        // Call the parent component's callback with the fileId
        // This tells the parent that a PDF is ready for chatting
        onUploadSuccess(data.fileId);
        // Clear the file from state
        setFile(null);
        // Clear the file input so user can upload another file
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Backend returned success: false
        throw new Error(data.error || 'Upload failed');
      }
    } catch (err) {
      // Something went wrong - show error to user
      // err instanceof Error checks if it's a proper Error object
      // If yes, use err.message; otherwise use a generic message
      setError(err instanceof Error ? err.message : 'Failed to upload PDF');
      setUploadStatus('');
    } finally {
      // Always set processing to false, even if there was an error
      // This re-enables the UI
      setIsProcessing(false);
    }
  };

  /**
   * JSX Return - The component's UI
   * 
   * This is what gets rendered on the screen
   */
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* Component Title */}
      <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-4">
        Upload PDF
      </h2>
      
      <div className="space-y-4">
        {/* File Input Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select PDF File
          </label>
          {/* File input element */}
          <input
            ref={fileInputRef} // Connect our ref to this element
            type="file" // Makes it a file picker
            accept=".pdf" // Only shows PDF files in the file picker
            onChange={handleFileChange} // Call our handler when file is selected
            disabled={isProcessing} // Disable while processing
            className="block w-full text-sm text-gray-500 dark:text-gray-400
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              dark:file:bg-gray-700 dark:file:text-gray-300
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Display selected file info (only if file is selected) */}
        {/* Conditional rendering: {condition && <JSX>} */}
        {file && (
          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              📄 {file.name}
            </p>
            {/* Show file size in MB */}
            {/* file.size is in bytes, so divide by 1024 twice for MB */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}

        {/* Error Message Display (only if there's an error) */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success/Status Message Display (only if there's a status) */}
        {uploadStatus && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-700 dark:text-green-400">{uploadStatus}</p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload} // Call our handler when clicked
          disabled={!file || isProcessing} // Disable if no file or processing
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
            text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {/* Show different text based on processing state */}
          {isProcessing ? 'Processing...' : 'Upload & Process PDF'}
        </button>
      </div>
    </div>
  );
}
