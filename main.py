import hashlib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class DataPayload(BaseModel):
    identifier: str
    payload: str

@app.post("/ingest")
async def ingest_data(data: DataPayload):
    hash_value = hashlib.sha256(f"{data.identifier}{data.payload}".encode()).hexdigest()
    return {"status": "validated", "deterministic_hash": hash_value}
