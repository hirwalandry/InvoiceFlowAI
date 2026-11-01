import json
import os
from typing import Optional, Dict, Any
from decimal import Decimal
from app.schemas.extraction import InvoiceExtractionSchema, FullInvoiceExtractionResult, ExtractedFieldDetail, LineItemExtracted, ValidationResult

try:
    import openai
    OPENAI_AVAILABLE = True
except Exception:
    OPENAI_AVAILABLE = False

class ExtractionService:
    def __init__(self):
        self.use_llm = os.getenv("USE_LLM_EXTRACTION", "true").lower() == "true"
        self.model = os.getenv("EXTRACTION_MODEL", "llama-3.1-8b-instant")
        self.api_key = (
            os.getenv("LLM_API_KEY")
            or os.getenv("GROQ_API_KEY")
            or os.getenv("OPENROUTER_API_KEY")
            or os.getenv("OPENAI_API_KEY")
        )
        self.base_url = os.getenv("LLM_BASE_URL") or (
            "https://api.groq.com/openai/v1" if os.getenv("GROQ_API_KEY") else None
        ) or (
            "https://openrouter.ai/api/v1" if os.getenv("OPENROUTER_API_KEY") else None
        )
        self.force_low_confidence = os.getenv("FORCE_LOW_CONFIDENCE", "false").lower() == "true"

    async def extract(self, raw_text: str, invoice_id: str) -> FullInvoiceExtractionResult:
        print(f"[EXTRACT] invoice_id={invoice_id} use_llm={self.use_llm} has_key={bool(self.api_key)} model={self.model} base_url={self.base_url} text_len={len(raw_text)}")
        if self.use_llm and OPENAI_AVAILABLE and self.api_key:
            try:
                res = await self._extract_with_llm(raw_text, invoice_id)
                print(f"[EXTRACT] LLM returned invoice_id={invoice_id} avg_conf={res.average_confidence} fields={len(res.fields)} line_items={len(res.line_items)}")
                return res
            except Exception as e:
                print(f"[EXTRACT] LLM extraction failed: {e}")
                return await self._extract_with_fallback(raw_text, invoice_id)
        print(f"[EXTRACT] Using fallback for invoice_id={invoice_id}")
        res = await self._extract_with_fallback(raw_text, invoice_id)
        print(f"[EXTRACT] Fallback returned invoice_id={invoice_id} avg_conf={res.average_confidence}")
        return res

    async def _extract_with_llm(self, raw_text: str, invoice_id: str) -> FullInvoiceExtractionResult:
        if self.base_url:
            client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            client = openai.OpenAI(api_key=self.api_key)
        schema = InvoiceExtractionSchema.model_json_schema()

        system_prompt = "You are an expert invoice extraction system. Extract all invoice information accurately from the provided text. Handle variations in labeling. For dates, convert to YYYY-MM-DD if possible. For currency, identify currency symbol/code. Extract all line items with descriptions, quantities, unit prices, amounts. Return valid JSON matching the schema."

        try:
            print(f"[LLM] calling model={self.model} base_url={self.base_url}")
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Schema: {json.dumps(schema)}\n\nInvoice text:\n{raw_text[:8000]}"}
                ],
                temperature=0,
            )
            content = response.choices[0].message.content
            print(f"[LLM] raw response: {content[:800]}")
            if content.strip().startswith("```"):
                content = content.strip().strip("```json").strip("```").strip()
            data = json.loads(content)
            print(f"[LLM] parsed keys: {list(data.keys())}")
            extracted = InvoiceExtractionSchema(**data)
            confidence = 40.0 if self.force_low_confidence else 95.0
            return self._build_result(extracted, invoice_id, confidence=confidence)
        except Exception as e:
            print(f"[LLM] error: {e}")
            raise e

    async def _extract_with_fallback(self, raw_text: str, invoice_id: str) -> FullInvoiceExtractionResult:
        extracted = InvoiceExtractionSchema(
            vendor_name="",
            invoice_number="",
            line_items=[]
        )
        return self._build_result(extracted, invoice_id, confidence=40.0)

    def _build_result(self, extracted: InvoiceExtractionSchema, invoice_id: str, confidence: float) -> FullInvoiceExtractionResult:
        fields = []
        field_map = [
            ("vendor_name", "Vendor", "supplier"),
            ("vendor_address", "Vendor Address", "supplier"),
            ("vendor_email", "Vendor Email", "supplier"),
            ("invoice_number", "Invoice Number", "invoice"),
            ("invoice_date", "Invoice Date", "dates"),
            ("due_date", "Due Date", "dates"),
            ("subtotal", "Subtotal", "totals"),
            ("tax_amount", "Tax", "totals"),
            ("total_due", "Total Due", "totals"),
            ("currency", "Currency", "totals"),
            ("remit_name", "Remit To", "remit"),
            ("remit_address", "Remit To Address", "remit"),
            ("send_payment_name", "Send Payment To", "remit"),
            ("send_payment_address", "Send Payment To Address", "remit"),
            ("ship_to_name", "Ship To", "ship_to"),
            ("ship_to_address", "Ship To Address", "ship_to"),
            ("bill_to_name", "Bill To", "bill_to"),
            ("bill_to_address", "Bill To Address", "bill_to"),
            ("terms_and_conditions", "Terms & Conditions", "terms"),
        ]

        for key, label, section in field_map:
            val = getattr(extracted, key)
            fields.append(ExtractedFieldDetail(
                id=key,
                label=label,
                section=section,
                value=str(val) if val is not None else None,
                confidence=confidence,
                status="needsReview" if val is None or confidence < 85 else "verified"
            ))

        validations = []
        if extracted.total_due is not None and extracted.subtotal is not None and extracted.tax_amount is not None:
            try:
                calc = extracted.subtotal + extracted.tax_amount
                if abs(calc - extracted.total_due) > 0.01:
                    validations.append(ValidationResult(
                        rule_name="total_sum_check",
                        passed=False,
                        message=f"Subtotal + Tax ({calc}) != Total ({extracted.total_due})",
                        severity="error"
                    ))
                else:
                    validations.append(ValidationResult(
                        rule_name="total_sum_check",
                        passed=True,
                        message="Subtotal + Tax matches Total",
                        severity="warning"
                    ))
            except Exception:
                pass

        needs_review = sum(1 for f in fields if f.status == "needsReview")
        avg_conf = confidence

        return FullInvoiceExtractionResult(
            invoice_id=invoice_id,
            fields=fields,
            line_items=extracted.line_items,
            validations=validations,
            average_confidence=avg_conf,
            needs_review_count=needs_review
        )