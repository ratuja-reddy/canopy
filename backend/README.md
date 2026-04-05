# Canopy Backend

FastAPI backend for the family tree application.

## Run the backend

From the `backend/` directory:

```bash
poetry install    # first time only
poetry run uvicorn canopy.main:app --reload
```

The API will be at **http://localhost:8000**. The frontend expects this; keep the backend running while using the app.
