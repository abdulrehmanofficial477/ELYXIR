import os
import io
import json
import base64
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from groq import Groq

# Document extraction libraries
try:
    import pdfplumber
except ImportError:
    pdfplumber = None

try:
    import docx
except ImportError:
    docx = None

# Load environment variables from .env file
load_dotenv()

app = FastAPI(title="ELYXIR API", version="1.1.0")

# Enable CORS for frontend development & production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = """Your name is ELYXIR. You are a helpful and friendly AI assistant. You can answer questions on any general topic including science, history, technology, current events, daily life, and more. Be clear, accurate, and helpful in your response
Formatting rules:
- Whenever an answer contains multiple points, features, steps, or types, ALWAYS format it using markdown: a bold heading followed by its explanation on the next line.
- Format: **1. Heading**\nExplanation goes here.\n\n**2. Next Heading**\nExplanation goes here.
- Avoid long single paragraphs when the answer clearly contains multiple distinct points.
- This formatting is not required for simple one-line answers — only use it for structured or list-type answers."""

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit
MAX_IMAGES = 5

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".docx", ".doc"}


@app.get("/")
def read_root():
    return {"message": "ELYXIR Backend API is running.", "status": "ok"}


@app.get("/api/health")
def health_check():
    has_key = bool(os.getenv("GROQ_API_KEY") and os.getenv("GROQ_API_KEY") != "your_key_here")
    return {
        "status": "healthy",
        "groq_api_key_configured": has_key,
        "pdf_support": pdfplumber is not None,
        "docx_support": docx is not None,
    }


@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribes user recorded audio to text using Groq Whisper Large v3."""
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_key_here":
        raise HTTPException(status_code=500, detail="Groq API key is not configured.")

    try:
        content = await file.read()
        filename = file.filename or "recording.webm"

        client = Groq(api_key=api_key.strip())
        transcription = client.audio.transcriptions.create(
            file=(filename, content),
            model="whisper-large-v3",
            response_format="json",
        )
        return {"text": transcription.text.strip()}
    except Exception as e:
        print(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Audio transcription failed: {str(e)}")



def extract_text_from_pdf(content: bytes, filename: str) -> str:
    """Extract text from PDF using pdfplumber."""
    if pdfplumber is None:
        return f"[Attached PDF: {filename} (Error: pdfplumber is not installed on server)]"
    try:
        pages_text = []
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                txt = page.extract_text()
                if txt and txt.strip():
                    pages_text.append(f"--- Page {i} ---\n{txt.strip()}")
        
        extracted = "\n\n".join(pages_text) if pages_text else "(No extractable text found in PDF)"
        return f"[Attached PDF: {filename}]\n{extracted}\n\n---\n"
    except Exception as e:
        return f"[Attached PDF: {filename} (Error extracting text: {str(e)})]\n\n---\n"


def extract_text_from_docx(content: bytes, filename: str) -> str:
    """Extract text from DOCX using python-docx."""
    if docx is None:
        return f"[Attached Document: {filename} (Error: python-docx is not installed on server)]"
    try:
        doc = docx.Document(io.BytesIO(content))
        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text and p.text.strip()]
        extracted = "\n".join(paragraphs) if paragraphs else "(No extractable text found in document)"
        return f"[Attached Document: {filename}]\n{extracted}\n\n---\n"
    except Exception as e:
        return f"[Attached Document: {filename} (Error extracting text: {str(e)})]\n\n---\n"

def search_web(query: str, max_results: int = 4) -> str:
    """Performs real-time web search using DuckDuckGo (ddgs)."""
    if not query or not query.strip():
        return ""
    try:
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS

        results = []
        with DDGS() as ddgs:
            raw_results = list(ddgs.text(query.strip(), max_results=max_results))
            for item in raw_results:
                title = item.get("title", "").strip()
                href = item.get("href", "").strip()
                body = item.get("body", "").strip()
                if title or body:
                    results.append(f"• **[{title}]({href})**\n  {body}")

        if results:
            return "\n\n".join(results)
    except Exception as e:
        print(f"Web search exception: {e}")
    return ""


