import pytesseract
from pdf2image import convert_from_path
import tempfile
import os
import PyPDF2
from PIL import Image
from PDFocus import settings

if hasattr(settings, 'PYTESSERACT_PATH'):
    pytesseract.pytesseract.tesseract_cmd = settings.PYTESSERACT_PATH
def extract_text_from_pdf(pdf_file):
    text = ""
    temp_dir = tempfile.mkdtemp()
    temp_pdf_path = os.path.join(temp_dir, 'temp.pdf')

    try:
        # Сохраняем временный файл
        with open(temp_pdf_path, 'wb+') as temp_pdf:
            for chunk in pdf_file.chunks():
                temp_pdf.write(chunk)

        # Пытаемся извлечь текст напрямую из PDF
        with open(temp_pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""

        # Если текст не извлекся, используем OCR
        if not text.strip():
            images = convert_from_path(temp_pdf_path)
            for i, image in enumerate(images):
                text += pytesseract.image_to_string(image)

    except Exception as e:
        print(f"Error processing PDF: {e}")
    finally:
        # Удаляем временные файлы
        if os.path.exists(temp_dir):
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for name in files:
                    os.remove(os.path.join(root, name))
            os.rmdir(temp_dir)

    return text