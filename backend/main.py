#FastAPI app + CORS

# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from core.config import AppConfig
from core.logging import get_logger
from api.routes import chat, documents, settings

# Initialize
app = FastAPI(
    title="RAG API",
    description="Production RAG system with streaming and citations",
    version="2.0.0"
)

logger = get_logger()
config = AppConfig()
config.ensure_dirs()

# CORS middleware (allow Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://localhost:3001",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(chat.router)
app.include_router(documents.router)
app.include_router(settings.router)


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "config": {
            "llm_model": config.llm_model,
            "embedding_model": config.embedding_model
        }
    }


@app.on_event("startup")
async def startup_event():
    logger.info("🚀 RAG API Server Started")
    logger.info(f"📁 Data directory: {config.data_dir}")
    logger.info(f"🤖 Default LLM: {config.llm_model}")
    logger.info(f"🔢 Default Embeddings: {config.embedding_model}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes
        log_level="info"
    )
