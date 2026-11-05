from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from python_service.enhanced_analyzer import analyze_python_submission, rag_indexer
from python_service.code_runner import PythonCodeRunner

app = FastAPI(
    title="UniTutor Python Enhanced Misconception API",
    description="MisconAI Enhanced Programming Misconception Engine with Execution Tracing and Verification",
    version="2.0.0",
)

# This service runs student code, so it only accepts requests from the tutor app on this machine.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class AnalyzeRequest(BaseModel):
    problemTitle: Optional[str] = "Python Problem"
    problemDescription: Optional[str] = ""
    code: str
    level: Optional[str] = "Intermediate"
    expectedOutput: Optional[str] = ""

class RunRequest(BaseModel):
    code: str
    testInputs: Optional[List[str]] = None

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "UniTutor Python Enhanced Engine",
        "misconceptionsLoaded": len(rag_indexer.misconceptions),
    }

@app.post("/api/python/analyze")
def analyze_code(req: AnalyzeRequest):
    try:
        result = analyze_python_submission(
            problem_title=req.problemTitle or "Python Problem",
            problem_description=req.problemDescription or "",
            student_code=req.code,
            level=req.level or "Intermediate",
            expected_output=req.expectedOutput or "",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/python/run")
def run_code(req: RunRequest):
    return PythonCodeRunner.execute_code(req.code, test_inputs=req.testInputs)

@app.get("/api/python/misconceptions")
def get_misconceptions():
    return {
        "count": len(rag_indexer.misconceptions),
        "misconceptions": rag_indexer.misconceptions,
    }

@app.get("/api/python/candidates")
def get_candidates(code: str, top_k: int = 4):
    candidates = rag_indexer.retrieve_candidates(code, top_k=top_k)
    return {"candidates": candidates}

if __name__ == "__main__":
    import uvicorn
    import os
    uvicorn.run("python_service.api:app", host="127.0.0.1", port=int(os.getenv("PYTHON_SERVICE_PORT", "8000")), reload=False)
