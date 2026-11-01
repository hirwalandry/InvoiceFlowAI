import os
from typing import List, Tuple, Dict, Any
from pathlib import Path

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except Exception:
    PDFPLUMBER_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except Exception:
    PIL_AVAILABLE = False

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except Exception:
    PYTESSERACT_AVAILABLE = False

try:
    import fitz  # pymupdf
    PYMUPDF_AVAILABLE = True
except Exception:
    PYMUPDF_AVAILABLE = False


class OCRService:
    def __init__(self):
        self.upload_dir = os.getenv("UPLOAD_DIR", "/app/uploads")
        
    def extract_text(self, file_path: str) -> Tuple[str, List[Dict[str, Any]]]:
        ext = Path(file_path).suffix.lower()
        text_pages = []
        bboxes = []
        
        if ext == '.pdf':
            if PDFPLUMBER_AVAILABLE:
                try:
                    with pdfplumber.open(file_path) as pdf:
                        for page_num, page in enumerate(pdf.pages, 1):
                            page_text = page.extract_text() or ""
                            text_pages.append(page_text)
                            words = page.extract_words()
                            for w in words:
                                bboxes.append({
                                    "text": w.get("text", ""),
                                    "x": w.get("x0", 0),
                                    "y": w.get("top", 0),
                                    "width": w.get("x1", 0) - w.get("x0", 0),
                                    "height": w.get("bottom", 0) - w.get("top", 0),
                                    "page": page_num
                                })
                    return "\n\n".join(text_pages), bboxes
                except Exception as e:
                    print(f"pdfplumber error: {e}")
            
            if PYMUPDF_AVAILABLE:
                try:
                    doc = fitz.open(file_path)
                    full_text = []
                    for page_num in range(len(doc)):
                        page = doc[page_num]
                        text = page.get_text()
                        full_text.append(text)
                        words = page.get_text("words")
                        for w in words:
                            bboxes.append({
                                "text": w[4] if len(w) > 4 else "",
                                "x": w[0], "y": w[1], 
                                "width": w[2] - w[0], 
                                "height": w[3] - w[1],
                                "page": page_num + 1
                            })
                    doc.close()
                    return "\n\n".join(full_text), bboxes
                except Exception as e:
                    print(f"pymupdf error: {e}")
        else:
            if PIL_AVAILABLE and PYTESSERACT_AVAILABLE:
                try:
                    image = Image.open(file_path)
                    text = pytesseract.image_to_string(image)
                    data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                    for i in range(len(data['text'])):
                        if data['text'][i].strip():
                            bboxes.append({
                                "text": data['text'][i],
                                "x": data['left'][i],
                                "y": data['top'][i],
                                "width": data['width'][i],
                                "height": data['height'][i],
                                "page": 1
                            })
                    return text, bboxes
                except Exception as e:
                    print(f"tesseract error: {e}")
        
        # Fallback
        return "", bboxes
