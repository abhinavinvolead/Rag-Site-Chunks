# Request Models

# api/schemas/requests.py
from pydantic import BaseModel, Field
from typing import Optional


class ChatRequest(BaseModel):
    """Request model for chat endpoint"""
    query: str = Field(..., min_length=1, max_length=2000, description="User query")
    llm_model: Optional[str] = Field(None, description="Override default LLM model")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Sampling temperature")
    top_k: Optional[int] = Field(None, ge=1, le=20, description="Number of documents to retrieve")
    stream: bool = Field(default=True, description="Enable streaming response")


class IndexRequest(BaseModel):
    """Request to trigger indexing"""
    chunk_size: Optional[int] = Field(None, ge=200, le=2000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=500)
    embedding_model: Optional[str] = Field(None)
    force_reindex: bool = Field(default=False, description="Force rebuild even if index exists")


class SettingsUpdateRequest(BaseModel):
    """Request to update global settings"""
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = Field(None, ge=200, le=2000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=500)
    top_k: Optional[int] = Field(None, ge=1, le=20)
    fetch_k: Optional[int] = Field(None, ge=10, le=100)
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0)
    use_mmr: Optional[bool] = None
