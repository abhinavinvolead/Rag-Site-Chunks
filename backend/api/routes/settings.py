# Get/Update settings

from fastapi import APIRouter, HTTPException
from api.schemas.requests import SettingsUpdateRequest
from api.schemas.responses import SettingsResponse, ModelsResponse, ModelInfo
from core.config import AppConfig

router = APIRouter(prefix="/api/settings", tags=["Settings"])
config = AppConfig()


@router.get("/", response_model=SettingsResponse)
async def get_settings():
    """Get current RAG settings"""
    return SettingsResponse(
        llm_model=config.llm_model,
        embedding_model=config.embedding_model,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        top_k=config.top_k,
        fetch_k=config.fetch_k,
        temperature=config.temperature,
        use_mmr=config.use_mmr
    )


@router.post("/", response_model=SettingsResponse)
async def update_settings(request: SettingsUpdateRequest):
    """Update RAG settings dynamically"""
    
    # Validate models if provided
    if request.llm_model and not config.validate_llm_model(request.llm_model):
        raise HTTPException(400, f"Invalid LLM model: {request.llm_model}")
    
    if request.embedding_model and not config.validate_embedding_model(request.embedding_model):
        raise HTTPException(400, f"Invalid embedding model: {request.embedding_model}")
    
    # Update settings
    update_data = request.model_dump(exclude_none=True)
    config.update_settings(**update_data)
    
    return SettingsResponse(
        llm_model=config.llm_model,
        embedding_model=config.embedding_model,
        chunk_size=config.chunk_size,
        chunk_overlap=config.chunk_overlap,
        top_k=config.top_k,
        fetch_k=config.fetch_k,
        temperature=config.temperature,
        use_mmr=config.use_mmr
    )


@router.get("/models", response_model=ModelsResponse)
async def get_available_models():
    """
    Get list of all available models
    
    Returns:
        - llm_models: List of text generation models
        - embedding_models: List of embedding models
    """
    return ModelsResponse(
        llm_models=[
            ModelInfo(**model) for model in config.get_available_llm_models()
        ],
        embedding_models=config.get_available_embedding_models()
    )


@router.get("/reset")
async def reset_settings():
    """Reset settings to defaults"""
    global config
    config = AppConfig()
    return {"message": "Settings reset to defaults"}
