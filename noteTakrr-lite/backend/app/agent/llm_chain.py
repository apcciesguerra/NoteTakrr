"""
llm_chain.py — Z.ai (OpenAI SDK) integration for NoteTakrr Lite.

This module handles all communication with Z.ai's GLM-4.7-Flash model using
the standard openai Python SDK. It takes extracted note text, applies Chain-of-Thought (CoT)
prompting, and returns AI-generated study materials.

It can optionally ground responses with live DuckDuckGo Search results
when the user enables the `include_search` flag.
"""

import os
from typing import Optional, List, Dict
from openai import AsyncOpenAI
from duckduckgo_search import DDGS
import asyncio


# ──────────────────────────────────────────────
# SYSTEM PROMPTS (Chain-of-Thought)
# ──────────────────────────────────────────────

SUMMARY_SYSTEM_PROMPT = """You are NoteTakrr, an expert AI study assistant.
Your job is to transform raw student notes into a clear, well-organized study guide.

When you receive notes, follow this thinking process:
1. First, identify the core topics and subtopics in the notes.
2. Then, determine the logical order to present them.
3. Finally, produce a polished study guide.

Your output MUST include:
- A descriptive title for the study guide.
- Clearly labeled sections with headings.
- Key concepts explained in simple language.
- Important definitions highlighted.
- Relevant examples or analogies to aid understanding.
- A brief summary at the end.

Use Markdown formatting for readability.
Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc².
Be thorough but concise — a student should be able to review this before an exam."""

REVIEWER_SYSTEM_PROMPT = """You are NoteTakrr, an expert AI study reviewer.
Your job is to generate targeted review questions from student notes to test deep understanding.

When you receive notes, follow this thinking process:
1. First, identify the key concepts a student must master.
2. Then, find areas that are commonly misunderstood or tricky.
3. Finally, create questions that test real understanding, not just memorization.

Your output MUST include:
- 8-12 question-and-answer pairs.
- A mix of difficulty levels: basic recall, application, and analysis.
- For each question, provide a detailed answer with explanation.
- Flag any concepts that the student's notes seem weak on.

Format each Q&A pair like this:
**Q1: [Question]**
**A1:** [Detailed answer with explanation]

Use Markdown formatting for readability.
Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc²."""


# ──────────────────────────────────────────────
# Z.ai / OPENAI CLIENT CONFIGURATION
# ──────────────────────────────────────────────

def get_llm_client() -> AsyncOpenAI:
    """Initialize the OpenAI client pointing to Z.ai's infrastructure.
    
    Returns:
        AsyncOpenAI: The configured async client.
        
    Raises:
        ValueError: If ZAI_API_KEY is not set.
    """
    api_key = os.environ.get("ZAI_API_KEY")
    if not api_key:
        raise ValueError("ZAI_API_KEY is not set. Please add it to your .env file.")
        
    # We use the standard OpenAI SDK but override the base_url
    # to hit Z.ai's servers instead of OpenAI's.
    return AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.z.ai/api/paas/v4"
    )


# ──────────────────────────────────────────────
# HELPER: DUCKDUCKGO SEARCH
# ──────────────────────────────────────────────

def _run_search(query: str) -> str:
    try:
        results = DDGS().text(query, max_results=3)
        results_list = list(results) if results else []
        if not results_list:
            return "\n[Search Engine Note: No results found for this query.]"
            
        formatted_results = "\n\n--- LIVE SEARCH CONTEXT ---\n"
        for idx, r in enumerate(results_list, 1):
            formatted_results += f"Source {idx}: {r.get('title', 'Untitled')}\n"
            formatted_results += f"Link: {r.get('href', 'No link')}\n"
            formatted_results += f"Snippet: {r.get('body', 'No snippet')}\n\n"
            
        return formatted_results
    except Exception as e:
        print(f"[SEARCH ERROR] Failed to fetch search results: {e}")
        return f"\n[Search Engine Note: Failed to retrieve search context ({str(e)})]"

async def _get_search_context(query: str) -> str:
    print(f"[SEARCH] Running DuckDuckGo search for: '{query}'")
    return await asyncio.to_thread(_run_search, query)


# ──────────────────────────────────────────────
# MAIN FUNCTION: GENERATE STUDY MATERIAL
# ──────────────────────────────────────────────

