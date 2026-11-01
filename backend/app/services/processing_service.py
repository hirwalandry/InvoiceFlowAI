from sqlalchemy.orm import Session
from app.models.models import Invoice, LineItem, AuditLog, InvoiceStatus
from app.services.ocr_service import OCRService
from app.services.extraction_service import ExtractionService
from datetime import datetime, date
import json
from decimal import Decimal

class ValidationEngine:
    def __init__(self, db: Session):
        self.db = db
    
    def validate(self, invoice: Invoice, extracted_result):
        issues = []
        
        # 1. Arithmetic checks
        try:
            total_due = invoice.total_amount
            if total_due is not None:
                line_sum = sum((Decimal(str(li.amount)) for li in invoice.line_items), Decimal('0'))
                extracted_data = json.loads(invoice.extracted_data) if invoice.extracted_data else {}
                fields = {f['id']: f for f in extracted_data.get('fields', [])}
                subtotal = fields.get('subtotal', {}).get('value')
                tax = fields.get('tax_amount', {}).get('value')
                
                if subtotal and tax:
                    calc_total = Decimal(str(subtotal).replace(',', '')) + Decimal(str(tax).replace(',', ''))
                    if abs(calc_total - Decimal(str(total_due))) > Decimal('0.01'):
                        issues.append({
                            "rule": "arithmetic_total_mismatch",
                            "severity": "error",
                            "message": f"Subtotal + Tax ({calc_total}) != Total Due ({total_due})"
                        })
                    else:
                        issues.append({
                            "rule": "arithmetic_total_match",
                            "severity": "info",
                            "message": "Subtotal + Tax matches Total Due"
                        })
                
                if line_sum > 0:
                    if abs(line_sum - Decimal(str(total_due))) > Decimal('0.01') and abs(line_sum - calc_total) > Decimal('0.01'):
                        issues.append({
                            "rule": "line_items_sum_mismatch",
                            "severity": "warning",
                            "message": f"Sum of line items ({line_sum}) does not match totals"
                        })
        except Exception as e:
            issues.append({"rule": "arithmetic_check_error", "severity": "error", "message": str(e)})
        
        # 2. Missing required fields
        required = ['vendor_name', 'invoice_number', 'invoice_date', 'total_amount']
        for req in required:
            val = getattr(invoice, req)
            if not val:
                issues.append({
                    "rule": "missing_required_field",
                    "severity": "error",
                    "message": f"Missing required field: {req}"
                })
        
        # 3. Duplicate invoices
        if invoice.invoice_number and invoice.vendor_name:
            dupes = self.db.query(Invoice).filter(
                Invoice.id != invoice.id,
                Invoice.organization_id == invoice.organization_id,
                Invoice.invoice_number == invoice.invoice_number,
                Invoice.vendor_name == invoice.vendor_name,
                Invoice.status.in_([InvoiceStatus.APPROVED, InvoiceStatus.REVIEW])
            ).all()
            if dupes:
                issues.append({
                    "rule": "duplicate_invoice",
                    "severity": "warning",
                    "message": f"Duplicate invoice found: same invoice number and vendor"
                })
        
        # 4. PO mismatch (if PO mentioned)
        extracted_data = json.loads(invoice.extracted_data) if invoice.extracted_data else {}
        text = json.dumps(extracted_data).lower()
        if 'po' in text or 'purchase order' in text:
            # Check if PO number matches expected pattern - basic check
            issues.append({
                "rule": "po_present",
                "severity": "info",
                "message": "Purchase order reference detected - verify against PO"
            })
        
        return issues

class ProcessingService:
    def __init__(self):
        self.ocr = OCRService()
        self.extractor = ExtractionService()
    
    async def process_invoice(self, db: Session, invoice_id: str):
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            return
        
        invoice.status = InvoiceStatus.PROCESSING
        db.commit()
        
        try:
            file_path = invoice.file_path
            raw_text, bboxes = self.ocr.extract_text(file_path)
            
            result = await self.extractor.extract(raw_text, invoice_id)
            
            invoice.extracted_data = result.model_dump_json()
            invoice.invoice_number = None
            invoice.vendor_name = None
            
            for f in result.fields:
                if f.id == "invoice_number" and f.value:
                    invoice.invoice_number = f.value
                if f.id == "vendor_name" and f.value:
                    invoice.vendor_name = f.value
                if f.id == "total_due" and f.value:
                    try:
                        from decimal import Decimal
                        invoice.total_amount = Decimal(str(f.value).replace(',', ''))
                    except:
                        pass
                if f.id == "invoice_date" and f.value:
                    try:
                        invoice.invoice_date = date.fromisoformat(str(f.value)[:10])
                    except:
                        pass
            
            for li in result.line_items:
                if li.description:
                    line_item = LineItem(
                        invoice_id=invoice.id,
                        description=li.description,
                        quantity=li.quantity or 0,
                        unit_price=li.unit_price or 0,
                        amount=li.amount or 0
                    )
                    db.add(line_item)
            
            db.commit()
            db.refresh(invoice)
            
            validator = ValidationEngine(db)
            issues = validator.validate(invoice, result)
            
            if invoice.extracted_data:
                ed = json.loads(invoice.extracted_data)
                ed['validation_issues'] = issues
                invoice.extracted_data = json.dumps(ed)
            
            has_errors = any(i['severity'] == 'error' for i in issues)
            if has_errors or result.needs_review_count > 0:
                invoice.status = InvoiceStatus.REVIEW
            else:
                invoice.status = InvoiceStatus.REVIEW
            
            db.commit()
            try:
                audit = AuditLog(
                    organization_id=invoice.organization_id,
                    invoice_id=invoice.id,
                    action="AUTO_EXTRACTED_VALIDATED",
                    details=f"Extracted with avg confidence {result.average_confidence}%, {len(issues)} validation issues"
                )
                db.add(audit)
                db.commit()
            except Exception as ae:
                db.rollback()
                print(f"Audit log failed: {ae}")
        except Exception as e:
            db.rollback()
            invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
            if invoice:
                invoice.status = InvoiceStatus.ERROR
                invoice.processing_error = str(e)
                db.commit()
            print(f"Error processing invoice {invoice_id}: {e}")
            raise

