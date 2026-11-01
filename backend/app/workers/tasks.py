from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.processing_service import ProcessingService
import asyncio

@celery_app.task
def test_task(x, y):
    return x + y

@celery_app.task
def process_invoice_task(invoice_id: str):
    db = SessionLocal()
    try:
        service = ProcessingService()
        asyncio.run(service.process_invoice(db, invoice_id))
        return {"status": "done", "invoice_id": invoice_id}
    finally:
        db.close()