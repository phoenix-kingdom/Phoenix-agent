# Troubleshooting Guide

Quick solutions to common errors you might encounter.

## ❌ Error 1: Frontend - "Could not find a production build"

**Error Message:**
```
Error: Could not find a production build in the '.next' directory. 
Try building your app with 'next build' before starting the production server.
```

**Problem:**
You're using `npm start` which is for **production** mode. For development, you need `npm run dev`.

**Solution:**
```bash
# In the frontend folder, use:
npm run dev
```

**Explanation:**
- `npm run dev` = Development mode (auto-reload, easier debugging)
- `npm start` = Production mode (requires building first with `npm run build`)

---

## ❌ Error 2: Backend - "The requested module 'pdf-parse' does not provide an export named 'default'"

**Error Message:**
```
SyntaxError: The requested module 'pdf-parse' does not provide an export named 'default'
```

**Problem:**
`pdf-parse` is a CommonJS module, but we're using ES modules (import/export). CommonJS modules don't have default exports in ES modules.

**Solution:**
This has been fixed in the code! The latest version uses dynamic import. If you still see this error:

1. Make sure you have the latest code
2. Restart your backend server
3. The code now uses `await import('pdf-parse')` which handles CommonJS modules correctly

---

## ❌ Error 3: Backend - "ENOENT: no such file or directory" with pdf-parse

**Error Message:**
```
Error: ENOENT: no such file or directory, open '...test\data\05-versions-space.pdf'
```

**Problem:**
The `pdf-parse` package might be corrupted or incorrectly installed. It's trying to access test files that don't exist.

**Solution 1: Reinstall pdf-parse (Recommended)**
```bash
# Navigate to backend folder
cd backend

# Remove and reinstall pdf-parse
npm uninstall pdf-parse
npm install pdf-parse
```

**Solution 2: Clear node_modules and reinstall everything**
```bash
# Navigate to backend folder
cd backend

# Remove node_modules and package-lock.json
rm -rf node_modules package-lock.json  # Mac/Linux
# OR
Remove-Item -Recurse -Force node_modules, package-lock.json  # Windows PowerShell

# Reinstall everything
npm install
```

**Solution 3: Check if pdf-parse is in the wrong place**
Make sure `pdf-parse` is only in `backend/package.json`, NOT in `frontend/package.json`.

If it's in frontend, remove it:
```bash
cd frontend
npm uninstall pdf-parse
```

---

## ✅ Quick Fix Commands

### Start Backend (Development)
```bash
cd backend
npm start
# OR for auto-reload:
npm run dev
```

### Start Frontend (Development)
```bash
cd frontend
npm run dev  # ← Use this, NOT npm start
```

---

## 🔍 Other Common Issues

### Issue: "Module not found"

**Solution:**
```bash
# In the folder with the error:
npm install
```

---

### Issue: "Port 3001 already in use"

**Solution:**
1. Find what's using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3001
   
   # Mac/Linux
   lsof -i :3001
   ```

2. Kill the process or change the port in `backend/.env`:
   ```
   PORT=3002
   ```

---

### Issue: "OPENAI_API_KEY is not defined"

**Solution:**
1. Make sure `backend/.env` file exists
2. Check it contains: `OPENAI_API_KEY=sk-your-key-here`
3. Restart the backend server

---

### Issue: "Cannot connect to backend"

**Checklist:**
- ✅ Backend server is running (`npm start` in backend folder)
- ✅ Backend shows: `🚀 Server running on http://localhost:3001`
- ✅ Frontend is trying to connect to `http://localhost:3001`
- ✅ No firewall blocking the connection

---

## 🆘 Still Having Issues?

1. **Check the terminal output** - Error messages usually tell you what's wrong
2. **Check browser console** - Press F12 → Console tab
3. **Verify file paths** - Make sure you're in the right folder
4. **Restart both servers** - Sometimes a fresh start helps

---

## 📝 Correct Startup Sequence

**Terminal 1 (Backend):**
```bash
cd backend
npm start
# Wait for: "🚀 Server running on http://localhost:3001"
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev  # ← Remember: dev, not start!
# Wait for: "- Local: http://localhost:3000"
```

**Browser:**
- Open `http://localhost:3000`

---

Need more help? Check the main [SETUP.md](./SETUP.md) file for detailed instructions!

