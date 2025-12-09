from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import timedelta
from typing import Optional
import httpx
import os
from .rag import rag_system

# try:
#     from .rag import rag_system
# except:
from .mock_rag import mock_rag_system as rag_system


from .database import get_db, init_db
from .models import User, Question, QuestionStatus
from .auth import (
    get_password_hash, 
    verify_password, 
    create_access_token, 
    get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from .websocket import manager
from pydantic import BaseModel, validator

app = FastAPI(title="Q&A Dashboard API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize DB on startup
@app.on_event("startup")
def startup_event():
    init_db()

# Pydantic Models
class UserRegister(BaseModel):
    username: str
    email: str
    password: str
    
    @validator('username')
    def username_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Username cannot be empty')
        return v
    
    @validator('email')
    def email_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Email cannot be empty')
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class QuestionCreate(BaseModel):
    message: str
    user_id: Optional[int] = None
    
    @validator('message')
    def message_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Question cannot be empty')
        return v

class QuestionUpdate(BaseModel):
    status: Optional[str] = None
    answer: Optional[str] = None

# Webhook function
async def send_webhook(question_data: dict):
    webhook_url = os.getenv("WEBHOOK_URL")
    if webhook_url:
        try:
            async with httpx.AsyncClient() as client:
                await client.post(webhook_url, json=question_data, timeout=5.0)
        except:
            pass

# Routes
@app.post("/api/register")
async def register(user: UserRegister, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # hashed_password = get_password_hash(user.password)
    new_user = User(
        username=user.username,
        email=user.email,
        password=user.password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User registered successfully", "user_id": new_user.user_id}

@app.post("/api/login")
async def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.username == user.username).first()
    print("DB User:", db_user)
    print("Provided Password:", user.password)
    print("Stored Hashed Password:", db_user.password)
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": db_user.username}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "username": db_user.username,
        "is_admin": db_user.is_admin
    }

@app.get("/api/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user_id": current_user.user_id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin
    }

@app.post("/api/questions")
async def create_question(question: QuestionCreate, db: Session = Depends(get_db)):
    new_question = Question(
        message=question.message,
        user_id=question.user_id
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)
    
    # Broadcast to WebSocket clients
    await manager.broadcast({
        "type": "new_question",
        "data": {
            "question_id": new_question.question_id,
            "message": new_question.message,
            "status": new_question.status,
            "timestamp": new_question.timestamp.isoformat(),
            "answer": new_question.answer
        }
    })
    
    return {
        "question_id": new_question.question_id,
        "message": new_question.message,
        "status": new_question.status,
        "timestamp": new_question.timestamp.isoformat()
    }

@app.get("/api/questions")
async def get_questions(db: Session = Depends(get_db)):
    questions = db.query(Question).order_by(
        Question.status == QuestionStatus.ESCALATED.value,
        Question.timestamp.desc()
    ).all()
    
    return [{
        "question_id": q.question_id,
        "message": q.message,
        "status": q.status,
        "timestamp": q.timestamp.isoformat(),
        "answer": q.answer,
        "answered_by": q.answered_by
    } for q in questions]

@app.patch("/api/questions/{question_id}")
async def update_question(
    question_id: int,
    update: QuestionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    if update.status:
        question.status = update.status
    if update.answer:
        question.answer = update.answer
        question.answered_by = current_user.username
    
    db.commit()
    db.refresh(question)
    
    # Send webhook if answered
    if update.status == QuestionStatus.ANSWERED.value:
        await send_webhook({
            "question_id": question.question_id,
            "message": question.message,
            "status": question.status,
            "answered_by": current_user.username
        })
    
    # Broadcast update
    await manager.broadcast({
        "type": "question_updated",
        "data": {
            "question_id": question.question_id,
            "message": question.message,
            "status": question.status,
            "timestamp": question.timestamp.isoformat(),
            "answer": question.answer,
            "answered_by": question.answered_by
        }
    })
    
    return {
        "question_id": question.question_id,
        "status": question.status,
        "answer": question.answer
    }

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.post("/api/suggest-answer")
async def suggest_answer(question: QuestionCreate):
    """Generate AI-suggested answer for a question"""
    if not question.message or not question.message.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    
    # Try RAG system
    suggested = rag_system.suggest_answer(question.message)
    
    # Fallback to simple suggestion
    if not suggested:
        suggested = rag_system.simple_suggest(question.message)
    
    if not suggested:
        return {
            "suggested_answer": "RAG system is not available. Please ensure OPENAI_API_KEY is set.",
            "source": "error"
        }
    
    return {
        "suggested_answer": suggested,
        "source": "rag" if rag_system.vectorstore else "simple"
    }


@app.get("/api/questions/{question_id}/suggest")
async def suggest_for_question(
    question_id: int,
    db: Session = Depends(get_db)
):
    """Get AI suggestion for an existing question"""
    question = db.query(Question).filter(Question.question_id == question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    suggested = rag_system.suggest_answer(question.message)
    
    if not suggested:
        suggested = rag_system.simple_suggest(question.message)
    
    if not suggested:
        return {
            "suggested_answer": "RAG system is not available.",
            "source": "error"
        }
    
    source = "rag" if hasattr(rag_system, "vectorstore") and rag_system.vectorstore else "simple"

    
    return {
        "question_id": question_id,
        "question": question.message,
        "suggested_answer": suggested,
        "source": source
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)