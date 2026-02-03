# slim Streamlit UI that ties the whole pipeline together

import os
from pathlib import Path
import streamlit as st
import json
from core.config import AppConfig
from core.logging import get_logger
from ingestion.pdf_loader import load_pdf_build_page_index
from ingestion.chunker import make_page_chunks
from ingestion.embed_store import build_faiss, load_faiss
from retrieval.search import as_retriever
from rag.chain import build_rag_chain, postprocess_citations
from highlight.annotator import annotate_pdf


import base64
import re
import streamlit.components.v1 as components

import uuid

logger = get_logger()

st.set_page_config(page_title="Multi‑PDF RAG with Highlights", page_icon="📄", layout="wide")


import sys, streamlit as st
st.write("Python:", sys.executable)


cfg = AppConfig()
cfg.ensure_dirs()

st.sidebar.header("⚙️ Settings")
llm_model = st.sidebar.text_input("LLM (Ollama)", value=cfg.llm_model)
emb_model = st.sidebar.text_input("Embeddings (Ollama)", value=cfg.embedding_model)
chunk_size = st.sidebar.slider("Chunk size", 400, 1600, cfg.chunk_size, 50)
chunk_overlap = st.sidebar.slider("Chunk overlap", 0, 300, cfg.chunk_overlap, 10)
top_k = st.sidebar.slider("Top‑K", 2, 15, cfg.top_k)
fetch_k = st.sidebar.slider("Fetch‑K", 10, 50, cfg.fetch_k)
min_score = st.sidebar.slider("Min score (display only)", 0.0, 1.0, cfg.min_score, 0.01)

st.title("📄🔍 RAG over Multiple PDFs — with Source Highlights")

# Upload area
st.subheader("Documents")
uploaded = st.file_uploader("Upload one or more PDFs", type=["pdf"], accept_multiple_files=True)
if uploaded:
    for uf in uploaded:
        out = cfg.data_dir / uf.name
        with open(out, 'wb') as f:
            f.write(uf.read())
    st.success(f"Saved {len(uploaded)} file(s) to ./{cfg.data_dir.name}")

# Index controls
c1, c2, c3 = st.columns(3)
with c1:
    if st.button("🛠️ Build / Rebuild Index", type="primary"):
        manifests = []
        for pdf in sorted(cfg.data_dir.glob('*.pdf')):
            m = load_pdf_build_page_index(str(pdf), cfg.artifacts_dir)
            manifests.append(m)
        # Chunk & embed all
        all_docs = []
        for m in manifests:
            all_docs.extend(make_page_chunks(m, chunk_size=chunk_size, chunk_overlap=chunk_overlap))
        logger.info("A step before building vector store")
        vs = build_faiss(all_docs, str(cfg.db_dir), embedding_model=emb_model)
        st.session_state['vectorstore'] = vs
        st.success("Vector index built.")
with c2:
    if st.button("📦 Load Existing Index"):
        vs = load_faiss(str(cfg.db_dir), embedding_model=emb_model)
        st.session_state['vectorstore'] = vs
        st.success("Vector index loaded.")
with c3:
    if st.button("🧹 Clear Index & Artifacts"):
        for p in [cfg.db_dir, cfg.artifacts_dir]:
            if p.exists():
                for item in p.glob('*'):
                    if item.is_file():
                        item.unlink()
                    else:
                        import shutil
                        shutil.rmtree(item, ignore_errors=True)
        st.success("Cleared.")

vs = st.session_state.get('vectorstore')
if not vs:
    st.info("Upload PDFs and build or load the index to start chatting.")
    st.stop()

# Build chain
retriever = as_retriever(vs, k=top_k, fetch_k=fetch_k, use_mmr=True)
rag_chain = build_rag_chain(retriever, llm_model=llm_model)

st.subheader("Chat")
query = st.chat_input("Ask a question about your PDFs…")

if 'history' not in st.session_state:
    st.session_state['history'] = []

for m in st.session_state['history']:
    with st.chat_message(m['role']):
        st.markdown(m['content'])

