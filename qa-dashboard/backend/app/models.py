from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class QuestionStatus(str, enum.Enum):
    PENDING = "Pending"
    ESCALATED = "Escalated"
    ANSWERED = "Answered"

class User(Base):
    __tablename__ = "users"
    
    user_id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    is_admin = Column(Integer, default=1)
    
    questions = relationship("Question", back_populates="user")

class Question(Base):
    __tablename__ = "questions"
    
    question_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"), nullable=True)
    message = Column(String)
    status = Column(String, default=QuestionStatus.PENDING.value)
    timestamp = Column(DateTime, default=datetime.utcnow)
    answered_by = Column(String, nullable=True)
    answer = Column(String, nullable=True)
    
    user = relationship("User", back_populates="questions")