"""Supabase client initialization and database utilities."""

import os
from typing import Optional, List, Dict
from supabase import create_client, Client


def get_supabase_client(token: Optional[str] = None) -> Client:
    """Initialize and return the Supabase client.
    
    Args:
        token: Optional JWT Bearer token from the user for RLS.
        
    Returns:
        Supabase client instance.
    """
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    
    if not url or not key:
        raise ValueError("Supabase credentials not configured in environment.")
        
    client = create_client(url, key)
    
    if token:
        # Set the user's JWT token so Row-Level Security (RLS) works
        # This attaches the auth header to PostgREST requests
        client.postgrest.auth(token)
        
    return client


async def store_conversation(client: Client, token: str, title: str) -> dict:
    """Create a new conversation record in Supabase.
    
    Args:
        client: The authenticated Supabase client.
        token: The user's JWT token to extract their ID.
        title: Title for the conversation.
        
    Returns:
        Created conversation record.
    """
    # Fetch the user profile using the token to get their ID
    user_res = client.auth.get_user(token)
    user_id = user_res.user.id
    
    data = {"title": title, "user_id": user_id}
    result = client.table("conversations").insert(data).execute()
    return result.data[0] if result.data else {}


async def store_message(
    client: Client, 
    conversation_id: str, 
    role: str, 
    content: str, 
    mode: str,
    include_search: bool = False
) -> dict:
    """Store a message in a conversation.
    
    Args:
        client: The authenticated Supabase client.
        conversation_id: UUID of the conversation.
        role: Message role ('user' or 'assistant').
        content: Message text content.
        mode: Processing mode used.
        include_search: Whether search was used.
        
    Returns:
        Created message record.
    """
    data = {
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "mode": mode,
        "include_search": include_search
    }
    result = client.table("messages").insert(data).execute()
    return result.data[0] if result.data else {}


async def store_document(
    client: Client,
    message_id: str,
    docx_bytes: bytes,
    mode: str
) -> dict:
    """Store a generated DOCX in the database.
    
    Args:
        client: The authenticated Supabase client.
        message_id: UUID of the assistant's message.
        docx_bytes: The actual file bytes.
        mode: The generation mode used.
        
    Returns:
        Created document record.
    """
    # Convert bytes to hex string for BYTEA column insertion in Postgres
    docx_hex = "\\x" + docx_bytes.hex()
    data = {
        "message_id": message_id,
        "docx_blob": docx_hex,
        "mode": mode,
        "file_size": len(docx_bytes)
    }
    result = client.table("generated_documents").insert(data).execute()
    return result.data[0] if result.data else {}


async def get_conversations(client: Client) -> List[Dict]:
    """Fetch all conversations for the authenticated user."""
    result = client.table("conversations").select("*").order("updated_at", desc=True).execute()
    return result.data


async def get_messages(client: Client, conversation_id: str) -> List[Dict]:
    """Fetch all messages for a conversation."""
    result = client.table("messages").select("*").eq("conversation_id", conversation_id).order("created_at").execute()
    return result.data


async def get_document(client: Client, message_id: str) -> Optional[Dict]:
    """Fetch a document by message_id."""
    result = client.table("generated_documents").select("*").eq("message_id", message_id).execute()
    return result.data[0] if result.data else None