@app.post("/api/chat")
async def chat(
    message: str = Form(""),
    history: Optional[str] = Form("[]"),
    web_search: Optional[str] = Form("false"),
    files: Optional[List[UploadFile]] = File(None),
):
    # Parse history
    parsed_history = []
    if history:
        try:
            parsed_history = json.loads(history)
            if not isinstance(parsed_history, list):
                parsed_history = []
        except Exception:
            parsed_history = []

    uploaded_files = files or []
    is_web_search = str(web_search).strip().lower() in ("true", "1", "yes")

    # Validate that at least text message or an attachment is provided
    if not message.strip() and not uploaded_files:
        raise HTTPException(status_code=400, detail="Message or attachment cannot be empty.")

    image_blocks = []
    extracted_doc_texts = []

    # Process uploaded files
    for file in uploaded_files:
        filename = file.filename or "attachment"
        ext = os.path.splitext(filename)[1].lower()
        content_type = file.content_type or ""

        # Read binary content
        content = await file.read()

        # Check file size limit (10MB)
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{filename}' exceeds the maximum allowed size of 10MB."
            )

        # Check if file is an image
        if content_type.startswith("image/") or ext in ALLOWED_IMAGE_EXTENSIONS:
            if len(image_blocks) >= MAX_IMAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"Maximum of {MAX_IMAGES} images allowed per message."
                )
            
            b64_data = base64.b64encode(content).decode("utf-8")
            mime = content_type if content_type.startswith("image/") else "image/jpeg"
            image_blocks.append({
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{b64_data}"}
            })

        # Check if file is PDF
        elif ext == ".pdf" or content_type == "application/pdf":
            doc_text = extract_text_from_pdf(content, filename)
            extracted_doc_texts.append(doc_text)

        # Check if file is DOCX / DOC
        elif ext in {".docx", ".doc"} or "wordprocessingml" in content_type:
            doc_text = extract_text_from_docx(content, filename)
            extracted_doc_texts.append(doc_text)

        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type for '{filename}'. Only images (PNG, JPG, etc.) and documents (PDF, DOCX) are supported."
            )

    # Perform web search if requested and message is present
    web_context = ""
    if is_web_search and message.strip():
        search_snippets = search_web(message.strip(), max_results=4)
        if search_snippets:
            web_context = (
                f"[Live Web Search Results for query: \"{message.strip()}\"]\n"
                f"{search_snippets}\n\n"
                "Instructions for using web results: Use the above fresh web search findings to provide an accurate, up-to-date response. Cite relevant links in markdown [Title](URL) if helpful.\n---\n"
            )

    # Compose full user message text with document context and web search
    full_text = ""
    if web_context:
        full_text += web_context + "\n"

    if extracted_doc_texts:
        full_text += "\n".join(extracted_doc_texts) + "\n"
    
    if message.strip():
        full_text += message.strip()
    elif not full_text:
        # User only attached images with no caption text
        full_text = "Please describe and analyze the attached image(s)."

    # Determine model and format messages
    has_images = len(image_blocks) > 0
    selected_model = "qwen/qwen3.6-27b" if has_images else "openai/gpt-oss-20b"

    def stream_generator():
        try:
            api_key = os.getenv("GROQ_API_KEY")
            if not api_key or api_key.strip() == "" or api_key == "your_key_here":
                yield (
                    "⚠️ Groq API key is missing or not configured.\n\n"
                    "Please create a `.env` file in the `backend/` folder with:\n"
                    "```\nGROQ_API_KEY=gsk_your_actual_key_here\n```\n"
                    "Then restart the backend server."
                )
                return

            client = Groq(api_key=api_key.strip())

            # Prepare message history
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            # Add previous conversation history
            for item in parsed_history:
                role = item.get("role")
                content = item.get("content")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": str(content)})

            # Build current user message
            if has_images:
                # Groq multimodal vision format: array of text and image_url blocks
                user_content = [{"type": "text", "text": full_text}]
                user_content.extend(image_blocks)
                messages.append({"role": "user", "content": user_content})
            else:
                messages.append({"role": "user", "content": full_text})

            # Call Groq streaming chat completion
            stream = client.chat.completions.create(
                model=selected_model,
                messages=messages,
                stream=True,
            )

            for chunk in stream:
                if chunk.choices and chunk.choices[0].delta:
                    token = chunk.choices[0].delta.content
                    if token:
                        yield token

        except Exception as e:
            error_msg = str(e)
            yield f"\n\n⚠️ An error occurred while communicating with Groq: {error_msg}"

    return StreamingResponse(stream_generator(), media_type="text/plain")

