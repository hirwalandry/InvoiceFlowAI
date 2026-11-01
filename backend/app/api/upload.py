from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
import uuid
from pathlib import Path

from app.core.database import get_db
from app.core.permissions import require_reviewer
from app.models.models import Invoice, User, InvoiceStatus
from app.core.config import settings
from app.workers.tasks import process_invoice_task

router = APIRouter()

UPLOAD_DIR = settings.UPLOAD_DIR
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'.pdf', '.jpg', '.jpeg', '.png'}
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_invoices(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_reviewer)
):
    results = []
    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=400, detail=f"File {file.filename} has invalid extension")
        
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail=f"File {file.filename} exceeds 10MB")
        
        stored_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(UPLOAD_DIR, stored_filename)
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        invoice = Invoice(
            organization_id=current_user.organization_id,
            original_filename=file.filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=len(content),
            content_type=file.content_type or f"application/{ext[1:]}",
            status=InvoiceStatus.UPLOADED
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        try:
            process_invoice_task.delay(str(invoice.id))
        except Exception as e:
            print(f"Failed to dispatch task: {e}")
        
        results.append({
            "invoice_id": str(invoice.id),
            "filename": file.filename,
            "status": invoice.status.value
        })
    
    return {"count": len(results), "invoices": results}