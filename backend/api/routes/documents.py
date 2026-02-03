# PDF upload/indexing endpoints

from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from typing import List, Optional
import json
from pathlib import Path
import tempfile
import os

from api.schemas.requests import IndexRequest
from api.schemas.responses import DocumentInfo, IndexStatus
from core.config import AppConfig
from core.logging import get_logger
from ingestion.pdf_loader import load_pdf_build_page_index
from ingestion.chunker import make_page_chunks
from ingestion.embed_store import build_faiss, load_faiss
from highlight.annotator import annotate_pdf

router = APIRouter(prefix="/api/documents", tags=["Documents"])
logger = get_logger()
config = AppConfig()
config.ensure_dirs()


@router.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    """Upload one or more PDF files"""
    
    uploaded_files = []
    
    for file in files:
        # Validate file
        if not file.filename.endswith('.pdf'):
            raise HTTPException(400, f"Only PDF files allowed: {file.filename}")
        
        # Check file size
        content = await file.read()
        size_mb = len(content) / (1024 * 1024)
        
        if size_mb > config.max_file_size_mb:
            raise HTTPException(400, f"File too large: {file.filename} ({size_mb:.1f}MB > {config.max_file_size_mb}MB)")
        
        # Save file
        output_path = config.data_dir / file.filename
        with open(output_path, 'wb') as f:
            f.write(content)
        
        uploaded_files.append({
            "filename": file.filename,
            "size_mb": round(size_mb, 2),
            "path": str(output_path)
        })
        
        logger.info(f"Uploaded: {file.filename} ({size_mb:.2f}MB)")
    
    return {
        "message": f"Uploaded {len(uploaded_files)} file(s)",
        "files": uploaded_files
    }


@router.post("/index", response_model=IndexStatus)
async def index_documents(request: IndexRequest):
    """
    Index all PDFs in data directory
    
    This will:
    1. Parse PDFs and extract text + word positions
    2. Chunk documents based on settings
    3. Generate embeddings and build FAISS index
    """
    
    # Use request params or fall back to config

    chunk_size = request.chunk_size or config.chunk_size
    chunk_overlap = request.chunk_overlap or config.chunk_overlap
    embedding_model = request.embedding_model or config.embedding_model

    
    if not config.validate_embedding_model(embedding_model):
        raise HTTPException(400, f"Invalid embedding model: {embedding_model}")
    
    try:
        # Find all PDFs
        pdf_files = list(config.data_dir.glob('*.pdf'))
        
        if not pdf_files:
            raise HTTPException(404, "No PDF files found. Upload PDFs first.")
        
        logger.info(f"Indexing {len(pdf_files)} PDF(s) with chunk_size={chunk_size}, model={embedding_model}")
        
        # Step 1: Parse PDFs
        manifests = []
        for pdf_path in pdf_files:
            manifest = load_pdf_build_page_index(str(pdf_path), config.artifacts_dir)
            manifests.append(manifest)
        
        # Step 2: Chunk all documents
        all_chunks = []
        for manifest in manifests:
            chunks = make_page_chunks(manifest, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
            all_chunks.extend(chunks)
        
        logger.info(f"Generated {len(all_chunks)} chunks")
        
        # Step 3: Build FAISS index
        vs = build_faiss(all_chunks, str(config.db_dir), embedding_model=embedding_model)
        
        # Update config
        config.embedding_model = embedding_model
        config.chunk_size = chunk_size
        config.chunk_overlap = chunk_overlap
        
        return IndexStatus(
            total_documents=len(pdf_files),
            total_chunks=len(all_chunks),
            embedding_model=embedding_model,
            status="success"
        )
        
    except Exception as e:
        logger.error(f"Indexing failed: {e}")
        raise HTTPException(500, f"Indexing failed: {str(e)}")


@router.get("/", response_model=List[DocumentInfo])
async def list_documents():
    """List all indexed documents"""
    
    documents = []
    
    # Read manifests from artifacts
    if config.artifacts_dir.exists():
        for doc_dir in config.artifacts_dir.iterdir():
            if doc_dir.is_dir():
                manifest_path = doc_dir / 'manifest.json'
                if manifest_path.exists():
                    with open(manifest_path, 'r') as f:
                        manifest = json.load(f)
                        documents.append(DocumentInfo(
                            doc_id=manifest['doc_id'],
                            name=manifest['name'],
                            num_pages=manifest['num_pages'],
                            source_path=manifest['source_path']
                        ))
    
    return documents


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its artifacts"""
    
    # Find and delete document directory
    doc_dir = config.artifacts_dir / doc_id
    
    if not doc_dir.exists():
        raise HTTPException(404, f"Document not found: {doc_id}")
    
    import shutil
    shutil.rmtree(doc_dir)
    
    logger.info(f"Deleted document: {doc_id}")
    
    return {"message": f"Deleted document {doc_id}"}


@router.get("/status")
async def index_status():
    """Check if index exists and is ready"""
    
    index_path = config.db_dir / "index.faiss"
    
    if not index_path.exists():
        return {
            "indexed": False,
            "message": "No index found. Upload PDFs and run indexing."
        }
    
    try:
        vs = load_faiss(str(config.db_dir), embedding_model=config.embedding_model)
        return {
            "indexed": True,
            "message": "Index ready",
            "embedding_model": config.embedding_model
        }
    except Exception as e:
        return {
            "indexed": False,
            "message": f"Index corrupted: {str(e)}"
        }


@router.post("/highlight")
async def generate_highlighted_pdf(
    doc_id: str = Form(...),
    page: int = Form(...),
    span_start: int = Form(...),
    span_end: int = Form(...)
):
    """Generate a highlighted PDF for a specific citation"""
    
    try:
        # Find document manifest
        doc_dir = config.artifacts_dir / doc_id
        if not doc_dir.exists():
            raise HTTPException(404, f"Document not found: {doc_id}")
        
        manifest_path = doc_dir / 'manifest.json'
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        source_path = manifest['source_path']
        page_index_path = manifest['page_index_path']
        
        if not Path(source_path).exists():
            raise HTTPException(404, f"Source PDF not found: {source_path}")
        
        # Create highlight specification
        highlights = [{
            'page': page,
            'span_start': span_start,
            'span_end': span_end
        }]
        
        # Generate highlighted PDF in temp directory
        temp_dir = Path(tempfile.gettempdir()) / 'rag_highlights'
        temp_dir.mkdir(exist_ok=True)
        
        output_filename = f"{doc_id}_p{page}_highlighted.pdf"
        output_path = temp_dir / output_filename
        
        # Annotate PDF
        annotate_pdf(source_path, page_index_path, highlights, str(output_path))
        
        logger.info(f"Generated highlighted PDF: {output_path}")
        
        # Return the file
        return FileResponse(
            path=str(output_path),
            media_type='application/pdf',
            filename=output_filename
        )
        
    except Exception as e:
        logger.error(f"Failed to generate highlighted PDF: {e}")
        raise HTTPException(500, f"Failed to generate highlighted PDF: {str(e)}")
