# backend/api/llm/clients/groq_client.py
from __future__ import annotations

import os
from typing import Dict, Generator, Iterable, List, Optional
from dataclasses import dataclass

try:
    # pip install groq
    from groq import Groq
except ImportError as e:
    Groq = None  # Avoid import-time crash; we check at runtime


@dataclass
class LLMMessage:
    role: str  # "system" | "user" | "assistant"
    content: str


class GroqLLMClient:
    """
    Thin wrapper around the Groq Chat Completions API with support for streaming.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "llama-3.3-70b-versatile",
        temperature: float = 0.3,
        max_tokens: int = 2048,
    ):
        if Groq is None:
            raise RuntimeError(
                "groq package is not installed. Run: pip install groq"
            )
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise RuntimeError(
                "GROQ_API_KEY is not set. Please define it in your environment."
            )
        self.client = Groq(api_key=self.api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    @staticmethod
    def _to_messages(
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> List[Dict[str, str]]:
        """
        Convert (system, history, user prompt) into Groq message format.
        History format (optional): [{"role":"user","content":"..."},{"role":"assistant","content":"..."}]
        """
        msgs: List[Dict[str, str]] = []
        if system_prompt:
            msgs.append({"role": "system", "content": system_prompt})

        if history:
            # Only keep valid roles and non-empty content
            for m in history:
                role = m.get("role")
                content = m.get("content", "")
                if role in ("system", "user", "assistant") and content:
                    msgs.append({"role": role, "content": content})

        # Current user prompt at the end
        msgs.append({"role": "user", "content": prompt})
        return msgs

    def chat(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> str:
        """
        Non-streaming chat; returns full text.
        """
        _model = model or self.model
        _temp = self._sanitize_temperature(temperature, default=self.temperature)
        _max = max_tokens or self.max_tokens

        messages = self._to_messages(prompt, system_prompt, history)

        resp = self.client.chat.completions.create(
            model=_model,
            messages=messages,
            temperature=_temp,
            max_tokens=_max,
            stream=False,
        )
        # Groq returns choices list with message content
        return resp.choices[0].message.content or ""

    def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
    ) -> Iterable[str]:
        """
        Streaming generator yielding token deltas as strings.
        """
        _model = model or self.model
        _temp = self._sanitize_temperature(temperature, default=self.temperature)
        _max = max_tokens or self.max_tokens

        messages = self._to_messages(prompt, system_prompt, history)

        stream = self.client.chat.completions.create(
            model=_model,
            messages=messages,
            temperature=_temp,
            max_tokens=_max,
            stream=True,
        )
        for chunk in stream:
            # Each chunk may contain a delta with content
            delta = None
            try:
                delta = chunk.choices[0].delta.content
            except Exception:
                delta = None
            if delta:
                yield delta

    @staticmethod
    def _sanitize_temperature(value: Optional[float], default: float = 0.3) -> float:
        if value is None:
            return default
        try:
            v = float(value)
        except Exception:
            return default
        # clamp to [0, 2] typical range
        return max(0.0, min(2.0, v))