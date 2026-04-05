# Canopy

A family tree app with a React frontend and a FastAPI backend.

## Prerequisites

- **Node.js** and npm (for the frontend)
- **Python 3.11+** and [Poetry](https://python-poetry.org/) (for the backend)

## How to run locally

You need **two terminals**: one for the API and one for the web app.

### 1. Backend (API)

```bash
cd backend
poetry install    # first time only
poetry run uvicorn canopy.main:app --reload
```

The API listens at **http://localhost:8000**. If you see `Address already in use`, something else is using port 8000 (often a previous uvicorn). Stop that process or pick another port and point the frontend at it.

### 2. Frontend

```bash
cd frontend
npm install       # first time only
npm start
```

The app opens at **http://localhost:3000**. It calls the backend on port 8000, so keep the backend running or you will see network errors in the browser.

## Project layout

| Directory   | Role                                      |
| ----------- | ----------------------------------------- |
| `frontend/` | Create React App UI                       |
| `backend/`  | FastAPI service (`canopy/main.py`)        |

There is no root `package.json`; run npm commands from `frontend/`.
