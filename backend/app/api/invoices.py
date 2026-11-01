from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.permissions import require_reviewer, get_current_user
from app.models.models import Invoice, User
from jose import jwt, JWTError
from app.core.config import settings
import json
import os

router = APIRouter()

@router.get("/invoices")
def list_invoices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(
        Invoice.organization_id == current_user.organization_id
    ).order_by(Invoice.created_at.desc()).all()
    
    result = []
    for inv in invoices:
        result.append({
            "id": str(inv.id),
            "filename": inv.original_filename or inv.filename,
            "status": inv.status.value if hasattr(inv.status, 'value') else str(inv.status),
            "vendor_name": inv.vendor_name,
            "invoice_number": inv.invoice_number,
            "invoice_date": inv.invoice_date.isoformat() if inv.invoice_date else None,
            "total_amount": float(inv.total_amount) if inv.total_amount else None,
            "created_at": inv.created_at.isoformat() if inv.created_at else None,
            "confidence": None
        })
    return result

@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    extracted = json.loads(invoice.extracted_data) if invoice.extracted_data else {}
    
    return {
        "id": str(invoice.id),
        "filename": invoice.original_filename or getattr(invoice, 'filename', None),
        "file_path": invoice.file_path,
        "status": invoice.status.value if hasattr(invoice.status, 'value') else str(invoice.status),
        "vendor_name": invoice.vendor_name,
        "invoice_number": invoice.invoice_number,
        "invoice_date": invoice.invoice_date.isoformat() if invoice.invoice_date else None,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
        "total_amount": float(invoice.total_amount) if invoice.total_amount else None,
        "extracted_data": extracted,
        "line_items": [{"id": str(li.id), "description": li.description, "quantity": float(li.quantity) if li.quantity else None, "unit_price": float(li.unit_price) if li.unit_price else None, "amount": float(li.amount) if li.amount else None} for li in invoice.line_items],
    }

@router.get("/invoices/{invoice_id}/file")
def get_invoice_file(
    invoice_id: str,
    token: str = Query(..., description="Bearer token for iframe access"),
    db: Session = Depends(get_db)
):
    user = None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id = payload.get("sub")
        user = db.query(User).filter(User.email == user_id).first()
        if not user:
            user = db.query(User).filter(User.id == user_id).first()
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.organization_id != user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if not os.path.exists(invoice.file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(invoice.file_path, filename=invoice.original_filename or invoice.stored_filename)

@router.put("/invoices/{invoice_id}/review")
def review_invoice(
    invoice_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    if invoice.organization_id != current_user.organization_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    invoice.status = data.get("status", "approved")
    from datetime import datetime
    invoice.reviewed_at = datetime.utcnow()
    db.commit()
    return {"message": "Invoice reviewed", "status": invoice.status}