# helper: embed PDF using a component-local blob URL (avoids Edge/data: blocking and body-injection issues)
def embed_pdf_bytes_in_browser(pdf_bytes: bytes, page_number: int = 1, height: int = 700):
        """Render PDF bytes inside the Streamlit component using PDF.js.

        This avoids data: URI / blob iframe blocking by rendering the PDF
        inside the component via PDF.js (loads from CDN). Renders the
        requested `page_number`.
        """
        b64 = base64.b64encode(pdf_bytes).decode("ascii")
        uid = uuid.uuid4().hex
        # Use PDF.js from CDN. We render the requested page into a canvas.
        # This approach avoids creating blob URLs or data: URIs in iframes.
        pdfjs_cdn = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js"
        pdfjs_worker = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js"
        html = f"""
        <div id="pdf_container_{uid}" style="width:100%;height:{height}px;background:#fff;overflow:auto;">
            <div id="pdf_inner_{uid}"></div>
        </div>
        <script src="{pdfjs_cdn}"></script>
        <script>
        (function() {{
            const b64 = "{b64}";
            const pageToRender = {page_number};
            try {{
                pdfjsLib.GlobalWorkerOptions.workerSrc = '{pdfjs_worker}';
            }} catch(e) {{ /* ignore if pdfjsLib not present yet */ }}
            function b64ToUint8Array(b64Str) {{
                const binary = atob(b64Str);
                const len = binary.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
                return bytes;
            }}
            (async function() {{
                try {{
                    const bytes = b64ToUint8Array(b64);
                    const loadingTask = pdfjsLib.getDocument({{data: bytes}});
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(pageToRender);
                    const viewport = page.getViewport({{scale: 1.5}});
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    canvas.style.width = '100%';
                    canvas.style.height = 'auto';
                    const ctx = canvas.getContext('2d');
                    const renderContext = {{canvasContext: ctx, viewport: viewport}};
                    const container = document.getElementById('pdf_inner_{uid}');
                    container.innerHTML = '';
                    container.appendChild(canvas);
                    await page.render(renderContext).promise;
                }} catch(err) {{
                    const container = document.getElementById('pdf_container_{uid}');
                    if (container) container.innerText = 'PDF preview failed: ' + err;
                }}
            }})();
        }})();
        </script>
        """
        components.html(html, height=height + 30)
# ...existing code...
# After chat_input/history display - replace handling to persist state across reruns
if query:
    st.session_state['history'].append({"role": "user", "content": query})
    with st.chat_message("user"):
        st.markdown(query)
    with st.chat_message("assistant"):
        with st.spinner("Thinking…"):
            resp = rag_chain.invoke({"input": query})
            # store raw response text
            st.session_state['last_query'] = query
            st.session_state['last_response'] = resp

            # retrieve docs & produce citations (persist to session_state)
            raw_docs = retriever.invoke(query)
            citations = postprocess_citations(raw_docs)
            st.session_state['last_citations'] = citations

            by_doc_map = {}
            for c in citations:
                by_doc_map.setdefault(c['name'], []).append(c)
            st.session_state['last_citations_by_doc'] = by_doc_map

            # Sentence-level semantic verification/correction (hybrid)
            vs = st.session_state.get('vectorstore')
            sentences = [s.strip() for s in re.split(r'(?<=[\.\?\!])\s+', resp) if s.strip()]
            sentence_citations = []
            for idx, sent in enumerate(sentences, start=1):
                chosen = {"sentence": sent, "idx": idx, "score": None, "name": None}
                try:
                    results = vs.similarity_search_with_score(sent, k=1)
                except Exception:
                    results = []
                if results:
                    doc, score = results[0]
                    meta = getattr(doc, "metadata", {}) or {}
                    chosen.update({
                        "score": score,
                        "name": meta.get("name") or meta.get("source") or "unknown",
                        "page": meta.get("page") or meta.get("page_number"),
                        "span_start": meta.get("span_start"),
                        "span_end": meta.get("span_end"),
                        "chunk_preview": meta.get("chunk_preview") or (getattr(doc, "page_content", "")[:200]),
                        "source_path": meta.get("source_path") or meta.get("source")
                    })
                sentence_citations.append(chosen)
            st.session_state['sentence_citations'] = sentence_citations

            st.session_state['history'].append({"role": "assistant", "content": resp})

