'use client';

/**
 * PDF Preview Component
 * 
 * Displays the uploaded PDF in the middle section
 * Shows PDF viewer or placeholder when no PDF is uploaded
 * 
 * Future: This component will be extended to support PDF editing
 * based on user requests (e.g., annotations, text modifications, etc.)
 */

import { useState, useEffect } from 'react';

interface PDFPreviewProps {
  fileId: string | null;
  fileUrl: string | null;
  fileName: string | null;
}

export default function PDFPreview({ fileId, fileUrl, fileName }: PDFPreviewProps) {
  const [pdfError, setPdfError] = useState(false);

  // Reset error when file changes
  useEffect(() => {
    setPdfError(false);
  }, [fileUrl]); // Changed from fileId to fileUrl since we check fileUrl for preview

  // Only check fileUrl - fileId is optional for immediate preview before backend processing
  if (!fileUrl) {
    return (
      <div className="h-full bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            No PDF Uploaded
          </h3>
          <p className="text-sm text-gray-500">
            Upload a PDF file from the left sidebar to view it here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 flex flex-col">
      {/* PDF Header - Responsive */}
      <div className="bg-white border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3">
        <h3 className="text-xs sm:text-sm font-medium text-gray-700 truncate">
          {fileName || 'PDF Preview'}
        </h3>
      </div>

      {/* PDF Viewer - Responsive, horizontally centered with maximum width, full height */}
      <div className="flex-1 overflow-auto p-2 sm:p-3 md:p-4 lg:p-6 flex justify-center">
        {pdfError ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-red-600 mb-2 text-sm sm:text-base">Failed to load PDF</p>
              <p className="text-xs sm:text-sm text-gray-500">
                The PDF file may be corrupted or inaccessible
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full max-w-full h-full mx-auto">
            <embed
              src={fileUrl}
              type="application/pdf"
              className="w-full h-full min-h-[400px] sm:min-h-[500px] md:min-h-[600px]"
              onError={() => setPdfError(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