async def generate_study_material(
    extracted_text: str, 
    mode: str, 
    context: Optional[List[Dict]] = None,
    include_search: bool = False
) -> str:
    """Generate AI study material from the given note text using Z.ai.
    
    Args:
        extracted_text: The parsed text from the user's uploaded document.
        mode: Either "summary" or "reviewer".
        context: Optional list of prior conversation messages.
        include_search: Whether to ground the prompt with live web search.
        
    Returns:
        The generated study material as a Markdown string.
    """
    
    # 1. Base setup: Prepare the system prompt based on mode.
    if mode == "summary":
        system_prompt = SUMMARY_SYSTEM_PROMPT
    elif mode == "reviewer":
        system_prompt = REVIEWER_SYSTEM_PROMPT
    else:
        raise ValueError(f"Invalid mode '{mode}'. Must be 'summary' or 'reviewer'.")

    # We format messages for the OpenAI API structure:
    # [{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]
    messages = [
        {"role": "system", "content": system_prompt}
    ]
    
    # Add conversation history if it exists
    if context:
        for msg in context:
            # Supabase stores role as "user" or "assistant", which maps 1:1 to OpenAI
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Prepare the final user prompt
    final_prompt = f"Please process the following notes:\n\n{extracted_text}"

    # 2. Search Logic: If enabled, fetch real-time context
    if include_search:
        # Generate a very quick search query based on the first few words of the notes
        # (In a production app, you might use an LLM to generate the ideal query)
        short_query = extracted_text[:100].replace('\n', ' ').strip()
        search_query = f"Key concepts: {short_query}"
        
        # 3. Fetch search results using _get_search_context()
        search_context = await _get_search_context(search_query)
        
        # 4. Append the search results to the extracted_text
        final_prompt += f"\n\nHere is some additional live web context to help you:\n{search_context}"

    # Append the final constructed prompt to our messages array
    messages.append({
        "role": "user",
        "content": final_prompt
    })

    # Initialize the client
    client = get_llm_client()

    # 5. Call client.chat.completions.create asynchronously using model="glm-4.7-flash"
    try:
        response = await client.chat.completions.create(
            model="glm-4.7-flash",
            messages=messages,
            temperature=0.7, # Good balance of creativity and accuracy for study guides
        )
    except Exception as e:
        raise ValueError(f"Z.ai API call failed: {str(e)}")

    # 6. Return the generated text string
    if not response.choices or not response.choices[0].message.content:
        raise ValueError("Z.ai returned an empty response.")
        
    return response.choices[0].message.content


# ──────────────────────────────────────────────
# CONVENIENCE WRAPPERS (Optional but helpful for testing)
# ──────────────────────────────────────────────

async def generate_summary(text: str, context: Optional[List[Dict]] = None, include_search: bool = False) -> str:
    return await generate_study_material(text, "summary", context, include_search)

async def generate_review_questions(text: str, context: Optional[List[Dict]] = None, include_search: bool = False) -> str:
    return await generate_study_material(text, "reviewer", context, include_search)


# ──────────────────────────────────────────────
# CHAT FOLLOW-UP (text-only messages)
# ──────────────────────────────────────────────

CHAT_SYSTEM_PROMPT = """You are NoteTakrr, an expert AI study assistant.
You are in a conversation with a student who has previously uploaded notes.
Your job is to help them with follow-up questions about their material.

You can:
- Clarify or expand on concepts from the notes
- Improve or restructure a previously generated summary
- Generate additional practice questions
- Explain difficult topics in simpler terms
- Answer any study-related questions

Always respond helpfully and in Markdown format.
Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc².

IMPORTANT: At the end of every response, always ask the student:
"**Would you like me to add this to the document?**"
"""


async def generate_chat_response(
    user_message: str,
    context: Optional[List[Dict]] = None,
    include_search: bool = False
) -> str:
    """Handle follow-up text messages in an existing conversation.
    
    Uses the full conversation history so the model knows what notes
    were discussed previously.
    """
    messages = [
        {"role": "system", "content": CHAT_SYSTEM_PROMPT}
    ]
    
    # Add conversation history so the model has context
    if context:
        for msg in context:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    final_prompt = user_message

    if include_search:
        short_query = user_message[:100].replace('\n', ' ').strip()
        search_context = await _get_search_context(short_query)
        final_prompt += f"\n\nHere is some additional live web context:\n{search_context}"

    messages.append({
        "role": "user",
        "content": final_prompt
    })

    client = get_llm_client()

    try:
        response = await client.chat.completions.create(
            model="glm-4.7-flash",
            messages=messages,
            temperature=0.7,
        )
    except Exception as e:
        raise ValueError(f"Z.ai API call failed: {str(e)}")

    if not response.choices or not response.choices[0].message.content:
        raise ValueError("Z.ai returned an empty response.")
        
    return response.choices[0].message.content
