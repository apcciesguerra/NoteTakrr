"""Document processor for OCR and PDF parsing."""

import io
from typing import Optional
from fastapi import UploadFile, HTTPException
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes


async def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from an image using Pytesseract OCR.
    
    Args:
        image_bytes: Raw bytes of the image file.
        
    Returns:
        Extracted text string.
    """
    try:
        # Load the image from bytes using PIL
        image = Image.open(io.BytesIO(image_bytes))
        # Use Tesseract OCR to extract text from the image
        text = pytesseract.image_to_string(image)
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process image: {str(e)}")


async def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extract text from a PDF file using pdf2image + OCR.
    
    Args:
        pdf_bytes: Raw bytes of the PDF file.
        
    Returns:
        Extracted text string.
    """
    try:
        # Convert the PDF bytes into a list of PIL Image objects (one per page)
        pages = convert_from_bytes(pdf_bytes)
        
        extracted_text = []
        # Run OCR on each page and collect the text
        for idx, page in enumerate(pages):
            text = pytesseract.image_to_string(page)
            extracted_text.append(f"--- Page {idx + 1} ---\n{text}")
            
        return "\n\n".join(extracted_text).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process PDF: {str(e)}")


async def process_file(file: UploadFile) -> str:
    """Read an uploaded file and route it to the appropriate processor based on its content type.
    
    Args:
        file: The FastAPI UploadFile object.
        
    Returns:
        Extracted text string.
    """
    # Read the file's contents into memory
    file_bytes = await file.read()
    content_type = file.content_type
    
    if not content_type:
        content_type = ""

    # Route based on MIME type
    if content_type.startswith("text/") or content_type == "application/json":
        # Decode plain text files
        return file_bytes.decode("utf-8").strip()
    
    elif content_type.startswith("image/"):
        # Process image files via OCR
        return await extract_text_from_image(file_bytes)
    
    elif content_type == "application/pdf":
        # Process PDF files
        return await extract_text_from_pdf(file_bytes)
    
    else:
        # Attempt to decode as text as a fallback, otherwise raise an error
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            raise HTTPException(
                status_code=400, 
                detail=f"Unsupported file type: {content_type}. Please upload a text, image, or PDF file."
            )
