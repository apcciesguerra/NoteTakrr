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
| LLM | Z.ai GLM-4.7-Flash via OpenAI SDK |
| RAG/Search | DuckDuckGo Search (duckduckgo-search) |
| Database | Supabase (PostgreSQL) |
| Document Processing | Unstructured, PyMuPDF, python-docx |

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

## Libraries Used

### Backend (Python)
- **FastAPI** & **Uvicorn**: High-performance asynchronous web framework for the API.
- **OpenAI SDK**: Used to connect to the Z.ai API (`GLM-4.7-Flash`).
- **Supabase**: Database and authentication client.
- **Unstructured** / **PyMuPDF (fitz)** / **Pillow**: Document extraction and OCR for PDFs, DOCX, and images.
- **python-docx**: Generates downloadable study guides as Microsoft Word documents.
- **duckduckgo-search**: Real-time web search for grounding AI responses.

### Frontend (TypeScript / React)
- **React** & **Vite**: UI library and fast build tool.
- **Tailwind CSS** & **Lucide React**: Utility-first styling and beautiful iconography.
- **TanStack Query (React Query)**: Data fetching, caching, and state synchronization.
- **React Markdown**, **remark-math**, & **rehype-katex**: Renders the AI's markdown responses and complex math formulas (LaTeX) cleanly.
- **Axios**: HTTP client for standard API requests (SSE streams use the native `fetch` API).

## System Architecture

NoteTakrr Lite uses a decoupled client-server architecture designed for real-time interaction and heavy document processing:

- **Frontend**: A React Single Page Application (SPA) built with Vite, TypeScript, and Tailwind CSS. It uses TanStack Query for state management and Server-Sent Events (SSE) to stream AI responses in real-time, providing a chat-like experience.
- **Backend**: A FastAPI Python server handling document extraction (PDF, DOCX, Images), AI orchestration, and study document generation. It provides RESTful endpoints and SSE streams.
- **Database & Auth**: Supabase (PostgreSQL) is used for user authentication, conversation history, and storing generated study guides.
- **AI Engine**: Powered by **Z.ai's `GLM-4.7-Flash` model**. The backend interfaces with Z.ai using the standard OpenAI SDK (since Z.ai provides an OpenAI-compatible API), offering fast, intelligent summarization and targeted review question generation. Web search context is fetched to provide up-to-date information when needed.

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
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
| `ZAI_API_KEY` | Z.ai API key for GLM-4.7-Flash |
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

### Commit Reference Table

| Type       | Description                                                                 | Example Subject                                           |
| :--------- | :-------------------------------------------------------------------------- | :-------------------------------------------------------- |
| `feat`     | A **new feature** for the user.                                             | `feat(auth): Add user registration flow`                  |
| `fix`      | A **bug fix**.                                                              | `fix(modal): Correct z-index issue`                       |
| `docs`     | **Documentation only changes**.                                             | `docs: Update README with setup guide`                    |
| `style`    | Changes that do not affect the meaning of the code (whitespace, formatting).| `style: Apply Prettier formatting`                        |
| `refactor` | A code change that neither fixes a bug nor adds a feature (e.g., renaming). | `refactor(utils): Extract validation logic`               |
| `test`     | Adding missing **tests** or correcting existing tests.                      | `test: Add unit tests for API client`                     |
| `chore`    | Other changes that don't modify src or test files (e.g., dependency updates).| `chore: Update Node.js version in CI`                     |
| `build`    | Changes that affect the **build system** or external dependencies.          | `build: Configure Webpack for production`                 |
| `ci`       | Changes to **CI configuration** files and scripts.                          | `ci: Add E2E tests to workflow`                           |
| `perf`     | A code change that **improves performance**.                                | `perf: Optimize database query`                           |
| `revert`   | **Reverts** a previous commit.                                              | `revert: feat: Add experimental feature X`                |
| `security` | Fixes related to **vulnerabilities** or security patches.                   | `security(auth): Fix JWT token leak`                      |
| `hotfix`   | An **urgent fix** applied to production (alternative to `fix`).             | `hotfix(api): Patch crash in payment gateway`             |
| `merge`    | A commit created by **merging branches**.                                   | `merge: branch 'feature/login' into 'main'`               |
