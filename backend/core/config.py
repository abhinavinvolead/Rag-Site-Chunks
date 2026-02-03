# core/config.py - Enhanced with model management
import os
from pathlib import Path
from typing import List, Dict
from pydantic import BaseModel


class ModelConfig(BaseModel):
    """Configuration for a single LLM model"""
    id: str
    name: str
    description: str
    provider: str = "ollama"
    context_window: int = 8192
    recommended_temp: float = 0.3


class EmbeddingModelConfig(BaseModel):
    """Configuration for embedding models"""
    id: str
    name: str
    dimensions: int
    provider: str = "ollama"


class AppConfig:
    """Enhanced application configuration with dynamic model management"""
    
    # ============================================
    # 🎯 AVAILABLE MODELS - ADD NEW MODELS HERE!
    # ============================================
    AVAILABLE_LLM_MODELS: List[ModelConfig] = [
        ModelConfig(
            id="gemma2:2b",
            name="Gemma 2 (2B)",
            description="Fast, lightweight model - best for quick responses",
            context_window=8192,
            recommended_temp=0.3
        ),
        ModelConfig(
            id="llama3.2:3b",
            name="Llama 3.2 (3B)",
            description="Balanced performance and speed",
            context_window=8192,
            recommended_temp=0.5
        ),
        ModelConfig(
            id="mistral:7b",
            name="Mistral (7B)",
            description="High quality responses, slower inference",
            context_window=8192,
            recommended_temp=0.7
        ),
        ModelConfig(
            id="qwen2.5:7b",
            name="Qwen 2.5 (7B)",
            description="Excellent for technical content",
            context_window=32768,
            recommended_temp=0.5
        ),
        ModelConfig(
            id="phi3:mini",
            name="Phi-3 Mini",
            description="Microsoft's efficient model",
            context_window=4096,
            recommended_temp=0.4
        ),
    ]
    
    AVAILABLE_EMBEDDING_MODELS: List[EmbeddingModelConfig] = [
        EmbeddingModelConfig(
            id="nomic-embed-text",
            name="Nomic Embed Text",
            dimensions=768
        ),
        EmbeddingModelConfig(
            id="mxbai-embed-large",
            name="MixedBread AI Large",
            dimensions=1024
        ),
        EmbeddingModelConfig(
            id="all-minilm",
            name="All-MiniLM-L6-v2",
            dimensions=384
        ),
    ]
    
    # ============================================
    # Default Settings (can be overridden by user)
    # ============================================
    def __init__(self):
        # Directories
        self.base_dir = Path(__file__).parent.parent
        self.data_dir = self.base_dir / "data"
        self.artifacts_dir = self.base_dir / "artifacts"
        self.db_dir = self.base_dir / "vectordb"
        
        # Model settings (defaults)
        self.llm_model = os.getenv("LLM_MODEL", "gemma2:2b")
        self.embedding_model = os.getenv("EMBEDDING_MODEL", "mxbai-embed-large")
        
        # RAG parameters (user-configurable)
        self.chunk_size = int(os.getenv("CHUNK_SIZE", "800"))
        self.chunk_overlap = int(os.getenv("CHUNK_OVERLAP", "100"))
        self.top_k = int(os.getenv("TOP_K", "4"))
        self.fetch_k = int(os.getenv("FETCH_K", "30"))
        self.temperature = float(os.getenv("TEMPERATURE", "0.3"))
        self.use_mmr = os.getenv("USE_MMR", "true").lower() == "true"
        
        # System settings
        self.max_file_size_mb = 50
        self.allowed_extensions = {".pdf"}
    
    def ensure_dirs(self):
        """Create necessary directories"""
        for d in [self.data_dir, self.artifacts_dir, self.db_dir]:
            d.mkdir(parents=True, exist_ok=True)
    
    def get_available_llm_models(self) -> List[Dict]:
        """Return list of available LLM models as dicts"""
        return [model.model_dump() for model in self.AVAILABLE_LLM_MODELS]
    
    def get_available_embedding_models(self) -> List[Dict]:
        """Return list of available embedding models as dicts"""
        return [model.model_dump() for model in self.AVAILABLE_EMBEDDING_MODELS]
    
    def validate_llm_model(self, model_id: str) -> bool:
        """Check if LLM model ID is valid"""
        return any(m.id == model_id for m in self.AVAILABLE_LLM_MODELS)
    
    def validate_embedding_model(self, model_id: str) -> bool:
        """Check if embedding model ID is valid"""
        return any(m.id == model_id for m in self.AVAILABLE_EMBEDDING_MODELS)
    
    def update_settings(self, **kwargs):
        """Update configuration dynamically"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
