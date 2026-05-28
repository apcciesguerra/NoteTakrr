"""
gemini_chain.py — Gemini LLM integration for NoteTakrr Lite.

This module handles all communication with Google's Gemini API.
It takes extracted note text, applies Chain-of-Thought (CoT) prompting,
and returns AI-generated study materials in one of two modes:
  - "summary"  → a narrative study guide
  - "reviewer" → targeted Q&A pairs

It can optionally ground responses with live Google Search results
when the user enables the `include_search` flag.
"""

# ──────────────────────────────────────────────
# IMPORTS
# ──────────────────────────────────────────────

# `genai` is the top-level module from the new google-genai SDK.
# We use it to create a Client that talks to the Gemini API.
from google import genai

# `types` gives us Pydantic-style config objects like
# GenerateContentConfig, Tool, GoogleSearch, and Content.
# These let us configure each API call (e.g. attach tools, set system prompts).
from google.genai import types

# Standard library imports for type hints.
from typing import Optional, List, Dict

# We read the API key from environment variables via python-dotenv,
# which is loaded in main.py at startup.
import os


# ──────────────────────────────────────────────
# SYSTEM PROMPTS (Chain-of-Thought)
# ──────────────────────────────────────────────
# These are the "persona" instructions sent to Gemini at the start
# of every request. They tell the model HOW to think and respond.
#
# Chain-of-Thought (CoT) means we explicitly ask the model to
# "think step by step" before producing its final answer.
# This consistently improves reasoning quality.

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

