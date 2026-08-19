# 🧪 ELYXIR — Next-Gen AI Chatbot

A modern, fast, and highly customizable AI conversational assistant built with a **React + Vite** frontend and a **FastAPI** Python backend.

---

## ✨ Features

- 🎨 **Real-Time Dynamic Theme Customizer**:
  - Light & Dark mode support with full color-matched background tinting.
  - 8 curated accent colors + full spectrum **Color Wheel** for custom hex colors.
  - Live interactive chat preview in sidebar.
- 🎙️ **Voice Recognition & Speech Synthesizer**:
  - Voice-to-text recording with Whisper AI transcription.
  - Text-to-speech audio playback for all bot responses.
- 📎 **Rich File Attachments**:
  - Upload images (PNG, JPG, SVG, WebP) with inline zooming.
  - Upload documents (PDF, DOCX) with smart file size & format validation.
- 📄 **Multi-Format Chat Export**:
  - Export conversations to **PDF Document**, **Markdown (.md)**, and **Plain Text (.txt)**.
- ⌨️ **Smart Text Area Input**:
  - Press `Enter` to submit.
  - Press `Shift + Enter` to insert newlines with auto-expanding input box height.
- 🕒 **Live Dynamic Timestamps**:
  - Relative message timestamps (e.g., *Just now*, *2 minutes ago*) auto-updated in real-time.
- 🌐 **Live Web Search Mode**:
  - Toggle live internet search integration directly from the prompt bar.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Run the backend server:
```bash
uvicorn main:app --reload
```
Runs at: `http://localhost:8000`

---

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Runs at: `http://localhost:5173`

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Marked.js (Markdown), Highlight.js (Code highlighting), Vanilla CSS Tokens.
- **Backend**: FastAPI, Uvicorn, Groq API (Llama 3 / Whisper models), Python-docx, PyPDF2.
- **Design System**: Cormorant Garamond Typography, HSL Dynamic Palette Generation.
