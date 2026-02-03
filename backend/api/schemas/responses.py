# Responses models

# api/schemas/responses.py
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Citation(BaseModel):
    """Citation metadata"""
    doc_id: str
    name: str
    page: int
    paragraph_num: int
    span_start: int
    span_end: int
    chunk_preview: str
    source_path: Optional[str] = None


class ChatResponse(BaseModel):
    """Non-streaming chat response"""
    answer: str
    citations: List[Citation]
    model_used: str
    query: str


class DocumentInfo(BaseModel):
    """Document metadata"""
    doc_id: str
    name: str
    num_pages: int
    source_path: str
    indexed_at: Optional[str] = None


class IndexStatus(BaseModel):
    """Indexing status"""
    total_documents: int
    total_chunks: int
    embedding_model: str
    status: str


class SettingsResponse(BaseModel):
    """Current settings"""
    llm_model: str
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    top_k: int
    fetch_k: int
    temperature: float
    use_mmr: bool


class ModelInfo(BaseModel):
    """Model information"""
    id: str
    name: str
    description: str
    provider: str
    context_window: Optional[int] = None
    recommended_temp: Optional[float] = None


class ModelsResponse(BaseModel):
    """Available models"""
    llm_models: List[ModelInfo]
    embedding_models: List[Dict[str, Any]]
