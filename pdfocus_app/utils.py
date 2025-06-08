import pytesseract
from pdf2image import convert_from_path
import tempfile
import os
import PyPDF2
from PIL import Image
from PDFocus import settings
import yake
import nltk
from sumy.parsers.plaintext import PlaintextParser
from sumy.nlp.tokenizers import Tokenizer
from sumy.summarizers.text_rank import TextRankSummarizer

# Комплексная проверка и загрузка необходимых данных для NLTK
def download_nltk_data_if_missing(resource_name, resource_dir):
    try:
        nltk.data.find(f"{resource_dir}/{resource_name}")
    except LookupError:
        nltk.download(resource_name)

download_nltk_data_if_missing('punkt', 'tokenizers')
download_nltk_data_if_missing('punkt_tab', 'tokenizers')

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

def extract_text_by_pages(pdf_file):
    """
    Извлекает текст из PDF файла по страницам.
    Возвращает словарь {номер_страницы: текст_страницы}
    """
    pages_text = {}
    temp_dir = tempfile.mkdtemp()
    temp_pdf_path = os.path.join(temp_dir, 'temp.pdf')

    try:
        # Сохраняем временный файл
        with open(temp_pdf_path, 'wb+') as temp_pdf:
            for chunk in pdf_file.chunks():
                temp_pdf.write(chunk)

        # Пытаемся извлечь текст напрямую из PDF по страницам
        with open(temp_pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            
            for page_num, page in enumerate(reader.pages, 1):
                page_text = page.extract_text() or ""
                pages_text[page_num] = page_text

        # Если текст не извлекся, используем OCR
        if not any(text.strip() for text in pages_text.values()):
            images = convert_from_path(temp_pdf_path)
            pages_text = {}  # Очищаем предыдущие результаты
            
            for i, image in enumerate(images, 1):
                page_text = pytesseract.image_to_string(image)
                pages_text[i] = page_text

    except Exception as e:
        print(f"Error processing PDF by pages: {e}")
    finally:
        # Удаляем временные файлы
        if os.path.exists(temp_dir):
            for root, dirs, files in os.walk(temp_dir, topdown=False):
                for name in files:
                    os.remove(os.path.join(root, name))
            os.rmdir(temp_dir)

    return pages_text

def extract_keywords_from_text(text):
    """
    Extracts keywords from the given text using YAKE.
    Returns a comma-separated string of keywords.
    """
    if not text:
        return ""

    language = "ru"  # Предполагаем, что текст на русском
    max_ngram_size = 1
    deduplication_threshold = 0.9
    num_of_keywords = 10

    custom_kw_extractor = yake.KeywordExtractor(
        lan=language,
        n=max_ngram_size,
        dedupLim=deduplication_threshold,
        top=num_of_keywords,
        features=None
    )

    keywords = custom_kw_extractor.extract_keywords(text)
    
    # Возвращаем только сами слова, объединенные через запятую
    return ", ".join([kw for kw, score in keywords])

def extract_theme_from_text(text, word_count=5):
    """
    Generates a concise theme from the given text using Sumy's TextRank.
    """
    if not text or len(text.split()) < 20:
        return "Не удалось определить тему"
    
    parser = PlaintextParser.from_string(text, Tokenizer("russian"))
    # Используем TextRank для извлечения ключевых предложений/фраз
    summarizer = TextRankSummarizer()
    
    # Получаем самые важные предложения
    summary = summarizer(parser.document, 1) # Берем самое важное предложение

    # Из него делаем короткую фразу
    theme = " ".join(str(s) for s in summary)
    
    # Обрезаем до нужного количества слов и добавляем многоточие
    words = theme.split()
    if len(words) > 9:
        theme = " ".join(words[:9]) + "..."
    elif len(words) < 3 and len(text.split()) > 3:
        # Если тема слишком короткая, берем первые несколько слов из текста
        theme = " ".join(text.split()[:9]) + "..."
    
    return theme if theme else "Не удалось определить тему"