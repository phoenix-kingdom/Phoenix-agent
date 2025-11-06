# PDF Chatbot with Langchain

A chatbot application that allows users to upload PDFs and ask questions about their content using Langchain and OpenAI.

## 📋 What This Project Does

This application lets you:
1. **Upload a PDF file** - The system extracts text from your PDF
2. **Process the PDF** - The text is split into chunks and converted into vectors (embeddings)
3. **Ask Questions** - You can ask questions about the PDF content
4. **Get AI Answers** - The AI searches through your PDF and provides answers based on the content
5. **See Sources** - Each answer shows which parts of the PDF were used

## 🏗️ Project Structure

```
Phoenix-agent/
├── frontend/                    # Next.js frontend application
│   ├── app/
│   │   ├── components/          # React components
│   │   │   ├── PDFUpload.tsx    # Component for uploading PDFs
│   │   │   └── ChatInterface.tsx # Component for chatting
│   │   ├── page.tsx             # Main page that combines everything
│   │   └── layout.tsx           # App layout with metadata
│   └── public/                   # Static files (logo, images)
│       └── logo.jpg             # Application logo
├── backend/                      # Node.js backend server
│   ├── routes/                  # API route handlers
│   │   ├── pdfProcessor.js      # Handles PDF upload and processing
│   │   └── chatHandler.js       # Handles chat/question requests
│   ├── server.js                # Main server file (starts the server)
│   ├── package.json             # Backend dependencies
│   └── .env                     # Environment variables (create this)
├── README.md                    # This file
└── SETUP.md                     # Detailed setup instructions
```

## 🛠️ Tech Stack Explained

### Frontend (What Users See)
- **Next.js** - A React framework that makes building web apps easier
  - React is a JavaScript library for building user interfaces
  - Next.js adds features like routing, server-side rendering, etc.
- **TypeScript** - JavaScript with type checking (catches errors before runtime)
- **Tailwind CSS** - Utility-first CSS framework (makes styling easier)

### Backend (Server That Processes Requests)
- **Node.js** - JavaScript runtime that lets you run JavaScript on the server
- **Express** - Web framework for Node.js (makes creating APIs easier)
- **Multer** - Middleware for handling file uploads

### AI/ML (The Intelligence)
- **Langchain** - Framework for building AI applications
  - Handles text splitting, embeddings, vector stores, and LLM interactions
- **OpenAI** - Provides the AI models (GPT-3.5-turbo) and embeddings
- **MemoryVectorStore** - Stores text embeddings in memory for fast retrieval

## 🎯 How It Works (Simplified)

1. **User uploads PDF** → Frontend sends file to backend
2. **Backend processes PDF**:
   - Extracts text from PDF
   - Splits text into chunks (smaller pieces)
   - Creates embeddings (vector representations) using OpenAI
   - Stores embeddings in vector store
3. **User asks question** → Frontend sends question to backend
4. **Backend finds relevant chunks**:
   - Converts question to embedding
   - Searches vector store for similar chunks
   - Retrieves top 4 most relevant chunks
5. **Backend generates answer**:
   - Sends question + relevant chunks to OpenAI GPT
   - GPT generates answer based on PDF content
   - Returns answer + source chunks to frontend
6. **Frontend displays answer** → User sees answer with sources

## ✨ Features

✅ **PDF Upload** - Easy drag-and-drop or click-to-upload interface  
✅ **Text Extraction** - Automatically extracts text from PDFs  
✅ **Smart Chunking** - Splits PDFs into manageable pieces  
✅ **Vector Search** - Finds relevant content using semantic similarity  
✅ **AI-Powered Answers** - Uses GPT-3.5-turbo for intelligent responses  
✅ **Source Citations** - Shows which parts of PDF were used  
✅ **Real-time Chat** - Interactive chat interface  
✅ **Error Handling** - Graceful error messages for common issues  

## 🚀 Quick Start

### Prerequisites

Before you start, make sure you have:
- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) - Package manager for JavaScript
- **OpenAI API Key** - [Get one here](https://platform.openai.com/api-keys)

### Step 1: Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install all required packages
npm install

# Create .env file (see below for content)
# Then start the server (development mode)
npm start
# OR for auto-reload during development:
# npm run dev
```

**Create `backend/.env` file:**
```
OPENAI_API_KEY=your_actual_openai_api_key_here
PORT=3001
NODE_ENV=development
```

### Step 2: Frontend Setup

```bash
# Open a NEW terminal window
# Navigate to frontend folder
cd frontend

# Install all required packages
npm install

# Start the development server
# IMPORTANT: Use 'npm run dev' NOT 'npm start'
npm run dev
```

**⚠️ Important:** For development, always use `npm run dev`, not `npm start`. The `start` command is for production and requires building first.

### Step 3: Use the App

1. Open your browser and go to `http://localhost:3000`
2. Upload a PDF file using the upload section
3. Wait for processing to complete (you'll see a success message)
4. Start asking questions in the chat interface!

## 📚 Detailed Documentation

For more detailed setup instructions, troubleshooting, and explanations, see **[SETUP.md](./SETUP.md)**

## 🔑 Key Concepts Explained

### What are Embeddings?
Embeddings are numerical representations of text. Similar text has similar numbers, allowing the AI to find relevant content even if the exact words don't match.

### What is a Vector Store?
A vector store is a database that stores embeddings and allows fast similarity search. Think of it like a search engine that understands meaning, not just keywords.

### What is RAG?
RAG (Retrieval-Augmented Generation) is a technique where:
1. We retrieve relevant information from a knowledge base (your PDF)
2. We augment (add) that information to the AI's prompt
3. The AI generates an answer based on the retrieved information

This is better than asking the AI directly because it uses YOUR document as the source of truth.

## 🐛 Common Issues

### Frontend: "Could not find a production build"
- **Problem**: You used `npm start` instead of `npm run dev`
- **Solution**: Use `npm run dev` for development. See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for details.

### Backend: "ENOENT: no such file" with pdf-parse
- **Problem**: pdf-parse package might be corrupted
- **Solution**: Reinstall it: `cd backend && npm uninstall pdf-parse && npm install pdf-parse`

### "Cannot find module" errors
- **Solution**: Run `npm install` in the directory where the error occurs

### "OPENAI_API_KEY is not defined"
- **Solution**: Make sure you created the `.env` file in the `backend` folder with your API key

### "Port 3001 already in use"
- **Solution**: Either stop the process using port 3001, or change the PORT in `.env`

### PDF upload fails
- **Solution**: Make sure the PDF contains text (not just images). Scanned PDFs need OCR first.

**For more detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**

## 📖 Learning Resources

If you're new to these technologies, here are some helpful resources:

- **Next.js**: [Official Tutorial](https://nextjs.org/learn)
- **React**: [React Documentation](https://react.dev/)
- **Express**: [Express Guide](https://expressjs.com/en/guide/routing.html)
- **Langchain**: [Langchain Documentation](https://js.langchain.com/docs/get_started/introduction)
- **OpenAI**: [OpenAI API Docs](https://platform.openai.com/docs)

## 🔜 Future Enhancements

- [ ] User authentication (multiple users)
- [ ] Persistent vector storage (database instead of memory)
- [ ] Chat history (remember previous conversations)
- [ ] Support for more file formats (Word, TXT, etc.)
- [ ] Multiple PDF support (combine multiple documents)
- [ ] Export chat conversations

## 📝 License

This project is open source and available for learning purposes.

---

**Need Help?** Check [SETUP.md](./SETUP.md) for detailed step-by-step instructions with explanations!
