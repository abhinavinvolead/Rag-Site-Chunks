 # (simple) panels for “Relevant PDFs” (extensible)

from typing import List, Dict
import streamlit as st
from pathlib import Path


def show_relevant_pdfs(citations: List[Dict]):
    if not citations:
        st.info("No citations returned.")
        return
    # Group by name
    by_name = {}
    for c in citations:
        by_name.setdefault(c['name'], []).append(c)
    for name, items in by_name.items():
        with st.expander(f"{name} – {len(items)} match(es)", expanded=True):
            for it in items:
                st.markdown(f"• Page **{it['page']}** — _{it['chunk_preview']}…_")
