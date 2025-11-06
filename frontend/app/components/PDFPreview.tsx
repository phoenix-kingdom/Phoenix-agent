'use client';

/**
 * PDF Preview Component
 * 
 * Displays the uploaded PDF in the middle section
 * Shows PDF viewer or placeholder when no PDF is uploaded
 * 
 * Features:
 * - Custom PDF.js viewer with text highlighting
 * - Page navigation
 * - Sentence-level highlighting
 */

import { useState, useEffect } from 'react';
import CustomPDFViewer from './CustomPDFViewer';

interface PDFPreviewProps {
  fileId: string | null;
  fileUrl: string | null;
  fileName: string | null;
  highlightPage?: number | null;
  highlightText?: string | null;
}

export default function PDFPreview({ fileId, fileUrl, fileName, highlightPage, highlightText }: PDFPreviewProps) {
  const [pdfError, setPdfError] = useState(false);

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

      {/* PDF Viewer - Custom PDF.js viewer with highlighting */}
      <div className="flex-1 overflow-hidden p-2 sm:p-3 md:p-4 lg:p-6">
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
          <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full h-full mx-auto relative">
            {highlightPage && highlightText && (
              <div className="absolute top-2 right-2 z-10 bg-yellow-400 text-gray-900 px-3 py-1 rounded-lg shadow-lg text-sm font-semibold animate-pulse border-2 border-yellow-500">
                📍 Page {highlightPage} - Highlighting: "{highlightText.substring(0, 30)}..."
              </div>
            )}
            <CustomPDFViewer
              fileUrl={fileUrl}
              highlightPage={highlightPage || undefined}
              highlightText={highlightText || undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}

