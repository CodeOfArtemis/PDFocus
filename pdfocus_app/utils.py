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
import re
try:
    import pymorphy2
    PYMORPHY_AVAILABLE = True
except ImportError:
    PYMORPHY_AVAILABLE = False
    print("Warning: pymorphy2 not installed. Install it with: pip install pymorphy2")

# Комплексная проверка и загрузка необходимых данных для NLTK
def download_nltk_data_if_missing(resource_name, resource_dir):
    try:
        nltk.data.find(f"{resource_dir}/{resource_name}")
    except LookupError:
        nltk.download(resource_name)

download_nltk_data_if_missing('punkt', 'tokenizers')
download_nltk_data_if_missing('punkt_tab', 'tokenizers')
download_nltk_data_if_missing('stopwords', 'corpora')

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
    Улучшенное извлечение ключевых слов с лемматизацией и фильтрацией стоп-слов.
    Returns a comma-separated string of keywords.
    """
    if not text:
        return ""

    # Предварительная обработка текста
    cleaned_text = preprocess_text_for_keywords(text)
    
    if not cleaned_text:
        return ""

    language = "en"  # Используем английский как более универсальный
    max_ngram_size = 2  # Увеличиваем для лучшего извлечения составных терминов
    deduplication_threshold = 0.7  # Уменьшен для лучшей дедупликации
    num_of_keywords = 20  # Увеличено, т.к. будет дополнительная фильтрация

    custom_kw_extractor = yake.KeywordExtractor(
        lan=language,
        n=max_ngram_size,
        dedupLim=deduplication_threshold,
        top=num_of_keywords,
        features=None
    )

    keywords = custom_kw_extractor.extract_keywords(cleaned_text)
    
    # Постобработка ключевых слов
    raw_keywords = [kw for kw, score in keywords]
    processed_keywords = postprocess_keywords(raw_keywords)
    
    # Возвращаем топ-10 после обработки
    result = ", ".join(processed_keywords[:10])
    return result


def preprocess_text_for_keywords(text):
    """
    Предварительная обработка текста: очистка, лемматизация, удаление стоп-слов.
    """
    if not text:
        return ""
    
    # Базовая очистка текста
    text = re.sub(r'[^\w\s]', ' ', text)  # Удаляем пунктуацию
    text = re.sub(r'\d+', '', text)       # Удаляем числа
    text = re.sub(r'\s+', ' ', text)      # Нормализуем пробелы
    text = text.lower().strip()
    
    # Получаем русские стоп-слова
    try:
        from nltk.corpus import stopwords
        russian_stopwords = set(stopwords.words('russian'))
    except:
        # Базовый набор русских стоп-слов если NLTK недоступен
        russian_stopwords = {
            'и', 'в', 'во', 'не', 'что', 'он', 'на', 'я', 'с', 'со', 'как', 'а', 'то', 'все', 'она', 'так', 'его', 'но', 'да', 'ты', 'к', 'у', 'же', 'вы', 'за', 'бы', 'по', 'только', 'ее', 'мне', 'было', 'вот', 'от', 'меня', 'еще', 'нет', 'о', 'из', 'ему', 'теперь', 'когда', 'даже', 'ну', 'вдруг', 'ли', 'если', 'уже', 'или', 'ни', 'быть', 'был', 'него', 'до', 'вас', 'нибудь', 'опять', 'уж', 'вам', 'ведь', 'там', 'потом', 'себя', 'ничего', 'ей', 'может', 'они', 'тут', 'где', 'есть', 'надо', 'ней', 'для', 'мы', 'тебя', 'их', 'чем', 'была', 'сам', 'чтоб', 'без', 'будто', 'чего', 'раз', 'тоже', 'себе', 'под', 'будет', 'ж', 'тогда', 'кто', 'этот', 'того', 'потому', 'этого', 'какой', 'совсем', 'ним', 'здесь', 'этом', 'один', 'почти', 'мой', 'тем', 'чтобы', 'нее', 'сейчас', 'были', 'куда', 'зачем', 'всех', 'никогда', 'можно', 'при', 'наконец', 'два', 'об', 'другой', 'хоть', 'после', 'над', 'больше', 'тот', 'через', 'эти', 'нас', 'про', 'всего', 'них', 'какая', 'много', 'разве', 'три', 'эту', 'моя', 'впрочем', 'хорошо', 'свою', 'этой', 'перед', 'иногда', 'лучше', 'чуть', 'том', 'нельзя', 'такой', 'им', 'более', 'всегда', 'конечно', 'всю', 'между'
        }
    
    # Добавляем дополнительные стоп-слова
    additional_stopwords = {
        'это', 'этого', 'этой', 'этом', 'эта', 'эти', 'которые', 'которая', 'которое', 'который',
        'также', 'таким', 'такое', 'такая', 'такие', 'может', 'могут', 'можем', 'мочь',
        'один', 'одна', 'одно', 'одни', 'первый', 'первая', 'первое', 'первые',
        'должен', 'должна', 'должно', 'должны', 'нужно', 'нужен', 'нужна', 'нужны'
    }
    russian_stopwords.update(additional_stopwords)
    
    # Разбиваем на слова и фильтруем
    words = text.split()
    filtered_words = []
    
    for word in words:
        # Пропускаем слишком короткие слова
        if len(word) < 3:
            continue
            
        # Пропускаем стоп-слова
        if word in russian_stopwords:
            continue
            
        # Лемматизация если доступна
        if PYMORPHY_AVAILABLE:
            morph = pymorphy2.MorphAnalyzer()
            parsed_word = morph.parse(word)[0]
            
            # Фильтруем по частям речи (оставляем существительные, прилагательные, глаголы)
            if parsed_word.tag.POS in {'NOUN', 'ADJF', 'ADJS', 'VERB', 'INFN'}:
                lemma = parsed_word.normal_form
                if lemma not in russian_stopwords and len(lemma) >= 3:
                    filtered_words.append(lemma)
        else:
            # Без лемматизации просто добавляем слово
            filtered_words.append(word)
    
    return ' '.join(filtered_words)


def postprocess_keywords(keywords):
    """
    Постобработка ключевых слов: дедупликация схожих слов, финальная фильтрация.
    """
    if not keywords:
        return []
    
    processed = []
    seen_roots = set()
    
    for keyword in keywords:
        keyword = keyword.strip()
        
        # Пропускаем слишком короткие
        if len(keyword) < 3:
            continue
            
        # Простая дедупликация по корню слова (первые 4 символа для длинных слов)
        root_length = min(4, len(keyword) - 1) if len(keyword) > 4 else len(keyword)
        root = keyword[:root_length].lower()
        if root in seen_roots:
            continue
            
        # Разбиваем составные фразы на отдельные слова
        words_in_keyword = keyword.split()
        added_word = False
        for word in words_in_keyword:
            word = word.strip()
            if len(word) < 3:
                continue
            # Принимаем только русские и английские слова
            if re.match(r'^[а-яёa-z]+$', word, re.IGNORECASE):
                word_root = word[:min(4, len(word) - 1)] if len(word) > 4 else word
                word_root = word_root.lower()
                if word_root not in seen_roots:
                    processed.append(word.lower())
                    seen_roots.add(word_root)
                    added_word = True
                    break  # Берем только первое подходящее слово из фразы
    
    return processed

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