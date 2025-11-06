'use client';

/**
 * Custom PDF Viewer Component with Text Highlighting
 * 
 * Uses PDF.js to render PDFs and highlight specific text
 */

import { useState, useEffect, useRef } from 'react';

// Dynamic import for PDF.js to avoid SSR issues
let pdfjsLib: any = null;

const loadPDFJS = async () => {
  if (typeof window === 'undefined') return null;
  
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist');
    // Set up PDF.js worker - use jsdelivr CDN
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
  return pdfjsLib;
};

interface CustomPDFViewerProps {
  fileUrl: string | null;
  highlightPage?: number | null;
  highlightText?: string | null;
  onPageChange?: (page: number) => void;
}

export default function CustomPDFViewer({
  fileUrl,
  highlightPage,
  highlightText,
  onPageChange,
}: CustomPDFViewerProps) {
  const [pdf, setPdf] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightRects, setHighlightRects] = useState<Array<{ x: number; y: number; width: number; height: number }>>([]);
  const [pdfjsLoaded, setPdfjsLoaded] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load PDF.js library on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    loadPDFJS().then((lib) => {
      if (lib) {
        setPdfjsLoaded(true);
      }
    });
  }, []);

  // Load PDF
  useEffect(() => {
    if (!fileUrl || !pdfjsLoaded) return;

    setLoading(true);
    setError(null);

    loadPDFJS().then((lib) => {
      if (!lib) {
        setError('Failed to load PDF.js library');
        setLoading(false);
        return;
      }

      const loadingTask = lib.getDocument({ url: fileUrl });
      loadingTask.promise
        .then((pdfDoc: any) => {
          setPdf(pdfDoc);
          setNumPages(pdfDoc.numPages);
          setCurrentPage(1);
          setLoading(false);
        })
        .catch((err: any) => {
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF');
          setLoading(false);
        });
    });
  }, [fileUrl, pdfjsLoaded]);

  // Navigate to highlight page
  useEffect(() => {
    if (highlightPage && pdf && highlightPage >= 1 && highlightPage <= numPages) {
      setCurrentPage(highlightPage);
      if (onPageChange) {
        onPageChange(highlightPage);
      }
    }
  }, [highlightPage, pdf, numPages, onPageChange]);

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current || !pdfjsLoaded) return;

    const renderPage = async () => {
      try {
        const page = await pdf.getPage(currentPage);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Calculate scale to fit container
        const container = containerRef.current;
        const containerWidth = container?.clientWidth || 800;
        const viewport = page.getViewport({ scale: 1.5 });
        const scale = Math.min(containerWidth / viewport.width, 2.0);
        const scaledViewport = page.getViewport({ scale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;

        // Extract and render text layer for highlighting
        if (textLayerRef.current && highlightText) {
          await renderTextLayer(page, scaledViewport, highlightText);
        } else if (textLayerRef.current) {
          // Clear highlights if no text to highlight
          setHighlightRects([]);
        }
      } catch (err) {
        console.error('Error rendering page:', err);
        setError('Failed to render page');
      }
    };

    renderPage();
  }, [pdf, currentPage, highlightText, pdfjsLoaded]);

  // Render text layer and find highlights
  const renderTextLayer = async (
    page: any,
    viewport: any,
    searchText: string
  ) => {
    try {
      const textContent = await page.getTextContent();
      const rects: Array<{ x: number; y: number; width: number; height: number }> = [];

      // Normalize search text (remove extra spaces, lowercase, trim)
      // Use the exact text for precise matching
      const normalizedSearch = searchText
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ')
        .substring(0, 100); // Limit search text length

      if (!normalizedSearch || normalizedSearch.length < 2) {
        setHighlightRects([]);
        return;
      }

      // Build text items with positions
      const textItems: Array<{
        str: string;
        x: number;
        y: number;
        width: number;
        height: number;
        fontSize: number;
      }> = [];

      textContent.items.forEach((item: any) => {
        if (item.str && item.str.trim()) {
          const transform = item.transform || [1, 0, 0, 1, 0, 0];
          const fontSize = Math.abs(transform[0]) || Math.abs(transform[3]) || 12;
          const tx = transform[4];
          const ty = transform[5];
          const charWidth = fontSize * 0.6;
          const strWidth = item.str.length * charWidth;

          textItems.push({
            str: item.str,
            x: tx,
            y: ty,
            width: strWidth,
            height: fontSize,
            fontSize: fontSize,
          });
        }
      });

      // Build searchable text and find matches
      // Try exact match first, then substring match
      const fullText = textItems.map((item) => item.str).join(' ');
      const normalizedFullText = fullText.toLowerCase().replace(/\s+/g, ' ');
      
      // Try to find the exact phrase first
      let searchIndex = normalizedFullText.indexOf(normalizedSearch);
      
      // If exact match not found, try finding key words (first 3-4 words)
      if (searchIndex === -1 && normalizedSearch.length > 10) {
        const keyWords = normalizedSearch.split(' ').slice(0, 4).join(' ');
        searchIndex = normalizedFullText.indexOf(keyWords);
      }
      
      // If still not found, try first 2 words
      if (searchIndex === -1 && normalizedSearch.length > 5) {
        const keyWords = normalizedSearch.split(' ').slice(0, 2).join(' ');
        searchIndex = normalizedFullText.indexOf(keyWords);
      }

      if (searchIndex !== -1) {
        // Find which text items contain the match
        let charCount = 0;
        let startItemIndex = -1;
        let endItemIndex = -1;
        let startCharOffset = 0;

        // Find start item
        for (let i = 0; i < textItems.length; i++) {
          const item = textItems[i];
          const itemText = item.str.toLowerCase();
          const itemLength = itemText.length;

          if (charCount <= searchIndex && charCount + itemLength > searchIndex) {
            startItemIndex = i;
            startCharOffset = searchIndex - charCount;
            break;
          }
          charCount += itemLength + 1; // +1 for space
        }

        // Find end item (continue from where we found start)
        const endCharIndex = searchIndex + normalizedSearch.length;
        charCount = 0;
        for (let i = 0; i < textItems.length; i++) {
          const item = textItems[i];
          const itemLength = item.str.length;

          if (charCount + itemLength >= endCharIndex) {
            endItemIndex = i;
            break;
          }
          charCount += itemLength + 1; // +1 for space
        }

        // Calculate bounding boxes
        if (startItemIndex !== -1 && endItemIndex !== -1) {
          let minX = Infinity;
          let minY = Infinity;
          let maxX = -Infinity;
          let maxY = -Infinity;

          for (let i = startItemIndex; i <= endItemIndex && i < textItems.length; i++) {
            const item = textItems[i];
            const charWidth = item.fontSize * 0.6;

            let itemStartX = item.x;
            let itemEndX = item.x + item.width;

            if (i === startItemIndex) {
              itemStartX = item.x + startCharOffset * charWidth;
            }
            if (i === endItemIndex) {
              // Calculate how many characters into this item the match ends
              let charCountBeforeItem = 0;
              for (let j = 0; j < i; j++) {
                charCountBeforeItem += textItems[j].str.length + 1;
              }
              const endOffset = Math.min(
                endCharIndex - charCountBeforeItem,
                item.str.length
              );
              itemEndX = item.x + endOffset * charWidth;
            }

            minX = Math.min(minX, itemStartX);
            maxX = Math.max(maxX, itemEndX);
            minY = Math.min(minY, item.y - item.fontSize);
            maxY = Math.max(maxY, item.y);
          }

          // Convert to viewport coordinates
          const rect = viewport.convertToViewportRectangle([minX, minY, maxX, maxY]);
          rects.push({
            x: Math.max(0, rect[0]),
            y: Math.max(0, viewport.height - rect[3]), // Flip Y coordinate
            width: Math.max(0, rect[2] - rect[0]),
            height: Math.max(0, rect[3] - rect[1]),
          });
        }
      }

      setHighlightRects(rects);
    } catch (err) {
      console.error('Error rendering text layer:', err);
      setHighlightRects([]);
    }
  };

  if (!pdfjsLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-red-600">
          <p className="mb-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!pdf) {
    return null;
  }

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto bg-gray-100 flex justify-center">
      <div className="relative" style={{ minWidth: '100%' }}>
        {/* Canvas for PDF rendering */}
        <canvas
          ref={canvasRef}
          className="block mx-auto shadow-lg"
          style={{ maxWidth: '100%', height: 'auto' }}
        />

        {/* Highlight overlay - highlights actual text in PDF */}
        {highlightRects.length > 0 && (
          <div
            className="absolute pointer-events-none z-10"
            style={{
              top: 0,
              left: 0,
              width: canvasRef.current?.width || 0,
              height: canvasRef.current?.height || 0,
            }}
          >
            {highlightRects.map((rect, idx) => (
              <div
                key={idx}
                className="absolute bg-yellow-300 opacity-60 rounded-sm border border-yellow-500"
                style={{
                  left: `${rect.x}px`,
                  top: `${rect.y}px`,
                  width: `${Math.max(rect.width, 10)}px`,
                  height: `${Math.max(rect.height, 8)}px`,
                  boxShadow: '0 0 4px rgba(255, 193, 7, 0.5)',
                }}
                title={`Highlighted: ${highlightText?.substring(0, 30)}...`}
              />
            ))}
          </div>
        )}

        {/* Text layer (invisible, for text selection) */}
        <div
          ref={textLayerRef}
          className="absolute top-0 left-0 opacity-0 pointer-events-none"
          style={{
            width: canvasRef.current?.width || 0,
            height: canvasRef.current?.height || 0,
          }}
        />
      </div>

      {/* Page navigation */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-4">
        <button
          onClick={() => {
            if (currentPage > 1) {
              setCurrentPage(currentPage - 1);
              if (onPageChange) onPageChange(currentPage - 1);
            }
          }}
          disabled={currentPage <= 1}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {numPages}
        </span>
        <button
          onClick={() => {
            if (currentPage < numPages) {
              setCurrentPage(currentPage + 1);
              if (onPageChange) onPageChange(currentPage + 1);
            }
          }}
          disabled={currentPage >= numPages}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