Use Markdown formatting for readability."""


# ──────────────────────────────────────────────
# GEMINI CLIENT
# ──────────────────────────────────────────────

def get_gemini_client() -> genai.Client:
    """Create and return a Gemini API client.

    The client reads GOOGLE_API_KEY from the environment automatically
    when you pass it via `api_key=`. We grab it from os.environ so we
    can fail with a clear error if it's missing.

    Returns:
        A configured genai.Client ready to make API calls.

    Raises:
        ValueError: If GOOGLE_API_KEY is not set in the environment.
    """
    # Read the API key that was loaded into the environment by python-dotenv.
    api_key = os.environ.get("GOOGLE_API_KEY")

    # Fail fast with a helpful message rather than a cryptic 401 from Google.
    if not api_key or api_key == "your_google_api_key_here":
        raise ValueError(
            "GOOGLE_API_KEY is not set. "
            "Add your Gemini API key to backend/.env"
        )

    # Construct the client. Every API call we make will go through this object.
    # The `api_key` parameter authenticates us with Google's servers.
    client = genai.Client(api_key=api_key)
    return client


# ──────────────────────────────────────────────
# HELPER: BUILD CONVERSATION HISTORY
# ──────────────────────────────────────────────

def build_chat_history(
    context: Optional[List[Dict]] = None,
) -> List[types.Content]:
    """Convert our database message history into the format Gemini expects.

    Gemini's API expects a list of `Content` objects, each with a `role`
    ("user" or "model") and a list of `Part` objects (the actual text).

    Our database stores messages with role "assistant", but Gemini uses
    the role name "model" instead — so we translate that here.

    Args:
        context: A list of message dicts from the database, each having
                 at minimum {"role": "user"|"assistant", "content": "..."}.

    Returns:
        A list of types.Content objects that Gemini understands.
        Returns an empty list if context is None or empty.
    """
    # If there's no prior conversation, return an empty history.
    if not context:
        return []

    history = []
    for message in context:
        # Translate "assistant" → "model" because that's what Gemini expects.
        # "user" stays "user".
        role = "model" if message["role"] == "assistant" else "user"

        # Wrap the message text in a Content object.
        # `types.Content` is the Gemini SDK's container for a single turn
        # in a conversation. Each turn has a role and a list of Parts.
        history.append(
            types.Content(
                role=role,
                parts=[types.Part.from_text(text=message["content"])],
            )
        )

    return history


# ──────────────────────────────────────────────
# HELPER: BUILD API CONFIG
# ──────────────────────────────────────────────

def build_config(
    system_prompt: str,
    include_search: bool = False,
) -> types.GenerateContentConfig:
    """Build the configuration object for a Gemini API call.

    This config tells Gemini:
      - What system instructions to follow (our CoT prompt).
      - What tools to use (optionally Google Search for grounding).

    Args:
        system_prompt: The system-level instructions for the model
                       (either SUMMARY_SYSTEM_PROMPT or REVIEWER_SYSTEM_PROMPT).
        include_search: If True, attach the Google Search tool so Gemini
                        can look up real-time information to supplement
                        the student's notes.

    Returns:
        A GenerateContentConfig object ready to pass to the API.
    """
    # Start with an empty tools list.
    tools = []

    # If the user toggled search on, we add Google Search as a tool.
    # This lets Gemini fetch live web results to enrich its answers —
    # for example, pulling in the latest definition of a concept or
    # verifying a fact from the student's notes.
    if include_search:
        tools.append(types.Tool(google_search=types.GoogleSearch()))

    # Assemble the config. `system_instruction` is like a persistent
    # "system message" that shapes every response in this conversation.
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        tools=tools if tools else None,  # Pass None if no tools, not []
    )

    return config


# ──────────────────────────────────────────────
# MAIN FUNCTION: GENERATE RESPONSE
# ──────────────────────────────────────────────

async def generate_response(
    text: str,
    mode: str = "summary",
    context: Optional[List[Dict]] = None,
    include_search: bool = False,
) -> str:
    """Generate AI study material from the given note text.

    This is the main entry point that the API route will call.
    It orchestrates everything:
      1. Picks the right system prompt based on mode.
      2. Builds the conversation history from prior messages.
      3. Configures optional Google Search grounding.
      4. Sends everything to Gemini and returns the response text.

    Args:
        text: The extracted text from the user's uploaded notes.
        mode: Either "summary" (study guide) or "reviewer" (Q&A pairs).
        context: Optional list of prior messages for conversational context.
                 Each dict should have {"role": str, "content": str}.
        include_search: Whether to enable Google Search grounding.

    Returns:
        The generated study material as a string (Markdown formatted).

    Raises:
        ValueError: If mode is not "summary" or "reviewer".
        ValueError: If GOOGLE_API_KEY is not configured.
    """

    # ── Step 1: Pick the system prompt ──
    # The system prompt defines the model's behavior for the entire request.
    # We choose between two carefully crafted CoT prompts.
    if mode == "summary":
        system_prompt = SUMMARY_SYSTEM_PROMPT
    elif mode == "reviewer":
        system_prompt = REVIEWER_SYSTEM_PROMPT
    else:
        raise ValueError(f"Invalid mode '{mode}'. Must be 'summary' or 'reviewer'.")

    # ── Step 2: Initialize the Gemini client ──
    # This creates a fresh client with our API key.
    # In a production app you might cache this, but for clarity
    # we create it per-request here.
    client = get_gemini_client()

    # ── Step 3: Build the conversation history ──
    # If this is a follow-up message in an existing conversation,
    # we include the prior messages so Gemini has context.
    history = build_chat_history(context)

    # ── Step 4: Build the API config ──
    # This bundles the system prompt and optional tools together.
    config = build_config(system_prompt, include_search)

    # ── Step 5: Assemble the full contents list ──
    # The contents list is the full conversation Gemini will see.
    # It's structured as: [prior history...] + [new user message].
    # We wrap the user's note text in a Content object.
    user_message = types.Content(
        role="user",
        parts=[types.Part.from_text(text=text)],
    )

    # Combine history with the new message.
    # If there's no history, contents is just [user_message].
    contents = history + [user_message]

    # ── Step 6: Call the Gemini API ──
    # `generate_content` sends our conversation to the model and
    # returns a response. We use "gemini-2.5-flash" as the model —
    # it's fast, capable, and cost-effective for study material generation.
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=config,
    )

    # ── Step 7: Extract and return the text ──
    # The response object has a `.text` property that gives us the
    # model's reply as a plain string. This is the study guide or
    # the Q&A pairs, formatted in Markdown.
    return response.text


# ──────────────────────────────────────────────
# CONVENIENCE WRAPPERS
# ──────────────────────────────────────────────
# These are thin wrappers around `generate_response` that make
# the calling code in routes.py more readable.

async def generate_summary(
    text: str,
    context: Optional[List[Dict]] = None,
    include_search: bool = False,
) -> str:
    """Generate a narrative study guide from notes.

    Wrapper around generate_response with mode="summary".

    Args:
        text: Extracted note text.
        context: Optional prior conversation messages.
        include_search: Whether to augment with Google Search.

    Returns:
        Markdown-formatted study guide.
    """
    return await generate_response(
        text=text,
        mode="summary",
        context=context,
        include_search=include_search,
    )


async def generate_review_questions(
    text: str,
    context: Optional[List[Dict]] = None,
    include_search: bool = False,
) -> str:
    """Generate Q&A review pairs from notes.

    Wrapper around generate_response with mode="reviewer".

    Args:
        text: Extracted note text.
        context: Optional prior conversation messages.
        include_search: Whether to augment with Google Search.

    Returns:
        Markdown-formatted Q&A pairs.
    """
    return await generate_response(
        text=text,
        mode="reviewer",
        context=context,
        include_search=include_search,
    )
