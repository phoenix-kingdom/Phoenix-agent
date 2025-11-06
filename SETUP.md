# Complete Setup Guide - PDF Chatbot

This guide will walk you through setting up the PDF Chatbot step-by-step, with detailed explanations for beginners.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Getting Your OpenAI API Key](#getting-your-openai-api-key)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Testing the Application](#testing-the-application)
6. [Understanding the Code Structure](#understanding-the-code-structure)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, you need these tools installed on your computer:

### 1. Node.js (v18 or higher)

**What is Node.js?**
- Node.js lets you run JavaScript on your computer (not just in the browser)
- It includes npm (Node Package Manager) for installing libraries

**How to install:**
1. Go to [nodejs.org](https://nodejs.org/)
2. Download the LTS (Long Term Support) version
3. Run the installer
4. Follow the installation wizard

**Verify installation:**
Open a terminal/command prompt and type:
```bash
node --version
npm --version
```
You should see version numbers (like v18.17.0 and 9.6.7)

### 2. A Code Editor (Optional but Recommended)

- **Visual Studio Code** (Free) - [Download here](https://code.visualstudio.com/)
- Any text editor will work, but VS Code has helpful features

### 3. OpenAI API Key

See the next section for detailed instructions.

---

## Getting Your OpenAI API Key

**What is an API Key?**
An API key is like a password that lets your application use OpenAI's services. You'll need to pay for OpenAI usage (they charge per API call, but it's very cheap for testing).

**Steps to get an API key:**

1. **Create an OpenAI account:**
   - Go to [platform.openai.com](https://platform.openai.com/)
   - Click "Sign up" and create an account
   - You may need to add a payment method

2. **Create an API key:**
   - Once logged in, go to [API Keys page](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Give it a name (like "PDF Chatbot")
   - **Copy the key immediately** - you won't be able to see it again!
   - Save it somewhere safe (like a text file)

3. **Add credits:**
   - Go to [Billing page](https://platform.openai.com/account/billing)
   - Add payment method
   - Add some credits (even $5-10 is enough for lots of testing)

**Important:** Never share your API key publicly or commit it to GitHub!

---

## Backend Setup

The backend is the server that processes PDFs and handles AI requests.

### Step 1: Navigate to Backend Directory

Open your terminal/command prompt and navigate to the project:

```bash
# Windows (PowerShell)
cd D:\PHOENIX\Study\Projects\Langchain_agent\Phoenix-agent\backend

# Mac/Linux
cd /path/to/Phoenix-agent/backend
```

### Step 2: Install Dependencies

**What are dependencies?**
Dependencies are external libraries (code packages) your project needs to work. They're listed in `package.json`.

**Install them:**
```bash
npm install
```

**What happens:**
- npm reads `package.json`
- Downloads all required packages
- Creates a `node_modules` folder with all the code
- This may take a few minutes the first time

**Expected output:**
You should see something like:
```
added 359 packages, and audited 360 packages in 6m
```

### Step 3: Create Environment Variables File

**What is a .env file?**
- Contains sensitive information (like API keys)
- NOT committed to Git (kept private)
- Loaded by the application at startup

**Create the file:**
1. In the `backend` folder, create a new file named `.env`

2. Add this content (replace with your actual API key):
```
OPENAI_API_KEY=sk-your-actual-api-key-here
PORT=3001
NODE_ENV=development
```

**How to create the file:**
- **Windows:** Right-click in folder → New → Text Document → Rename to `.env` (make sure to remove .txt extension)
- **VS Code:** Right-click in file explorer → New File → Name it `.env`
- **Terminal:** 
  ```bash
  # Windows PowerShell
  New-Item -ItemType File -Path .env
  
  # Mac/Linux
  touch .env
  ```

Then open `.env` in a text editor and paste the content above.

### Step 4: Start the Backend Server

```bash
npm start
```

**What happens:**
- Server starts on port 3001
- You should see: `🚀 Server running on http://localhost:3001`

**Keep this terminal open!** The server needs to keep running.

**To stop the server:**
Press `Ctrl + C` in the terminal

---

## Frontend Setup

The frontend is what users see and interact with in their browser.

### Step 1: Open a New Terminal

**Important:** Keep the backend terminal running, open a **new** terminal window/tab for the frontend.

### Step 2: Navigate to Frontend Directory

```bash
# Navigate to frontend folder
cd frontend
```

(If you're in the backend folder, go up one level first: `cd ..` then `cd frontend`)

### Step 3: Install Dependencies

```bash
npm install
```

**Note:** If you used `create-next-app`, this might already be done. But it's safe to run again.

### Step 4: Start the Frontend Server

```bash
npm run dev
```

**What happens:**
- Next.js development server starts
- You should see: `- Local: http://localhost:3000`
- The app automatically opens in your browser

**Keep this terminal open too!**

---

## Testing the Application

### Step 1: Open the Application

1. Open your browser
2. Go to `http://localhost:3000`
3. You should see:
   - Logo at the top
   - "PDF Chatbot" title
   - Upload section on the left
   - Chat interface on the right

### Step 2: Upload a PDF

1. Click "Choose File" or drag a PDF into the upload area
2. Select a PDF file from your computer
3. Click "Upload & Process PDF"
4. Wait for processing (may take 10-30 seconds depending on PDF size)
5. You should see: "✅ PDF processed successfully! (X chunks)"

**Test PDF tip:** Start with a small PDF (1-5 pages) with clear text (not scanned images).

### Step 3: Ask a Question

1. In the chat interface, type a question about your PDF
2. Press Enter or click "Send"
3. Wait for the AI response (5-10 seconds)
4. You should see the answer appear
5. Click "View sources" to see which parts of the PDF were used

**Example questions:**
- "What is this document about?"
- "Summarize the main points"
- "What does it say about [topic]?"

---

## Understanding the Code Structure

### Frontend Files

#### `frontend/app/page.tsx`
- **Main page** - Combines upload and chat components
- Manages state (fileId, processing status)
- Passes data between components

#### `frontend/app/components/PDFUpload.tsx`
- **Upload component** - Handles file selection and upload
- Validates PDF files
- Shows upload status and errors
- Sends file to backend API

#### `frontend/app/components/ChatInterface.tsx`
- **Chat component** - Displays messages and handles questions
- Sends questions to backend
- Displays AI responses
- Shows source citations

### Backend Files

#### `backend/server.js`
- **Main server file** - Sets up Express server
- Configures middleware (CORS, file uploads)
- Defines API routes
- Starts the server

#### `backend/routes/pdfProcessor.js`
- **PDF processing** - Handles PDF upload endpoint
- Extracts text from PDF
- Splits text into chunks
- Creates embeddings
- Stores in vector store

#### `backend/routes/chatHandler.js`
- **Chat handler** - Handles question endpoint
- Retrieves relevant chunks from vector store
- Sends to OpenAI GPT
- Returns answer with sources

### How Data Flows

```
User Action          Frontend              Backend              OpenAI
─────────────────────────────────────────────────────────────────────
Upload PDF    →      POST /api/upload  →    Process PDF    →    Create Embeddings
                                                                    ↓
Ask Question  →      POST /api/chat   →    Find Chunks    →    Generate Answer
                                                                    ↓
Display Answer ←     Receive Response ←    Return Answer  ←    Answer + Sources
```

---

## Troubleshooting

### Issue: "Cannot find module 'express'"

**Problem:** Dependencies not installed

**Solution:**
```bash
cd backend
npm install
```

---

### Issue: "OPENAI_API_KEY is not defined"

**Problem:** `.env` file missing or incorrect

**Solution:**
1. Make sure `.env` file exists in `backend` folder
2. Check that it contains: `OPENAI_API_KEY=sk-...`
3. Make sure you replaced `sk-...` with your actual key
4. Restart the backend server

---

### Issue: "Port 3001 already in use"

**Problem:** Another application is using port 3001

**Solution Option 1:** Stop the other application
```bash
# Find what's using the port
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001
```

**Solution Option 2:** Change the port
1. Edit `backend/.env`
2. Change `PORT=3001` to `PORT=3002`
3. Update frontend code to use port 3002 (in PDFUpload.tsx and ChatInterface.tsx)

---

### Issue: "CORS error" or "Failed to fetch"

**Problem:** Backend server not running or wrong URL

**Solution:**
1. Make sure backend is running (`npm start` in backend folder)
2. Check that backend shows: `🚀 Server running on http://localhost:3001`
3. Verify frontend is trying to connect to `http://localhost:3001`

---

### Issue: "PDF appears to be empty"

**Problem:** PDF contains only images (scanned document)

**Solution:**
- PDFs with only images need OCR (Optical Character Recognition) first
- Use a PDF with selectable text
- Convert scanned PDFs using Adobe Acrobat or online OCR tools

---

### Issue: "Module not found" errors after adding code

**Problem:** Missing imports or incorrect paths

**Solution:**
1. Check that you imported the module correctly
2. Verify the file path is correct
3. Make sure you installed the package: `npm install package-name`

---

### Issue: Frontend shows "Upload a PDF first" after uploading

**Problem:** fileId not being passed correctly

**Solution:**
1. Check browser console for errors (F12 → Console tab)
2. Check backend terminal for errors
3. Verify the upload response includes `fileId`
4. Check that `onUploadSuccess` is being called

---

### Issue: Slow responses

**Problem:** Normal for large PDFs or complex questions

**Solution:**
- Processing large PDFs takes time (10-30 seconds)
- AI responses take 5-10 seconds
- This is normal! Be patient.

---

## Next Steps

Once everything is working:

1. **Read the code comments** - All files have detailed comments explaining how things work
2. **Try different PDFs** - Test with various document types
3. **Experiment with questions** - See what works best
4. **Customize the UI** - Change colors, layout, etc. in the frontend components
5. **Add features** - Try adding chat history, multiple PDFs, etc.

---

## Getting Help

If you're stuck:

1. **Check the error message** - Read it carefully, it often tells you what's wrong
2. **Check the terminal** - Backend and frontend terminals show error details
3. **Check browser console** - Press F12 → Console tab to see frontend errors
4. **Read the code comments** - They explain what each part does
5. **Search online** - Copy the error message and search Google

---

## Common Commands Reference

```bash
# Navigate to folder
cd folder-name

# Go up one level
cd ..

# Install dependencies
npm install

# Start backend (in backend folder)
npm start

# Start frontend (in frontend folder)
npm run dev

# Stop a running process
Ctrl + C
```

---

**Congratulations!** You've set up a complete PDF chatbot application! 🎉

Now explore the code, experiment, and build something amazing!
