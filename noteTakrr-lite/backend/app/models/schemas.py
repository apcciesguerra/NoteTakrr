"""Pydantic schemas for request/response models."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class ProcessingMode(str, Enum):
    """Available processing modes."""
    SUMMARY = "summary"
    REVIEWER = "reviewer"


class ProcessRequest(BaseModel):
    """Request model for note processing."""
    mode: ProcessingMode = ProcessingMode.SUMMARY
    conversation_id: Optional[str] = None


class ProcessResponse(BaseModel):
    """Response model for processed notes."""
    conversation_id: str
    message_id: str
    content: str
    mode: ProcessingMode
    has_docx: bool = False


class ConversationSummary(BaseModel):
    """Summary model for conversation list."""
    id: str
    title: str
    mode: ProcessingMode
    created_at: datetime
    updated_at: datetime
    message_count: int = 0


class Message(BaseModel):
    """Model for a chat message."""
    id: str
    conversation_id: str
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    mode: Optional[ProcessingMode] = None
    has_docx: bool = False
    created_at: datetime


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = "ok"
