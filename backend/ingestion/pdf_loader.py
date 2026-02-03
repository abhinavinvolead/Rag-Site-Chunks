# PyMuPDF parsing -> page text + word bboxes + offsets

from pathlib import Path
from typing import Dict, List, Tuple
# import fitz  # PyMuPDF library that reads and parses PDFs
import json


try:
    import pymupdf as fitz   # PyMuPDF ≥ 1.24.3 preferred import name
except ImportError:
    import fitz 


from core.logging import get_logger
from utils.paths import doc_artifacts_dir, safe_filename
from utils.ids import new_id


logger = get_logger()

Word = Tuple[str, Tuple[float, float, float, float], int, int]  # (text, bbox, start, end) 
            #(text, bounding_box, start_offset, end_offset)


def load_pdf_build_page_index(pdf_path: str, artifacts_dir: Path) -> Dict:
    """Parse PDF and build a page index containing full page text and word-level bbox mapping.
    Returns a manifest dict with doc_id, source_path, pages meta, and index file path.
    """
    pdf_path = Path(pdf_path)
    doc = fitz.open(pdf_path)

    # Assign a stable doc_id
    doc_id = new_id("doc")
    target_dir = doc_artifacts_dir(artifacts_dir, doc_id)

    pages = [] #store per-page metadata(page number, text length)
    page_index = {} # stores full text and also word-level data per page

    for pno in range(len(doc)): #iterate over each page number in the doc
        page = doc[pno] #gets actual page OBJECT
        # Get words: list of (x0,y0,x1,y1, word, block_no, line_no, word_no)
        words = page.get_text("words")

        # Construct page text and track offsets
        # We'll build text by joining words with spaces following reading order

        words_sorted = sorted(words, key=lambda w: (w[5], w[6], w[7])) #ensured natural reading order
        page_text_tokens = []
        word_entries: List[Word] = [] #Stores structured word info (text, bbox, offsets).
        cursor = 0
        for w in words_sorted:
            x0, y0, x1, y1, t, *_ = w #extracts bounding box, text and ignores the remaining metadata.
            t = t or ""
            if page_text_tokens:
                page_text_tokens.append(" ")
                cursor += 1
            start = cursor
            page_text_tokens.append(t)
            cursor += len(t)
            end = cursor
            word_entries.append((t, (x0, y0, x1, y1), start, end)) #stores: word text, bounding box, character offsets
        page_text = "".join(page_text_tokens) #joins all tokens into one page string

        pages.append({
            "page": pno + 1,
            "text_len": len(page_text),
        })
        # Save word map per page
        # stores word-level details in JSON-friendly format
        page_index[str(pno + 1)] = {
            "text": page_text,
            "words": [
                {"t": t, "bbox": bbox, "s": s, "e": e}
                for (t, bbox, s, e) in word_entries
            ],
        }

    index_path = target_dir / "page_index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(page_index, f)   # Writes the page index to JSON or we can say saves the word map per page
    

    manifest = {
        "doc_id": doc_id,
        "source_path": str(pdf_path.resolve()), # Absolute path to the original PDF
        "name": safe_filename(pdf_path.name),
        "num_pages": len(doc),
        "page_index_path": str(index_path.resolve()), # path of page index JSON.
        "pages": pages,
    }

    # Save manifest
    with open(target_dir / 'manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f)      # writes the manifest to the disk

    logger.info(f"Indexed '{pdf_path.name}' as {doc_id} with {len(doc)} pages")
    return manifest
