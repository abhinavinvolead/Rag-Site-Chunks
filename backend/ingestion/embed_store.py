# FAISS build/load with Ollama embeddings

from pathlib import Path
from typing import List
from langchain_community.vectorstores import FAISS
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document
# import json


def build_faiss(docs: List[Document], db_dir: str, *, embedding_model: str) -> FAISS:
    embeddings = OllamaEmbeddings(model=embedding_model)
    vs = FAISS.from_documents(docs, embeddings) # Embeds all documents. Stores vectors in a FAISS index. Keeps document metadata attached
    Path(db_dir).mkdir(parents=True, exist_ok=True)
    vs.save_local(db_dir) #Writes FAISS index + metadata files to db_dir
    return vs


def load_faiss(db_dir: str, *, embedding_model: str) -> FAISS:
    embeddings = OllamaEmbeddings(model=embedding_model)
    vs = FAISS.load_local(db_dir, embeddings, allow_dangerous_deserialization=True) #Allows Python pickle loading
    return vs
