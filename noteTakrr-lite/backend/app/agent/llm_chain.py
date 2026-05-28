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
- A descriptive title for the study guide (use # heading).
- Clearly labeled sections with ## headings.
- Key concepts explained in simple language.
- Important definitions highlighted with **bold**.
- Relevant examples or analogies to aid understanding.
- A brief summary at the end.

FORMATTING RULES (very important):
- Use bullet points (- ) for lists of related concepts. Never write long unbroken paragraphs.
- Keep paragraphs SHORT — 2-3 sentences max, then add a blank line.
- Use blank lines between sections for breathing room.
- Use **bold** for key terms and important vocabulary.
- Use numbered lists (1. 2. 3.) for sequential steps or processes.
- Use > blockquotes for important formulas or definitions.
- Add a --- horizontal rule between major sections.
- Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc².

If web search context is provided alongside the notes, USE it to enrich your study guide with accurate, up-to-date information. You DO have access to web search results when they are provided.

GUARDRAILS:
- If the uploaded content appears to be blank, empty, or contains no meaningful study material (e.g., a random image of people, a blank page, or non-academic content), respond ONLY with:
  "⚠️ **I couldn't find any study material in your upload.** Please upload notes, slides, textbook pages, or other academic content and I'll create a study guide for you."
- Do NOT generate study material from non-academic content like casual photos, memes, or blank files.

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

FORMATTING RULES (very important):
- Put a blank line between each Q&A pair.
- Use **bold** for question numbers and key terms.
- Break long answers into bullet points instead of long paragraphs.
- Keep explanations digestible — 2-3 sentences per point, then a blank line.
- Use > blockquotes for important formulas.
- Add a --- horizontal rule between each Q&A pair.
- Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc².

Format each Q&A pair like this:

---

**Q1: [Question]**

**A1:**
- [Key point 1]
- [Key point 2]
- [Explanation]

If web search context is provided alongside the notes, USE it to create better, more accurate questions. You DO have access to web search results when they are provided.

GUARDRAILS:
- If the uploaded content appears to be blank, empty, or contains no meaningful study material (e.g., a random image of people, a blank page, or non-academic content), respond ONLY with:
  "⚠️ **I couldn't find any study material in your upload.** Please upload notes, slides, textbook pages, or other academic content and I'll generate review questions for you."
- Do NOT generate questions from non-academic content like casual photos, memes, or blank files."""


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
- Use web search results when they are provided to give accurate, up-to-date answers

FORMATTING RULES (very important):
- Use bullet points (- ) for lists. Never write long unbroken paragraphs.
- Keep paragraphs SHORT — 2-3 sentences max.
- Use **bold** for key terms.
- Use blank lines between sections for breathing room.
- Use > blockquotes for important formulas or definitions.
- Avoid using LaTeX math notation (like $x$ or $$equation$$). Instead, write formulas in plain text, for example: F = ma, a = Δv / Δt, E = mc².

If web search context is provided alongside the student's question, USE it to give accurate answers. You DO have real-time web search access when results are included in the message. However, web search should ONLY be used to expand on topics from the student's uploaded notes — NOT for random unrelated queries.

GUARDRAILS (very important):
- You are ONLY a study assistant. You can ONLY help with topics related to the student's previously uploaded notes and study materials.
- If the student asks something completely unrelated to their uploaded study material (e.g., "what is an apple", "tell me a joke", "what's the weather"), respond ONLY with:
  "📚 **I'm NoteTakrr, your study assistant!** I can only help with your uploaded study materials. Try asking me to clarify a concept from your notes, generate more practice questions, or improve your summary."
- Do NOT answer general knowledge questions, trivia, or anything outside the scope of the student's uploaded academic content.
- If there is no conversation history (no previously uploaded notes), remind the student to upload their study materials first.

IMPORTANT: At the end of every on-topic response, always ask the student:
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


# ──────────────────────────────────────────────
# STREAMING VERSIONS (Server-Sent Events)
# ──────────────────────────────────────────────

async def _build_study_messages(extracted_text: str, mode: str, context, include_search: bool):
    """Shared message-building logic for both streaming and non-streaming."""
    if mode == "summary":
        system_prompt = SUMMARY_SYSTEM_PROMPT
    elif mode == "reviewer":
        system_prompt = REVIEWER_SYSTEM_PROMPT
    else:
        raise ValueError(f"Invalid mode '{mode}'. Must be 'summary' or 'reviewer'.")

    messages = [{"role": "system", "content": system_prompt}]
    
    if context:
        for msg in context:
            messages.append({"role": msg["role"], "content": msg["content"]})

    final_prompt = f"Please process the following notes:\n\n{extracted_text}"

    if include_search:
        short_query = extracted_text[:100].replace('\n', ' ').strip()
        search_context = await _get_search_context(f"Key concepts: {short_query}")
        final_prompt += f"\n\nHere is some additional live web context to help you:\n{search_context}"

    messages.append({"role": "user", "content": final_prompt})
    return messages


async def _build_chat_messages(user_message: str, context, include_search: bool):
    """Shared message-building logic for chat follow-ups."""
    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
    
    if context:
        for msg in context:
            messages.append({"role": msg["role"], "content": msg["content"]})

    final_prompt = user_message
    if include_search:
        short_query = user_message[:100].replace('\n', ' ').strip()
        search_context = await _get_search_context(short_query)
        final_prompt += f"\n\nHere is some additional live web context:\n{search_context}"

    messages.append({"role": "user", "content": final_prompt})
    return messages


async def stream_study_material(extracted_text: str, mode: str, context=None, include_search: bool = False):
    """Async generator that yields tokens as they arrive from Z.ai."""
    messages = await _build_study_messages(extracted_text, mode, context, include_search)
    client = get_llm_client()

    stream = await client.chat.completions.create(
        model="glm-4.7-flash",
        messages=messages,
        temperature=0.7,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def stream_chat_response(user_message: str, context=None, include_search: bool = False):
    """Async generator that yields tokens as they arrive from Z.ai."""
    messages = await _build_chat_messages(user_message, context, include_search)
    client = get_llm_client()

    stream = await client.chat.completions.create(
        model="glm-4.7-flash",
        messages=messages,
        temperature=0.7,
        stream=True,
    )

    async for chunk in stream:
        if chunk.choices and chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
