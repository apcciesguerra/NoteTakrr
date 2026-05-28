"""FastAPI route definitions for NoteTakrr Lite API."""

import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import Response, StreamingResponse
from typing import Optional, List

from app.agent import processor
from app.agent import llm_chain
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
    files: List[UploadFile] = File(...),
    mode: str = Form("summary"),
    include_search: str = Form("false"),
    conversation_id: Optional[str] = Form(None),
):
    """Stream AI response via SSE while processing uploaded files."""
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    search_enabled = include_search.lower() in ("true", "1", "yes")
    
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per upload.")
    
    # Extract text from all files
    all_texts = []
    for i, file in enumerate(files):
        text = await processor.process_file(file)
        if text:
            label = file.filename or f"File {i + 1}"
            all_texts.append(f"--- {label} ---\n{text}")
    
    if not all_texts:
        raise HTTPException(status_code=400, detail="Could not extract text from any of the uploaded files.")
    
    extracted_text = "\n\n".join(all_texts)
    
    # Create or fetch conversation
    history = []
    if conversation_id:
        history = supabase_client.get_messages(client, conversation_id)
    else:
        title = extracted_text[:30].replace("\n", " ") + "..." if len(extracted_text) > 30 else "New Study Session"
        conv = supabase_client.store_conversation(client, token, title)
        conversation_id = conv.get("id")
    
    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to create or retrieve conversation.")
    
    # Save user message
    supabase_client.store_message(client, conversation_id, "user", extracted_text, mode, search_enabled)

    async def event_stream():
        """SSE generator: streams tokens then saves to DB when done."""
        full_response = ""
        
        # Send conversation metadata first
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation_id})}\n\n"
        
        try:
            async for token_text in llm_chain.stream_study_material(
                extracted_text=extracted_text, mode=mode, context=history, include_search=search_enabled
            ):
                full_response += token_text
                yield f"data: {json.dumps({'type': 'token', 'content': token_text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return
        
        # Stream is done — save everything to DB
        docx_bytes = docx_generator.create_study_document(content=full_response, mode=mode)
        assistant_msg = supabase_client.store_message(
            client, conversation_id, "assistant", full_response, mode, search_enabled
        )
        message_id = assistant_msg.get("id", "")
        
        if message_id:
            supabase_client.store_document(client, message_id, docx_bytes, mode)
            docx_generator.save_docx_to_file(docx_bytes, f"{message_id}.docx")
        
        # Send final "done" event with metadata
        yield f"data: {json.dumps({'type': 'done', 'message_id': message_id, 'has_docx': True})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.post("/chat")
async def chat_message(
    request: Request,
):
    """Handle text-only follow-up messages in an existing conversation.
    
    Accepts a JSON body with:
        message: The user's text message.
        conversation_id: UUID of the conversation (required for follow-ups, optional for new).
        mode: Processing mode - 'summary' or 'reviewer'.
        include_search: Whether to ground with web search.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    body = await request.json()
    user_message = body.get("message", "").strip()
    conversation_id = body.get("conversation_id")
    mode = body.get("mode", "summary")
    search_enabled = body.get("include_search", False)
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    
    # Fetch or create conversation
    history = []
    if conversation_id:
        history = supabase_client.get_messages(client, conversation_id)
    else:
        title = user_message[:30].replace("\n", " ") + "..." if len(user_message) > 30 else user_message
        conv = supabase_client.store_conversation(client, token, title)
        conversation_id = conv.get("id")
    
    if not conversation_id:
        raise HTTPException(status_code=500, detail="Failed to create or retrieve conversation.")
    
    # Save the user's message
    supabase_client.store_message(
        client, conversation_id, "user", user_message, mode, search_enabled
    )

    async def event_stream():
        full_response = ""
        
        yield f"data: {json.dumps({'type': 'meta', 'conversation_id': conversation_id})}\n\n"
        
        try:
            async for token_text in llm_chain.stream_chat_response(
                user_message=user_message, context=history, include_search=search_enabled
            ):
                full_response += token_text
                yield f"data: {json.dumps({'type': 'token', 'content': token_text})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'detail': str(e)})}\n\n"
            return
        
        # Save the assistant's reply
        assistant_msg = supabase_client.store_message(
            client, conversation_id, "assistant", full_response, mode, search_enabled
        )
        message_id = assistant_msg.get("id", "")
        
        yield f"data: {json.dumps({'type': 'done', 'message_id': message_id, 'has_docx': False})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations")
async def get_conversations(request: Request):
    """Fetch user's chat history.
    
    Returns:
        List of conversation summaries.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    conversations = supabase_client.get_conversations(client)
    return conversations


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(request: Request, conversation_id: str):
    """Delete a conversation and all its messages and documents.
    
    Args:
        request: The FastAPI Request object.
        conversation_id: UUID of the conversation to delete.
        
    Returns:
        Success confirmation.
    """
    token = get_token(request)
    client = supabase_client.get_supabase_client(token)
    
    try:
        supabase_client.delete_conversation(client, conversation_id)
        return {"status": "ok", "deleted": conversation_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete conversation: {str(e)}")


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
    
    messages = supabase_client.get_messages(client, conversation_id)
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
    
    doc_record = supabase_client.get_document(client, message_id)
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
