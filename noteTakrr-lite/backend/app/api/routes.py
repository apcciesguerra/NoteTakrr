"""FastAPI route definitions for NoteTakrr Lite API."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Optional

router = APIRouter(prefix="/api", tags=["api"])


@router.post("/process")
async def process_notes(
    file: UploadFile = File(...),
    mode: str = Form("summary"),
    conversation_id: Optional[str] = Form(None),
):
    """Handle file uploads, mode selection, and generate response + DOCX.
    
    Args:
        file: Uploaded file (text, image, or PDF).
        mode: Processing mode - 'summary' or 'reviewer'.
        conversation_id: Optional existing conversation ID for context.
        
    Returns:
        Generated response with conversation and message IDs.
    """
    # TODO: Implement file processing pipeline
    raise HTTPException(status_code=501, detail="Not yet implemented")


@router.get("/conversations")
async def get_conversations():
    """Fetch user's chat history.
    
    Returns:
        List of conversation summaries.
    """
    # TODO: Fetch conversations from Supabase
    raise HTTPException(status_code=501, detail="Not yet implemented")


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(conversation_id: str):
    """Fetch specific chat messages for a conversation.
    
    Args:
        conversation_id: UUID of the conversation.
        
    Returns:
        List of messages in the conversation.
    """
    # TODO: Fetch messages from Supabase
    raise HTTPException(status_code=501, detail="Not yet implemented")


@router.get("/download/{message_id}")
async def download_docx(message_id: str):
    """Return generated DOCX blob for a message.
    
    Args:
        message_id: UUID of the message with generated DOCX.
        
    Returns:
        DOCX file as download response.
    """
    # TODO: Retrieve and return DOCX file
    raise HTTPException(status_code=501, detail="Not yet implemented")
