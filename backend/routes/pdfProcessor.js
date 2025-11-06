/**
 * PDF Processor Route Handler
 * 
 * This file handles:
 * - Reading and parsing PDF files
 * - Extracting text from PDFs
 * - Splitting text into chunks (for better AI processing)
 * - Creating embeddings (vector representations of text)
 * - Storing vectors for retrieval during chat
 */

// Import pdf-parse - library for extracting text from PDF files
// pdf-parse is a CommonJS module, so we need to use dynamic import for ES modules
// This is a workaround for CommonJS modules in ES module environments

// Import fs/promises - file system operations (async version)
// We use promises for async/await syntax
import fs from 'fs/promises';

// Import path - for working with file paths
import path from 'path';

// Import fileURLToPath - needed for ES modules
import { fileURLToPath } from 'url';
// Import createRequire - allows importing CommonJS modules in ES modules
import { createRequire } from 'module';

// Import RecursiveCharacterTextSplitter from Langchain
// This splits long documents into smaller chunks
// Why? AI models have token limits, and chunks help with retrieval
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

// Import OpenAIEmbeddings from Langchain
// Embeddings convert text into vectors (arrays of numbers)
// Similar text has similar vectors, enabling semantic search
import { OpenAIEmbeddings } from '@langchain/openai';

// Import MemoryVectorStore from Langchain
// Vector store stores embeddings and allows similarity search
// MemoryVectorStore stores everything in RAM (not persistent)
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create require function for importing CommonJS modules
const require = createRequire(import.meta.url);

/**
 * Vector Store Storage
 * 
 * In production, you'd use a database (like Pinecone, Chroma, etc.)
 * For simplicity, we store vector stores in memory (RAM)
 * 
 * Map structure: { fileId: { vectorStore, originalText, chunks } }
 */
const vectorStores = new Map();

/**
 * processPDF Function
 * 
 * This function is called when a PDF is uploaded via POST /api/upload
 * 
 * Steps:
 * 1. Validate that a file was uploaded
 * 2. Read the PDF file from disk
 * 3. Extract text from PDF
 * 4. Split text into chunks
 * 5. Create embeddings (vector representations)
 * 6. Store in vector store
 * 7. Return file ID to frontend
 * 
 * @param req - Express request object (contains uploaded file info)
 * @param res - Express response object (send response back to frontend)
 */
export async function processPDF(req, res) {
  try {
    // Step 1: Validate file was uploaded
    // multer middleware adds req.file if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    // Get file path and ID from multer
    // req.file.path = full path to uploaded file (e.g., ./uploads/pdf-123.pdf)
    // req.file.filename = just the filename (e.g., pdf-123.pdf)
    const filePath = req.file.path;
    const fileId = req.file.filename;

    // Step 2: Read PDF file from disk
    // fs.readFile reads the file as a Buffer (binary data)
    const dataBuffer = await fs.readFile(filePath);

    // Step 3: Parse PDF and extract text
    // pdf-parse v2.4.5 uses a class-based API (PDFParse class)
    // We use dynamic import since pdf-parse is an ES module
    const { PDFParse } = await import('pdf-parse');
    
    // Create an instance with the PDF buffer
    // The constructor accepts LoadParameters with 'data' property for Buffer/Uint8Array
    const parser = new PDFParse({ data: dataBuffer });
    
    // Extract text from all pages
    // getText() returns a TextResult object with text content
    const textResult = await parser.getText();
    
    // Get PDF metadata/info
    const infoResult = await parser.getInfo();
    
    // Create a compatible object structure
    // Get page count from total property or pages array length as fallback
    const numPages = infoResult.total || (infoResult.pages ? infoResult.pages.length : 0);
    
    const pdfData = {
      text: textResult.text || '', // Full document text
      info: infoResult.info || {},
      metadata: infoResult.metadata || {},
      numPages: numPages, // Use total property or pages array length
    };
    
    // Clean up the parser
    await parser.destroy();

    // Validate that PDF contains text
    // Some PDFs are just images (scanned documents) - those won't work
    if (!pdfData.text || pdfData.text.trim().length === 0) {
      return res.status(400).json({ error: 'PDF appears to be empty or contains no text' });
    }

    /**
     * Step 4: Split text into chunks
     * 
     * Why chunking?
     * - AI models have token limits (can't process entire document at once)
     * - Chunks allow retrieval of relevant parts
     * - Better for RAG (Retrieval-Augmented Generation)
     * 
     * RecursiveCharacterTextSplitter:
     * - Tries to split on paragraphs first
     * - Then sentences, then words
     * - Preserves context better than simple splitting
     */
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,      // Maximum characters per chunk
      chunkOverlap: 200,    // Characters to overlap between chunks
      // Overlap helps maintain context when chunks are retrieved
    });

    // Split the PDF text into chunks
    // createDocuments returns an array of Document objects
    // Each Document has: pageContent (text) and metadata
    const chunks = await textSplitter.createDocuments([pdfData.text]);

    /**
     * Step 5: Create embeddings
     * 
     * Embeddings convert text into vectors (arrays of numbers)
     * OpenAI's embedding model creates 1536-dimensional vectors
     * Similar text → similar vectors → can find related content
     */
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY, // From .env file
      // OpenAI will be called to create embeddings for each chunk
    });

    /**
     * Step 6: Create Vector Store
     * 
     * Vector store stores:
     * - The text chunks
     * - Their embeddings (vectors)
     * - Allows similarity search (find chunks similar to a query)
     * 
     * fromDocuments automatically:
     * - Creates embeddings for each chunk
     * - Stores them for retrieval
     */
    const vectorStore = await MemoryVectorStore.fromDocuments(chunks, embeddings);

    /**
     * Step 7: Store vector store in memory
     * 
     * We store:
     * - vectorStore: For searching similar chunks
     * - originalText: Original PDF text (for reference)
     * - chunks: Array of chunk documents
     * 
     * Key is fileId, so we can retrieve it later when user asks questions
     */
    vectorStores.set(fileId, {
      vectorStore,
      originalText: pdfData.text,
      chunks: chunks,
    });

    // Step 8: Send success response to frontend
    res.json({
      success: true,
      fileId: fileId,              // Frontend needs this to ask questions
      message: 'PDF processed successfully',
      textLength: pdfData.text.length,  // Total characters in PDF
      chunks: chunks.length,       // Number of chunks created
    });

  } catch (error) {
    // If anything goes wrong, log the error and send error response
    console.error('Error processing PDF:', error);
    res.status(500).json({ 
      error: 'Failed to process PDF', 
      message: error.message // Send error message to frontend for debugging
    });
  }
}

/**
 * getVectorStore Function
 * 
 * Retrieves a vector store by file ID
 * Used by chat handler to find the right PDF's vector store
 * 
 * @param fileId - The file ID returned after PDF upload
 * @returns - Object containing vectorStore, originalText, and chunks, or undefined
 */
export function getVectorStore(fileId) {
  return vectorStores.get(fileId);
}

/**
 * getAllFileIds Function
 * 
 * Returns array of all uploaded file IDs
 * Useful for debugging or admin purposes
 * 
 * @returns - Array of file ID strings
 */
export function getAllFileIds() {
  return Array.from(vectorStores.keys());
}
