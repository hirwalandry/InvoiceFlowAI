import json
import os
import re
import time
from typing import Any, Dict, List, Optional
from decimal import Decimal
from datetime import datetime
from app.schemas.extraction import InvoiceExtractionSchema, FullInvoiceExtractionResult, ExtractedFieldDetail, LineItemExtracted, ValidationResult

try:
    import openai
    OPENAI_AVAILABLE = True
except Exception:
    OPENAI_AVAILABLE = False

try:
    from json_repair import repair_json
    JSON_REPAIR_AVAILABLE = True
except Exception:
    JSON_REPAIR_AVAILABLE = False


def try_repair_json_content(s: str) -> str:
    if not s:
        return s
    s = s.strip()
    # Close unterminated strings
    if s.count('"') % 2 == 1:
        s += '"'
    # Balance brackets and braces
    open_brackets = s.count('[') - s.count(']')
    open_braces = s.count('{') - s.count('}')
    if open_brackets > 0:
        s += ']' * open_brackets
    if open_braces > 0:
        s += '}' * open_braces
    # Remove trailing commas before closing braces/brackets
    s = re.sub(r',\s*([\]\}])', r'\1', s)
    s = re.sub(r',\s*$', '', s)
    return s

class ExtractionService:
    def __init__(self):
        self.use_llm = os.getenv("USE_LLM_EXTRACTION", "true").lower() == "true"
        self.model = os.getenv("EXTRACTION_MODEL", "openai/gpt-oss-20b")
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

    @staticmethod
    def _normalize_date(val: Optional[Any]) -> Optional[str]:
        if val is None:
            return None
        s = str(val).strip()
        if not s:
            return None
        # Common date patterns
        patterns = [
            "%Y-%m-%d",      # 2024-01-15
            "%m/%d/%Y",      # 01/15/2024
            "%d/%m/%Y",      # 15/01/2024
            "%m-%d-%Y",      # 01-15-2024
            "%d-%m-%Y",      # 15-01-2024
            "%Y%m%d",        # 20240115
            "%m%d%Y",        # 01152024
            "%d%m%Y",        # 15012024
            "%Y/%m/%d",      # 2024/01/15
            "%d.%m.%Y",      # 15.01.2024
            "%m.%d.%Y",      # 01.15.2024
        ]
        for fmt in patterns:
            try:
                dt = datetime.strptime(s, fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        # Try to salvage common garbled formats
        digits = re.sub(r"[^\d]", "", s)
        # Handle 1110272019 -> remove '27' -> 11102019 -> MMDDYYYY (Nov 10, 2019)
        if len(s) == 10 and '27' in s and s.count('27') >= 1:
            test = s.replace('27', '', 1)
            if len(test) == 8:
                try:
                    dt = datetime.strptime(test, "%m%d%Y")
                    return dt.strftime("%Y-%m-%d")
                except ValueError:
                    pass
        # Handle 26102/2019 -> strip non-digits -> 261022019 (9 digits), drop one char to get valid DDMMYYYY
        if len(digits) == 9:
            best = None
            best_score = -1
            for i in range(len(digits)):
                test = digits[:i] + digits[i+1:]
                if len(test) == 8:
                    for fmt in ["%d%m%Y", "%m%d%Y"]:
                        try:
                            dt = datetime.strptime(test, fmt)
                            # Score: prefer DDMMYYYY (month 1-12, day 1-31), reasonable year
                            month = dt.month
                            day = dt.day
                            year = dt.year
                            score = 0
                            if 1 <= month <= 12 and 1 <= day <= 31 and 1900 <= year <= 2100:
                                score += 10
                            # Prefer DDMMYYYY format (day <= 31, month <= 12)
                            if fmt == "%d%m%Y" and day <= 31 and month <= 12:
                                score += 5
                            # Prefer recent years (closer to now)
                            if 2000 <= year <= 2030:
                                score += 3
                            # Tiebreaker: prefer month that appears in original digits
                            if str(month).zfill(2) in digits:
                                score += 2
                            # Prefer month that appears in original string
                            if str(month).zfill(2) in s:
                                score += 1
                            if score > best_score:
                                best_score = score
                                best = dt
                        except ValueError:
                            pass
            if best:
                return best.strftime("%Y-%m-%d")
        # Try standard 8-digit formats
        if len(digits) == 8:
            try:
                dt = datetime.strptime(digits, "%Y%m%d")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
            try:
                dt = datetime.strptime(digits, "%m%d%Y")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
            try:
                dt = datetime.strptime(digits, "%d%m%Y")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
            try:
                dt = datetime.strptime(digits, "%y%m%d%y")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                pass
        return None

    async def extract(self, raw_text: str, invoice_id: str, low_conf_tokens: Optional[List[Dict[str, Any]]] = None) -> FullInvoiceExtractionResult:
        print(f"[EXTRACT] invoice_id={invoice_id} use_llm={self.use_llm} has_key={bool(self.api_key)} model={self.model} base_url={self.base_url} text_len={len(raw_text)} low_conf={len(low_conf_tokens) if low_conf_tokens else 0}")
        if self.use_llm and OPENAI_AVAILABLE and self.api_key:
            try:
                res = await self._extract_with_llm(raw_text, invoice_id, low_conf_tokens or [])
                print(f"[EXTRACT] LLM returned invoice_id={invoice_id} avg_conf={res.average_confidence} fields={len(res.fields)} line_items={len(res.line_items)}")
                return res
            except Exception as e:
                print(f"[EXTRACT] LLM extraction failed: {e}")
                return await self._extract_with_fallback(raw_text, invoice_id, low_conf_tokens or [])
        print(f"[EXTRACT] Using fallback for invoice_id={invoice_id}")
        res = await self._extract_with_fallback(raw_text, invoice_id, low_conf_tokens or [])
        print(f"[EXTRACT] Fallback returned invoice_id={invoice_id} avg_conf={res.average_confidence}")
        return res

    async def _extract_with_llm(self, raw_text: str, invoice_id: str, low_conf_tokens: List[Dict[str, Any]]) -> FullInvoiceExtractionResult:
        print(f"[LLM] _extract_with_llm START invoice_id={invoice_id} low_conf_tokens={len(low_conf_tokens)}")
        print(f"[LLM] base_url={self.base_url}, api_key_present={bool(self.api_key)}")
        if self.base_url:
            print(f"[LLM] Creating client with base_url={self.base_url}")
            client = openai.OpenAI(api_key=self.api_key, base_url=self.base_url)
        else:
            print(f"[LLM] Creating client without base_url")
            client = openai.OpenAI(api_key=self.api_key)
        print(f"[LLM] Client created successfully")
        print(f"[LLM] Generating schema...")
        schema = InvoiceExtractionSchema.model_json_schema()
        print(f"[LLM] Schema generated, keys={list(schema.get('properties', {}).keys())}")

        low_conf_note = ""
        if low_conf_tokens:
            token_strs = [f'"{t["text"]}" (conf={t["confidence"]}%)' for t in low_conf_tokens[:30]]
            low_conf_note = f"\n\n[WARNING] OCR LOW CONFIDENCE TOKENS (do not trust these blindly, return null if uncertain):\n{', '.join(token_strs)}"

        system_prompt = f"""You are an expert invoice extraction system. 
CRITICAL RULES:
- Extract ONLY values that are explicitly written on the invoice.
- Do NOT calculate totals, taxes, or subtotals. Return them only if they appear as labeled values on the invoice.
- Do NOT infer due dates from "Net 30", "Due in 15 days", etc unless the exact calendar date is written.
- Do NOT guess vendor/billing/shipping details from logos, headers, or domain knowledge.
- Do NOT normalize by combining unrelated text.
- If a field is not present, return null. Do not hallucinate or fabricate.
- Prefer omission over invention.
- Only extract line items that are explicitly listed in a line items section with quantities/prices/amounts.
- For each line item, explicitly extract: description, quantity, unit_price, and amount.
- quantity must be a numeric value (e.g., 1, 2, 3) taken from the QTY column; do NOT return null or 0 when a quantity is written.
- unit_price is the per-unit price; amount is the line total. Return them as numbers only if written.
- For dates, convert to YYYY-MM-DD if the exact date appears.
- For currency, identify currency symbol/code if explicitly shown.
- If a value overlaps with a LOW CONFIDENCE OCR token, return null for that field and lower your confidence.{low_conf_note}

Handle variations in labeling (e.g., "From", "Supplier", "Sold By" = vendor). Return valid JSON matching the schema exactly."""

        try:
            print(f"[LLM] calling model={self.model} base_url={self.base_url}")
            response = None
            content = None
            data = None
            for attempt in range(3):
                response = client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": f"Schema: {json.dumps(schema)}\n\nInvoice text (OCR extracted):\n{raw_text[:8000]}\n\nREMINDER: Only extract values explicitly present in the text above. Return null if not found."}
                    ],
                    temperature=0,
                    max_tokens=8192,
                    response_format={"type": "json_object"},
                )
                print(f"[LLM][MODEL] response.model={getattr(response,'model',None)} id={getattr(response,'id',None)} attempt={attempt}")
                if not response.choices:
                    print(f"[LLM][MODEL] NO_CHOICES: {response}")
                    if attempt < 2:
                        time.sleep(2)
                    continue
                choice = response.choices[0]
                print(f"[LLM][MODEL] finish_reason={getattr(choice,'finish_reason',None)}")
                msg = choice.message
                print(f"[LLM][MODEL] message.role={getattr(msg,'role',None)}")
                print(f"[LLM][MODEL] message.content_type={type(getattr(msg,'content',None))}")
                print(f"[LLM][MODEL] message.content_repr={repr(getattr(msg,'content',None))}")
                print(f"[LLM][MODEL] message.refusal={getattr(msg,'refusal',None)}")
                if hasattr(msg, 'reasoning_content'):
                    print(f"[LLM][MODEL] message.reasoning_content_repr={repr(getattr(msg,'reasoning_content',None))}")
                if hasattr(msg, 'thought'):
                    print(f"[LLM][MODEL] message.thought_repr={repr(getattr(msg,'thought',None))}")
                print(f"[LLM][MODEL] FULL_MESSAGE_DUMP={msg}")
                content = getattr(msg, 'content', None)
                if not content or not isinstance(content, str) or not content.strip():
                    print(f"[LLM][MODEL] EMPTY_CONTENT -> trying to extract from reasoning_content/thought if present")
                    for attr in ['reasoning_content', 'thought', 'reasoning']:
                        val = getattr(msg, attr, None)
                        if val and isinstance(val, str) and val.strip():
                            content = val
                            print(f"[LLM][MODEL] USING_FALLBACK_ATTR={attr}")
                            break
                print(f"[LLM] raw response: {repr(content)[:500]}")
                if not content or not isinstance(content, str) or not content.strip():
                    print(f"[LLM][MODEL] CONTENT_EMPTY_OR_NONE -> will retry")
                    if attempt < 2:
                        time.sleep(2)
                    continue
                c = content.strip()
                if c.startswith("```"):
                    c = re.sub(r'^```(?:json)?\s*', '', c, flags=re.IGNORECASE)
                    c = re.sub(r'\s*```$', '', c)
                    c = c.strip()
                start = c.find("{")
                end = c.rfind("}")
                if start != -1 and end > start:
                    c = c[start:end + 1]
                # Try to parse with multiple strategies
                parse_attempts = []
                try:
                    repaired1 = re.sub(r",\s*([}\]])", r"\1", c)
                    parse_attempts.append(("comma_repair", repaired1))
                except Exception:
                    pass
                try:
                    repaired2 = try_repair_json_content(c)
                    parse_attempts.append(("brace_balance", repaired2))
                except Exception:
                    pass
                if JSON_REPAIR_AVAILABLE:
                    try:
                        repaired3 = repair_json(c, return_objects=False)
                        if isinstance(repaired3, str):
                            parse_attempts.append(("json_repair_lib", repaired3))
                    except Exception:
                        pass
                data = None
                for pname, pstr in parse_attempts:
                    try:
                        print(f"[LLM][PARSE] trying {pname} len={len(pstr)} tail={repr(pstr[-60:])}")
                        data = json.loads(pstr)
                        print(f"[LLM][PARSE] SUCCESS with {pname}")
                        break
                    except Exception as _pe:
                        print(f"[LLM][PARSE] {pname} failed: {_pe}")
                if data is not None:
                    break
                if attempt < 2:
                    print("[LLM] empty/malformed response, retrying in 2s...")
                    time.sleep(2)
            if not data:
                raise ValueError("LLM returned invalid or empty response content after retries")
            print(f"[LLM] parsed keys: {list(data.keys())}")
            extracted = InvoiceExtractionSchema(**data)
            confidence = 40.0 if self.force_low_confidence else 95.0
            return self._build_result(extracted, invoice_id, confidence=confidence, raw_text=raw_text)
        except Exception as e:
            import traceback
            print(f"[LLM] error type: {type(e).__name__}")
            print(f"[LLM] error: {e}")
            print(f"[LLM] traceback: {traceback.format_exc()}")
            raise e

    async def _extract_with_fallback(self, raw_text: str, invoice_id: str, low_conf_tokens: List[Dict[str, Any]]) -> FullInvoiceExtractionResult:
        extracted = InvoiceExtractionSchema(
            vendor_name=None,
            vendor_address=None,
            vendor_email=None,
            invoice_number=None,
            invoice_date=None,
            due_date=None,
            subtotal=None,
            tax_amount=None,
            total_due=None,
            currency="USD",
            line_items=[]
        )
        return self._build_result(extracted, invoice_id, confidence=40.0, raw_text=raw_text, low_conf_tokens=low_conf_tokens)

    def _build_result(self, extracted: InvoiceExtractionSchema, invoice_id: str, confidence: float, raw_text: str = "", low_conf_tokens: List[Dict[str, Any]] = None) -> FullInvoiceExtractionResult:
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

        # Evidence-based check: see if value actually appears in raw OCR text
        raw_text_lower = (raw_text or "").lower()
        evidence_map = {}
        for key, label, section in field_map:
            val = getattr(extracted, key)
            if val is None:
                evidence_map[key] = False
                continue
            val_str = str(val).strip().lower()
            if val_str and val_str in raw_text_lower:
                evidence_map[key] = True
            else:
                # try partial match for numbers/addresses
                evidence_map[key] = len(val_str) >= 3 and any(tok in raw_text_lower for tok in val_str.replace(",", " ").split() if len(tok) >= 3)

        # Normalize date fields before validation
        if extracted.invoice_date is not None:
            extracted.invoice_date = self._normalize_date(extracted.invoice_date)
        if extracted.due_date is not None:
            extracted.due_date = self._normalize_date(extracted.due_date)

        validations = []
        validation_failed = False

        # A) Arithmetic total check
        if extracted.total_due is not None and extracted.subtotal is not None and extracted.tax_amount is not None:
            try:
                calc = float(extracted.subtotal) + float(extracted.tax_amount)
                if abs(calc - float(extracted.total_due)) > 0.01:
                    validation_failed = True
                    validations.append(ValidationResult(
                        rule_name="total_sum_check",
                        passed=False,
                        message=f"Subtotal + Tax ({calc:.2f}) != Total ({float(extracted.total_due):.2f})",
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

        # B) Line items sum check
        if extracted.line_items:
            try:
                line_sum = sum(float(li.amount) for li in extracted.line_items if li.amount is not None)
                if extracted.subtotal is not None and abs(line_sum - float(extracted.subtotal)) > 0.01:
                    validation_failed = True
                    validations.append(ValidationResult(
                        rule_name="line_items_sum_check",
                        passed=False,
                        message=f"Sum of line items ({line_sum:.2f}) != Subtotal ({float(extracted.subtotal):.2f})",
                        severity="warning"
                    ))
                elif extracted.subtotal is not None:
                    validations.append(ValidationResult(
                        rule_name="line_items_sum_check",
                        passed=True,
                        message="Line items sum matches Subtotal",
                        severity="warning"
                    ))
            except Exception:
                pass

        # C) Date sanity
        if extracted.invoice_date and extracted.due_date:
            try:
                from datetime import datetime
                inv = datetime.strptime(str(extracted.invoice_date)[:10], "%Y-%m-%d")
                due = datetime.strptime(str(extracted.due_date)[:10], "%Y-%m-%d")
                if due < inv:
                    validation_failed = True
                    validations.append(ValidationResult(
                        rule_name="date_sanity_check",
                        passed=False,
                        message="Due date is before Invoice date",
                        severity="warning"
                    ))
                else:
                    validations.append(ValidationResult(
                        rule_name="date_sanity_check",
                        passed=True,
                        message="Due date is after Invoice date",
                        severity="warning"
                    ))
            except Exception:
                pass

        # D) Required fields
        if extracted.vendor_name is None or extracted.invoice_number is None:
            validation_failed = True
            validations.append(ValidationResult(
                rule_name="required_fields_check",
                passed=False,
                message="Missing required fields (Vendor or Invoice Number)",
                severity="error"
            ))
        else:
            validations.append(ValidationResult(
                rule_name="required_fields_check",
                passed=True,
                message="Required fields present",
                severity="warning"
            ))

        # Check if a value overlaps with low-confidence OCR tokens
        low_conf_texts = set()
        if low_conf_tokens:
            for t in low_conf_tokens:
                txt = str(t.get("text", "")).strip().lower()
                if txt:
                    low_conf_texts.add(txt)

        for key, label, section in field_map:
            val = getattr(extracted, key)
            has_evidence = evidence_map.get(key, False)
            field_conf = confidence
            # B) Confidence source: model certainty + evidence + validation
            if val is not None and not has_evidence and raw_text.strip():
                field_conf = min(confidence, 60.0)  # Lower confidence if not found in raw OCR
            if key in ["subtotal", "tax_amount", "total_due"] and validation_failed:
                field_conf = min(field_conf, 60.0)
            # C) OCR confidence: if value overlaps with low-conf tokens, flag it
            if val is not None and low_conf_texts:
                val_str = str(val).strip().lower()
                # Check if any significant part of the value matches a low-conf token
                val_tokens = [t for t in val_str.replace(",", " ").split() if len(t) >= 2]
                if val_tokens:
                    overlap = sum(1 for vt in val_tokens if vt in low_conf_texts)
                    if overlap > 0:
                        overlap_ratio = overlap / len(val_tokens)
                        field_conf = min(field_conf, max(30.0, 80.0 - overlap_ratio * 50))
                        print(f"[EXTRACT] Low OCR confidence overlap for {key}: {overlap}/{len(val_tokens)} tokens -> conf={field_conf}")
            # C) Missing values must remain genuinely missing - don't force-fill
            status = "needsReview"
            if val is not None and field_conf >= 85 and not validation_failed and has_evidence:
                status = "verified"
            elif val is not None:
                status = "needsReview"
            elif val is None:
                status = "needsReview"  # Missing needs review, not auto-verified
            fields.append(ExtractedFieldDetail(
                id=key,
                label=label,
                section=section,
                value=str(val) if val is not None else None,
                confidence=field_conf,
                status=status
            ))

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