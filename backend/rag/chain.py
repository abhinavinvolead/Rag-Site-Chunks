# rag/chain.py - Enhanced with streaming and temperature control
from typing import Dict, List
from operator import itemgetter

from langchain_ollama import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda

from rag.prompts import ANSWER_PROMPT


def _format_docs(docs: List) -> str:
    """Deduplicate and format documents for context"""
    seen = set()
    lines = []
    
    for d in docs:
        meta = getattr(d, 'metadata', {}) or {}
        key = (meta.get('name'), meta.get('page'), meta.get('paragraph_num'))
        
        if key in seen:
            continue
        
        seen.add(key)
        snippet = (getattr(d, 'page_content', '') or '').strip()
        
        if len(snippet) > 600:
            snippet = snippet[:600] + '…'
        
        para_num = meta.get('paragraph_num', 1)
        lines.append(f"[{meta.get('name')} p.{meta.get('page')}, ¶{para_num}] {snippet}")
    
    return "\n\n".join(lines)


def build_rag_chain(retriever, *, llm_model: str = "gemma2:2b", temperature: float = 0.3):
    """
    Build RAG chain with streaming support
    
    Args:
        retriever: LangChain retriever
        llm_model: Ollama model ID
        temperature: Sampling temperature (0.0-2.0)
    
    Returns:
        Streamable RAG chain
    """
    
    # Initialize LLM with temperature control
    llm = ChatOllama(
        model=llm_model,
        temperature=temperature,
        num_ctx=4096,  # Context window
    )
    
    # Build chain with streaming support
    chain = (
        {
            "context": RunnableLambda(lambda q: _format_docs(retriever.invoke(q["input"]))),
            "question": itemgetter("input"),
            "raw_docs": RunnableLambda(lambda q: retriever.invoke(q["input"])),
        }
        | ANSWER_PROMPT
        | llm
        | StrOutputParser()
    )
    
    return chain


def postprocess_citations(raw_docs: List) -> List[Dict]:
    """Extract citation metadata from retrieved documents"""
    citations = []
    
    for d in raw_docs:
        m = d.metadata or {}
        citations.append({
            "doc_id": m.get("doc_id"),
            "name": m.get("name"),
            "source_path": m.get("source_path"),
            "page": m.get("page"),
            "paragraph_num": m.get("paragraph_num", 1),
            "span_start": m.get("span_start"),
            "span_end": m.get("span_end"),
            "chunk_preview": (d.page_content or '')[:200],
        })
    
    # Keep top 10 most relevant
    return citations[:10]
