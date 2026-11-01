from fastapi import APIRouter
from app.api import auth, upload, invoices, reports

router = APIRouter()
router.include_router(auth.router, tags=["auth"])
router.include_router(upload.router, tags=["upload"])
router.include_router(invoices.router, tags=["invoices"])
router.include_router(reports.router, tags=["reports"])