# Display last response + citations from session_state so UI survives reruns
if 'last_response' in st.session_state:
    resp = st.session_state['last_response']
    sentence_citations = st.session_state.get('sentence_citations', [])
    # build marked response with numeric markers
    displayed_resp_lines = []
    for sc in sentence_citations:
        marker = f"[{sc['idx']}]" if sc.get('name') else ""
        displayed_resp_lines.append(f"{sc['sentence']} {marker}")
    displayed_resp = "  \n".join(displayed_resp_lines)

    st.markdown("### Answer (with sentence-level attributions)")
    st.markdown(displayed_resp)

    st.markdown("### Citations (click to jump / highlight)")
    for sc in sentence_citations:
        with st.container():
            cols = st.columns([0.08, 0.78, 0.14])
            cols[0].markdown(f"**{sc['idx']}**")
            cols[1].markdown(f"{sc.get('name','')} — Page **{sc.get('page','?')}** — _{(sc.get('chunk_preview') or '')[:120]}…_")
            # button only sets a request in session_state (click triggers a rerun, but data persists)
            if cols[2].button("Jump", key=f"jump_{sc['idx']}_{sc.get('name')}"):
                st.session_state['jump_request'] = {"idx": sc['idx'], "name": sc.get('name')}

    # Grouped sources / annotate entire doc buttons + download
    st.markdown("### Sources")
    citations = st.session_state.get('last_citations', [])
    if not citations:
        st.info("No sources found.")
    else:
        by_doc = {}
        for c in citations:
            by_doc.setdefault(c['name'], []).append(c)

        for name, items in by_doc.items():
            with st.expander(f"{name} — {len(items)} match(es)", expanded=True):
                for it in items:
                    st.markdown(f"• Page **{it['page']}** — _{it['chunk_preview']}…_")

                if st.button(f"📄 Annotate & Download – {name}", key=f"annot_{name}"):
                    st.session_state['annot_request'] = name

                pdf_key = f'annotated_pdf_{name}'
                if pdf_key in st.session_state:
                    ann_path = st.session_state[pdf_key]
                    if Path(ann_path).exists():
                        with open(ann_path, 'rb') as pdf_file:
                            pdf_bytes = pdf_file.read()
                        st.download_button(
                            label=f"⬇️ Download {name} (with highlights)",
                            data=pdf_bytes,
                            file_name=f"annotated_{name}.pdf",
                            mime='application/pdf',
                            key=f"dl_{name}"
                        )
                    else:
                        st.warning("Annotated PDF file not found. Please regenerate.")

# Process any pending requests AFTER rendering (so persistent data is available)
# Jump request: create single-highlight PDF and embed
if 'jump_request' in st.session_state:
    req = st.session_state.pop('jump_request')
    idx = req.get('idx')
    name = req.get('name')
    sentence_citations = st.session_state.get('sentence_citations', [])
    sc = next((s for s in sentence_citations if s['idx'] == idx and s.get('name') == name), None)
    if not sc:
        st.error("Citation not found for the requested sentence. Ask the question again.")
    else:
        highs = [{"page": sc.get('page'), "span_start": sc.get('span_start'), "span_end": sc.get('span_end')}]
        source_path = sc.get('source_path')
        sel_index = None
        for mpath in Path(cfg.artifacts_dir).glob('*/manifest.json'):
            try:
                m = json.loads(Path(mpath).read_text())
            except Exception:
                m = {}
            if m.get('source_path') == source_path:
                sel_index = m.get('page_index_path')
                break
        if not sel_index:
            st.warning("Page index not found; cannot create highlight.")
        else:
            out_name = f"annot_sentence_{idx}_{name}".replace(" ", "_")
            out_path = Path(cfg.artifacts_dir) / out_name
            out_path = out_path.with_suffix('.pdf')
            try:
                annotate_pdf(source_path, sel_index, highs, str(out_path))
                with open(out_path, "rb") as f:
                    pdf_bytes = f.read()
                # Render the specific page that contains the highlight (fallback to 1)
                page_num = sc.get('page') or 1
                embed_pdf_bytes_in_browser(pdf_bytes, page_number=page_num, height=700)
                st.session_state[f'annotated_pdf_{name}'] = str(out_path)
            except Exception as e:
                st.error(f"Annotation failed: {e}")
                logger.error(f"Annotation failed: {e}")

# Annotate whole-document request
if 'annot_request' in st.session_state:
    req_name = st.session_state.pop('annot_request')
    by_doc_map = st.session_state.get('last_citations_by_doc', {})
    items = by_doc_map.get(req_name)
    if not items:
        st.error("Citation data for requested document not found. Ask the question again.")
    else:
        highs = [
            {"page": it['page'], "span_start": it['span_start'], "span_end": it['span_end']}
            for it in items
        ]
        source_path = items[0]['source_path']
        sel_index = None
        for mpath in Path(cfg.artifacts_dir).glob('*/manifest.json'):
            try:
                m = json.loads(Path(mpath).read_text())
            except Exception:
                m = {}
            if m.get('source_path') == source_path:
                sel_index = m.get('page_index_path')
                break
        if sel_index:
            out_name = f"annot_{req_name}".replace(" ", "_")
            out_path = Path(cfg.artifacts_dir) / out_name
            out_path = out_path.with_suffix('.pdf')
            try:
                annotate_pdf(source_path, sel_index, highs, str(out_path))
                st.session_state[f'annotated_pdf_{req_name}'] = str(out_path)
                st.success("✅ Annotated PDF created successfully!")
            except Exception as e:
                st.error(f"Error creating annotated PDF: {str(e)}")
                logger.error(f"Annotation failed: {e}")
        else:
            st.warning("⚠️ Page index not found; cannot annotate.")
# ...existing code...