 # span->bbox mapping + annotate PDF with highlights

from typing import Dict, List, Tuple
import json
from pathlib import Path
import fitz  # PyMuPDF

Rect = Tuple[float, float, float, float]


def _load_page_index(page_index_path: str) -> Dict:
    with open(page_index_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def spans_to_bboxes(page_payload: Dict, span_start: int, span_end: int) -> List[Rect]:
    """Given page payload (with words including offsets), return bbox list covering the span.
    We select all words where [s,e] overlaps [span_start, span_end].
    """
    rects: List[Rect] = []
    for w in page_payload.get('words', []):
        s, e = w['s'], w['e']
        if e <= span_start or s >= span_end:
            continue
        x0, y0, x1, y1 = w['bbox']
        rects.append((x0, y0, x1, y1))
    return rects


def annotate_pdf(source_path: str, page_index_path: str, highlights: List[Dict], output_path: str) -> str:
    """Create a copy of the PDF with highlight annotations.
    highlights: list of {page, span_start, span_end}
    Returns output_path
    """
    page_index = _load_page_index(page_index_path)
    doc = fitz.open(source_path)

    for h in highlights:
        page_no = int(h['page'])
        payload = page_index.get(str(page_no))
        if not payload:
            continue
        rects = spans_to_bboxes(payload, int(h['span_start']), int(h['span_end']))
        if not rects:
            continue
        page = doc[page_no - 1]
        for r in rects:
            annot = page.add_highlight_annot(r)
            if annot:
                annot.set_colors(stroke=(1, 1, 0))  # yellow
                annot.update()

    doc.save(output_path)
    doc.close()
    return output_path
