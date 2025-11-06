/**
 * Main Server File
 * 
 * This is the entry point of our backend server. It:
 * - Sets up Express server
 * - Configures middleware (CORS, JSON parsing, file uploads)
 * - Defines API routes
 * - Handles file uploads
 * - Starts the server
 */

// Import Express - a web framework for Node.js
// Express makes it easy to create HTTP servers and APIs
import express from 'express';

// Import CORS - Cross-Origin Resource Sharing
// Allows our frontend (running on different port) to make requests to backend
import cors from 'cors';

// Import Multer - middleware for handling file uploads
// It processes multipart/form-data (files sent from forms)
import multer from 'multer';

// Import dotenv - loads environment variables from .env file
// Environment variables store sensitive data like API keys
import dotenv from 'dotenv';

// Import path - utilities for working with file paths
import path from 'path';

// Import fileURLToPath - converts file URLs to file paths
// Needed because we're using ES modules (import/export)
import { fileURLToPath } from 'url';

// Import our route handlers (functions that process requests)
import { processPDF } from './routes/pdfProcessor.js';
import { chatHandler } from './routes/chatHandler.js';
import { modelsHandler } from './routes/modelsHandler.js';

// Load environment variables from .env file
// This makes variables available in process.env (like process.env.OPENAI_API_KEY)
dotenv.config();

// ES Module workaround - get __dirname equivalent
// In CommonJS, __dirname is available automatically
// In ES modules, we need to construct it manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express application instance
// This is our server object
const app = express();

// Set the port number
// process.env.PORT reads from .env file, or defaults to 3001
const PORT = process.env.PORT || 3001;

/**
 * Middleware Setup
 * 
 * Middleware are functions that run on every request before reaching routes
 * They execute in order, so order matters!
 */

// CORS Middleware - allows frontend to make requests
// Without this, browser would block requests from localhost:3000 to localhost:3001
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON Middleware - parses JSON request bodies
// When frontend sends JSON data, this automatically converts it to a JavaScript object
// Makes it available in req.body
app.use(express.json());

/**
 * File Upload Setup
 * 
 * We need to create a directory to store uploaded PDFs
 * and configure Multer to handle file uploads
 */

// Define where to store uploaded files
// path.join() safely combines path segments
const uploadsDir = path.join(__dirname, 'uploads');

// Import fs/promises for async file operations
import { mkdir } from 'fs/promises';

// Create uploads directory if it doesn't exist
// recursive: true means it will create parent directories if needed
try {
  await mkdir(uploadsDir, { recursive: true });
} catch (error) {
  // Directory might already exist - that's okay, ignore the error
}

/**
 * Multer Configuration
 * 
 * Multer handles file uploads. We configure:
 * - Where to store files (diskStorage)
 * - What to name files (unique names to avoid conflicts)
 * - File type validation (only PDFs)
 * - File size limits (10MB max)
 */

// Configure storage - where and how to save files
const storage = multer.diskStorage({
  // destination: Where to save the file
  destination: (req, file, cb) => {
    // cb is a callback function - call it with (error, destination)
    // null means no error, uploadsDir is where to save
    cb(null, uploadsDir);
  },
  
  // filename: What to name the file
  filename: (req, file, cb) => {
    // Create unique filename to avoid conflicts
    // Date.now() = current timestamp in milliseconds
    // Math.random() * 1E9 = random number between 0 and 1 billion
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Format: pdf-1234567890-987654321.pdf
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

// Create multer instance with our configuration
const upload = multer({ 
  storage: storage, // Use our custom storage configuration
  
  // fileFilter: Validate file type before accepting
  fileFilter: (req, file, cb) => {
    // Check if file is a PDF
    // file.mimetype is the MIME type (e.g., 'application/pdf')
    if (file.mimetype === 'application/pdf') {
      // Accept the file: cb(null, true)
      cb(null, true);
    } else {
      // Reject the file: cb(error, false)
      cb(new Error('Only PDF files are allowed!'), false);
    }
  },
  
  // limits: Set file size restrictions
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB in bytes (100 * 1024 KB * 1024 B)
  }
});

/**
 * API Routes
 * 
 * Routes define what happens when frontend makes requests to specific URLs
 * Format: app.METHOD(path, middleware, handler)
 */

// POST /api/upload - Handle PDF file uploads
// upload.single('pdf') middleware processes the file upload
// 'pdf' is the field name the frontend uses (formData.append('pdf', file))
// After middleware processes file, it calls processPDF function
app.post('/api/upload', upload.single('pdf'), processPDF);

// POST /api/chat - Handle chat/question requests
// chatHandler function processes the question and returns AI response
app.post('/api/chat', (req, res, next) => {
  console.log('Received chat request:', { 
    hasBody: !!req.body, 
    hasQuestion: !!req.body?.question,
    hasFileId: !!req.body?.fileId,
    model: req.body?.model 
  });
  next();
}, chatHandler);

// GET /api/models - Fetch available OpenAI models
// modelsHandler function fetches models from OpenAI API
app.get('/api/models', modelsHandler);

// GET /api/health - Health check endpoint
// Useful for checking if server is running
// Returns simple JSON response
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

/**
 * Start Server
 * 
 * Make the server listen on the specified port
 * Once this runs, the server is live and accepting requests
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
