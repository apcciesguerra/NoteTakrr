"""FastAPI route definitions for NoteTakrr Lite API."""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import Response
from typing import Optional

from app.agent import processor
from app.agent import gemini_chain
from app.agent import docx_generator
from app.db import supabase_client

router = APIRouter(prefix="/api", tags=["api"])


def get_token(request: Request) -> str:
    """Extract Bearer token from request headers."""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    return auth_header.replace("Bearer ", "")


@router.post("/process")
async def process_notes(
    request: Request,
    file: UploadFile = File(...),
    mode: str = Form("summary"),
    include_search: bool = Form(False),
    conversation_id: Optional[str] = Form(None),
):
    """Handle file uploads, mode selection, and generate response + DOCX.
    
    Args:
        request: The FastAPI Request object.
        file: Uploaded file (text, image, or PDF).
        mode: Processing mode - 'summary' or 'reviewer'.
        include_search: Whether to ground the generation with Google Search.
        conversation_id: Optional existing conversation ID for context.
        
    Returns:
        Generated response with conversation and message IDs.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    # 1. Extract text from uploaded file
    extracted_text = await processor.process_file(file)
    if not extracted_text:
        raise HTTPException(status_code=400, detail="Could not extract text from file.")
        
    # 2. Fetch conversation history if conversation_id is provided
    history = []
    if conversation_id:
        history = await supabase_client.get_messages(client, conversation_id)
    else:
        # Create a new conversation
        title = extracted_text[:30].replace("\n", " ") + "..." if len(extracted_text) > 30 else "New Study Session"
        conv = await supabase_client.store_conversation(client, token, title)
        conversation_id = conv.get("id")
        
    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to create or retrieve conversation.")
        
    # 3. Save the user's message to the database
    await supabase_client.store_message(
        client, conversation_id, "user", extracted_text, mode, include_search
    )
        
    # 4. Call Gemini AI to get the response
    ai_response = await gemini_chain.generate_response(
        text=extracted_text,
        mode=mode,
        context=history,
        include_search=include_search
    )
    
    # 5. Generate DOCX file bytes
    docx_bytes = docx_generator.create_study_document(content=ai_response, mode=mode)
    
    # 6. Save the assistant's message to the database
    assistant_msg = await supabase_client.store_message(
        client, conversation_id, "assistant", ai_response, mode, include_search
    )
    message_id = assistant_msg.get("id")
    
    if not message_id:
        raise HTTPException(status_code=500, detail="Failed to save assistant message.")
        
    # 7. Save the generated DOCX to the database
    await supabase_client.store_document(client, message_id, docx_bytes, mode)
    
    # Save a copy locally as a backup
    docx_generator.save_docx_to_file(docx_bytes, f"{message_id}.docx")
    
    return {
        "conversation_id": conversation_id,
        "message_id": message_id,
        "content": ai_response,
        "mode": mode,
        "has_docx": True
    }


@router.get("/conversations")
async def get_conversations(request: Request):
    """Fetch user's chat history.
    
    Returns:
        List of conversation summaries.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    conversations = await supabase_client.get_conversations(client)
    return conversations


@router.get("/conversations/{conversation_id}/messages")
async def get_conversation_messages(request: Request, conversation_id: str):
    """Fetch specific chat messages for a conversation.
    
    Args:
        request: The FastAPI Request object.
        conversation_id: UUID of the conversation.
        
    Returns:
        List of messages in the conversation.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    messages = await supabase_client.get_messages(client, conversation_id)
    return messages


@router.get("/download/{message_id}")
async def download_docx(request: Request, message_id: str):
    """Return generated DOCX blob for a message.
    
    Args:
        request: The FastAPI Request object.
        message_id: UUID of the message with generated DOCX.
        
    Returns:
        DOCX file as download response.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    doc_record = await supabase_client.get_document(client, message_id)
    if not doc_record or not doc_record.get("docx_blob"):
        raise HTTPException(status_code=404, detail="Document not found")
        
    # The postgres BYTEA string comes back as a hex string from Supabase
    blob_str = doc_record["docx_blob"]
    if blob_str.startswith("\\x"):
        blob_str = blob_str[2:]
        
    try:
        docx_bytes = bytes.fromhex(blob_str)
    except ValueError:
        raise HTTPException(status_code=500, detail="Failed to parse document blob")
        
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f"attachment; filename=study_material_{message_id}.docx"
        }
    )
