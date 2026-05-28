# NoteTakrr Lite

> AI-powered study assistant that transforms your notes into study materials.

## Overview

NoteTakrr Lite is a web application that processes student notes (text, images, PDFs) and generates structured study materials using AI. It supports two modes:

- **Summary Mode**: Generates a narrative study guide with concepts, definitions, and examples.
- **Reviewer Mode**: Generates Q&A pairs targeting weak points and deep understanding.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite + TailwindCSS |
| Backend | FastAPI (Python 3.11+) |
| LLM | Gemini 3.1 Flash via google-generativeai |
| RAG/Search | LangChain + DuckDuckGo |
| Database | Supabase (PostgreSQL) |
| Document Processing | Pytesseract, pdf2image, python-docx |

## Project Structure

```
noteTakrr-lite/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── agent/    # AI processing modules
│   │   ├── api/      # Route definitions
│   │   ├── models/   # Pydantic schemas
│   │   └── db/       # Supabase client
│   ├── tests/        # Test suite
│   └── outputs/      # Generated DOCX files
│
└── frontend/         # React frontend
    ├── src/
    │   ├── components/  # UI components
    │   ├── hooks/       # Custom React hooks
    │   ├── lib/         # Utilities & API client
    │   └── styles/      # Additional styles
    └── public/          # Static assets
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Tesseract OCR installed on your system
- Poppler (for pdf2image)

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys

python main.py
# Server starts at http://localhost:8000
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your API keys

npm run dev
# App starts at http://localhost:5173
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/process` | Upload file, select mode, generate response + DOCX |
| GET | `/api/conversations` | Fetch user's chat history |
| GET | `/api/conversations/{id}/messages` | Fetch specific chat messages |
| GET | `/api/download/{message_id}` | Download generated DOCX file |
| GET | `/health` | Health check |

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Gemini API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase anon/public key |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `PORT` | Server port (default: 8000) |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |

## License

Private - All rights reserved.
