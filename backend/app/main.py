from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import upload, auth, invoices, reports

app = FastAPI(title="InvoiceFlowAI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(invoices.router, prefix="/api", tags=["invoices"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.get("/health")
def health():
    return {"status": "ok"}