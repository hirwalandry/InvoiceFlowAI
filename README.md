# InvoiceFlow AI — Automated Invoice Validation

**The problem:** Companies processing hundreds of supplier invoices monthly waste hours on repetitive manual checks — incorrect totals, missing fields, duplicates, unverified POs.  
**The solution:** Extract → Validate → Flag. Automate the checks that can be codified; surface the uncertain ones for human review.

---

## Business Problem

| Manual Pain Point | Automated Check |
|---|---|
| "Is the math right?" | Subtotal + Tax = Total; line items sum to subtotal |
| "Did we miss required fields?" | Vendor name, invoice number, date, total |
| "Is this a duplicate?" | Same invoice number + vendor already approved |
| "Does this need PO matching?" | PO reference detected → flag for verification |

**Philosophy:** Automation shouldn't auto-approve everything. When rules fail, the invoice goes to **Review** with severity-tagged issues and a full audit trail.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  Upload     │────▶│   OCR        │────▶│  LLM Extraction │────▶│  Validation      │
│  (API)      │     │  (Tesseract) │     │  (Groq LLM)     │     │  Engine          │
└─────────────┘     └──────────────┘     └─────────────────┘     └──────────────────┘
                                                                        │
                                                                        ▼
                                                               ┌──────────────────┐
                                                               │  Review Queue    │
                                                               │  (Human in loop) │
                                                               └──────────────────┘
                                                                        │
                                                                        ▼
                                                               ┌──────────────────┐
                                                               │  Audit Log       │
                                                               │  (Full trace)    │
                                                               └──────────────────┘
```

**Services:**
- **API** (FastAPI) — upload, auth, invoice CRUD, review queue
- **Celery Worker** — async OCR + LLM extraction + validation
- **PostgreSQL** — invoices, line items, audit logs, users
- **Redis** — Celery broker

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- Groq API key (free tier works)

### 1. Clone & configure
```bash
git clone <your-repo>
cd InvoiceFlowAI_clean
cp backend/.env.example backend/.env   # add GROQ_API_KEY
```

### 2. Run
```bash
docker compose up --build -d
```

Services:
- API: `http://localhost:8000` (Swagger at `/docs`)
- Celery: background worker (logs in `docker logs invoiceflow-celery`)
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### 3. Test flow
```bash
# Register + login
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret"}'

# Upload invoice (PDF/image)
curl -X POST http://localhost:8000/api/invoices/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@sample_invoice.pdf"

# Check review queue
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/api/invoices/review-count
```

---

## Configuration

`backend/.env`:
```env
GROQ_API_KEY=your_key
EXTRACTION_MODEL=openai/gpt-oss-20b
USE_LLM_EXTRACTION=true
```

---

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, Celery, Pydantic
- **OCR:** Tesseract (via pytesseract) + pdfplumber / PyMuPDF
- **LLM:** Groq (OpenAI-compatible) with JSON schema enforcement
- **Validation:** Rule engine in `ValidationEngine` class
- **DB:** PostgreSQL + Alembic migrations

---

## OCR Choice & Tradeoffs

**Current: Tesseract (free, local)**
- Runs on CPU, no API costs, full privacy
- Known limitation: reads characters through a "hole" — no layout awareness
- Misreads like `3hrs` → `shrs`, `100` → `400` on noisy scans
- Low-confidence tokens are surfaced to LLM + validation layer as mitigation

**Better path (when budget allows): Vision model**
- Send the invoice image directly to a vision-capable LLM (GPT-4o, Claude, Qwen2.5-VL, Gemini)
- Sees the whole page: columns, headers, context
- Understands "this is the Qty column" → won't confuse `3` with `s`
- Can run locally via Ollama (Qwen2.5-VL) for zero API cost if GPU available

**Migration path:** Swap `OCRService.extract_text()` to call vision model instead; rest of pipeline (extraction, validation, review) stays identical.

---

## Extending

- Add new rules in `ValidationEngine.validate()`
- Swap LLM via `EXTRACTION_MODEL` (any OpenAI-compatible endpoint)
- Hook webhook on `InvoiceStatus.REVIEW` for Slack/email alerts