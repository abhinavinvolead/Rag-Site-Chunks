# backend/api/routes/llm.py
from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator, Optional, List, Dict

from fastapi import APIRouter, HTTPException, Depends, Query
from sse_starlette.sse import EventSourceResponse

from api.schemas.requests import ChatRequest
from api.schemas.responses import ChatResponse
from core.config import AppConfig
from core.logging import get_logger

from api.llm.clients.groq_clients import GroqLLMClient

router = APIRouter(prefix="/api/llm", tags=["LLM"])
logger = get_logger()
config = AppConfig()


def get_llm_client() -> GroqLLMClient:
    """
    Dependency returning an initialized Groq client based on AppConfig.
    Falls back to environment variables if not present in config.
    """
    try:
        # Optional: if your AppConfig exposes groq-specific defaults
        default_model = getattr(config, "llm_model", "llama-3.3-70b-versatile")
        default_temp = getattr(config, "temperature", 0.3)
        default_max = getattr(config, "max_tokens", 2048)

        # If AppConfig provides a groq_api_key, prefer it; otherwise env will be used
        groq_key = getattr(config, "groq_api_key", None)

        return GroqLLMClient(
            api_key=groq_key,
            model=default_model,
            temperature=default_temp,
            max_tokens=default_max,
        )
    except Exception as e:
        logger.error(f"LLM client init failed: {e}")
        raise HTTPException(status_code=500, detail=f"LLM client init failed: {str(e)}")


@router.get("/stream")
async def llm_stream(
    query: str = Query(..., description="User prompt"),
    system_prompt: Optional[str] = Query(None, description="Optional system prompt"),
    llm_model: Optional[str] = Query(None, description="Override default model"),
    temperature: Optional[float] = Query(None, description="Override default temperature"),
    max_tokens: Optional[int] = Query(None, description="Override default max tokens"),
    client: GroqLLMClient = Depends(get_llm_client),
):
    """
    Streaming chat endpoint (LLM-only, no retrieval).
    Emits SSE events:
      - event: token   data: {"token": "<delta>"}
      - event: done    data: {"model": "<model>"}
      - event: error   data: {"error": "<message>"}
    """
    logger.info(f"[LLM stream] model={llm_model or client.model} temp={temperature or client.temperature}")

    async def event_gen() -> AsyncGenerator[dict, None]:
        try:
            # Iterate over Groq streaming generator
            for delta in client.stream(
                prompt=query,
                system_prompt=system_prompt,
                history=None,  # extend to pass history if needed
                model=llm_model,
                temperature=temperature,
                max_tokens=max_tokens,
            ):
                yield {
                    "event": "token",
                    "data": json.dumps({"token": delta}),
                }
                # Tiny await to keep event loop responsive
                await asyncio.sleep(0)

            yield {
                "event": "done",
                "data": json.dumps({"model": llm_model or client.model}),
            }
        except Exception as e:
            logger.error(f"[LLM stream] error: {e}")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_gen())


@router.post("/", response_model=ChatResponse)
async def llm_chat(
    request: ChatRequest,
    client: GroqLLMClient = Depends(get_llm_client),
):
    """
    Non-streaming LLM-only chat.
    Reuses your ChatResponse schema; citations returned as [].
    """
    # Allow request-level overrides while preserving config defaults
    llm_model = request.llm_model or client.model
    temperature = request.temperature if request.temperature is not None else client.temperature
    # keep your request.query as the user prompt
    prompt = request.query

    try:
        answer = client.chat(
            prompt=prompt,
            system_prompt=None,
            history=None,
            model=llm_model,
            temperature=temperature,
            max_tokens=getattr(request, "max_tokens", None),
        )
        # Citations are empty for pure LLM chat
        return ChatResponse(
            answer=answer,
            citations=[],
            model_used=llm_model,
            query=prompt,
        )
    except Exception as e:
        logger.error(f"[LLM chat] error: {e}")
        raise HTTPException(status_code=500, detail=f"LLM chat failed: {str(e)}")
