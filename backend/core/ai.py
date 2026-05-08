import json
import httpx
from typing import AsyncGenerator
from core.config import settings


def _clean_json(raw: str) -> str:
    """Strip markdown code fences from LLM output."""
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    return raw.strip()


async def _call_groq(messages: list[dict], temperature: float = 0.2, timeout: float = 30.0) -> str:
    """Low-level Groq API call. Returns the raw text content."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": temperature,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload, headers=headers, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]


async def generate_questions_from_text(text: str) -> list[dict]:
    """
    Calls Groq to generate 4-6 rich learning objects from the text.
    Each object contains data for all three review modes:
      - Spark:     key_insights (4-5 short insight strings)
      - Challenge: question + answer + distractor_options (3 wrong answers)
      - Recall:    conversational_prompt (open-ended question)
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        print("Warning: GROQ_API_KEY not set. Returning mock questions.")
        return [
            {
                "question": "What is spaced repetition?",
                "answer": "A learning technique where review intervals increase as the material is mastered.",
                "key_insights": [
                    "Spaced repetition fights the forgetting curve",
                    "Review intervals grow exponentially over time",
                    "It was formalized by Piotr Wozniak in the SM-2 algorithm",
                    "Active recall during spaced intervals strengthens long-term memory"
                ],
                "distractor_options": [
                    "A technique where you re-read notes every day",
                    "A method that uses random review scheduling",
                    "A system that only tests you once after learning"
                ],
                "conversational_prompt": "Explain in your own words how spaced repetition helps you remember things long-term, and why simply re-reading notes is less effective."
            }
        ]

    num_cards = "6"
    # Always generate 6 cards as requested

    prompt = f"""You are an expert educator. Read the following text and generate {num_cards} rich learning objects.

Each learning object must be a JSON object with these exact fields:
- "question": A clear, conceptual question testing genuine understanding (not trivia).
- "answer": A concise but complete correct answer (1-2 sentences, max 15 words).
- "key_insights": An array of exactly 4-5 complete sentences (minimum 15 words each) that express genuine takeaways. NOT keywords or short phrases. Each must be a full sentence explaining why it matters. Example of BAD: "Last 5 years", "Hundreds of hours". Example of GOOD: "Single-player games from the last 5 years tend to offer 60+ hours of content, making them significantly longer than earlier generations."
- "distractor_options": An array of exactly 3 plausible but incorrect answers. Each MUST be similar in length to the correct answer (max 15 words). All four options (answer + distractors) must be grammatically parallel sentences so no option is identifiable by length or style.
- "conversational_prompt": An open-ended question that asks the learner to explain the concept in their own words. It should be different from the "question" field — more reflective and deeper.

IMPORTANT: Generate exactly {num_cards} questions. Not more, not less.

Return ONLY a valid JSON array. No markdown, no explanation, no preamble.

Text to analyze:
{text}"""

    messages = [
        {"role": "system", "content": "You are a JSON-generating assistant. Output strictly valid JSON arrays with no extra text."},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = await _call_groq(messages)
        cleaned = _clean_json(raw)
        questions = json.loads(cleaned)
        return questions
    except httpx.HTTPStatusError as e:
        print(f"HTTP Error {e.response.status_code}")
        print(f"Response Body: {e.response.text}")
        return []
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return []


async def generate_content_summary(text: str, title: str) -> dict:
    """
    Generates a 3-sentence summary, key insights, and genre category
    for a piece of content. Returns {"summary": str, "key_insights": [str], "genre": str}.
    """
    api_key = settings.GROQ_API_KEY
    if not api_key:
        return {
            "summary": f"This content covers the topic: {title}.",
            "key_insights": ["Key insight from the content."],
            "genre": "General"
        }

    prompt = f"""Read the following content and produce:
1. A "summary": A concise 3-sentence summary of what this content covers.
2. "key_insights": An array of 4 to 5 complete sentences (minimum 15 words each, NOT keywords or short phrases). Each insight must be a full sentence that expresses a genuine takeaway.
3. "genre": A single broad category from this fixed list: Technology, Gaming, Finance, Science, History, Health, Productivity, Entertainment, Business, Education, Politics, Culture. Choose the ONE that best describes this content.

Return ONLY valid JSON with exactly three fields: "summary" (string), "key_insights" (array of strings), "genre" (string).

Title: {title}

Content:
{text}"""

    messages = [
        {"role": "system", "content": "You are a JSON-generating assistant. Output strictly valid JSON with no extra text."},
        {"role": "user", "content": prompt},
    ]

    try:
        raw = await _call_groq(messages, timeout=20.0)
        cleaned = _clean_json(raw)
        result = json.loads(cleaned)
        return {
            "summary": result.get("summary", ""),
            "key_insights": result.get("key_insights", []),
            "genre": result.get("genre", "General")
        }
    except Exception as e:
        print(f"[AI] Summary generation failed: {e}")
        return {
            "summary": f"Content about: {title}.",
            "key_insights": ["Content was processed but summary generation failed."],
            "genre": "General"
        }


async def stream_chat_response(messages: list[dict], temperature: float = 0.2) -> AsyncGenerator[str, None]:
    """Streams Groq chat completions token by token."""
    api_key = settings.GROQ_API_KEY
    if not api_key:
        raise RuntimeError("GROQ_API_KEY not set")

    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": "llama-3.3-70b-versatile",
        "messages": messages,
        "temperature": temperature,
        "stream": True,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", url, json=payload, headers=headers) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content", "")
                        if content:
                            yield content
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
