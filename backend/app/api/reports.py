from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import io
import csv
import json
from decimal import Decimal
from sqlalchemy import func

from app.core.database import get_db
from app.core.permissions import require_reviewer, get_current_user
from app.models.models import Invoice, User, InvoiceStatus

router = APIRouter()


def _to_serializable(value):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _invoice_total(invoice: Invoice) -> float:
    return float(invoice.total_amount or 0)


def _invoice_to_dict(invoice: Invoice, extracted: dict) -> dict:
    fields = extracted.get("fields", []) if extracted else {}
    field_map = {}
    for f in fields:
        fid = f.get("id")
        field_map[fid] = {
            "value": f.get("value"),
            "confidence": f.get("confidence"),
            "status": f.get("status"),
            "label": f.get("label"),
        }

    return {
        "id": str(invoice.id),
        "filename": invoice.original_filename or invoice.filename,
        "status": invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status),
        "vendor_name": invoice.vendor_name,
        "invoice_number": invoice.invoice_number,
        "invoice_date": _to_serializable(invoice.invoice_date),
        "due_date": _to_serializable(invoice.due_date),
        "total_amount": _invoice_total(invoice),
        "currency": invoice.currency,
        "extracted_fields": field_map,
        "line_items": [
            {
                "description": li.description,
                "quantity": float(li.quantity) if li.quantity else 0,
                "unit_price": float(li.unit_price) if li.unit_price else 0,
                "amount": float(li.amount) if li.amount else 0,
            }
            for li in invoice.line_items
        ],
        "created_at": _to_serializable(invoice.created_at),
        "processed_at": _to_serializable(invoice.updated_at),
    }


@router.get("/export/invoices")
def export_invoices(
    format: str = Query("csv", regex="^(csv|json)$"),
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).filter(Invoice.organization_id == current_user.organization_id)

    if status:
        query = query.filter(Invoice.status == status)
    if start_date:
        query = query.filter(Invoice.invoice_date >= start_date)
    if end_date:
        query = query.filter(Invoice.invoice_date <= end_date)

    invoices = query.order_by(Invoice.created_at.desc()).all()
    timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

    if format == "json":
        data = [_invoice_to_dict(inv, json.loads(inv.extracted_data) if inv.extracted_data else {}) for inv in invoices]
        stream = io.StringIO()
        json.dump(data, stream, indent=2)
        stream.seek(0)
        return StreamingResponse(
            iter([stream.getvalue()]),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=invoices_export_{timestamp}.json"},
        )

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(
        ["ID", "Invoice Number", "Vendor Name", "Status", "Invoice Date",
         "Due Date", "Total Amount", "Currency", "Filename", "Created At"]
    )
    for inv in invoices:
        writer.writerow([
            str(inv.id),
            inv.invoice_number or "",
            inv.vendor_name or "",
            inv.status.value if hasattr(inv.status, "value") else str(inv.status),
            inv.invoice_date.isoformat() if inv.invoice_date else "",
            inv.due_date.isoformat() if inv.due_date else "",
            float(inv.total_amount) if inv.total_amount else "",
            invoice_currency(inv),
            inv.original_filename or inv.filename,
            inv.created_at.isoformat() if inv.created_at else "",
        ])
    stream.seek(0)
    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=invoices_export_{timestamp}.csv"},
    )


def invoice_currency(invoice: Invoice) -> str:
    return invoice.currency or "USD"


@router.get("/statistics")
def get_processing_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id

    total_invoices = db.query(Invoice).filter(Invoice.organization_id == org_id).count()

    status_counts = {}
    for st in InvoiceStatus:
        cnt = db.query(Invoice).filter(
            Invoice.organization_id == org_id, Invoice.status == st
        ).count()
        status_counts[st.value] = cnt

    total_amount = (
        db.query(func.sum(Invoice.total_amount))
        .filter(Invoice.organization_id == org_id)
        .scalar()
        or 0
    )

    verified_count = status_counts.get("approved", 0) + status_counts.get("review", 0)

    avg_confidence = 0.0
    if total_invoices > 0:
        invoices = db.query(Invoice).filter(Invoice.organization_id == org_id).all()
        confs = []
        for inv in invoices:
            if inv.extracted_data:
                try:
                    ed = json.loads(inv.extracted_data)
                    if ed.get("average_confidence") is not None:
                        confs.append(float(ed["average_confidence"]))
                except Exception:
                    pass
        avg_confidence = round(sum(confs) / len(confs), 1) if confs else 0.0

    return {
        "total_invoices": total_invoices,
        "status_breakdown": status_counts,
        "verified_count": verified_count,
        "total_volume": float(total_amount),
        "average_confidence": avg_confidence,
    }

