# Tech Context: PDFocus

## Backend
- **Framework**: Django 5.2
- **Language**: Python 3.11
- **Database**: PostgreSQL (через `psycopg2-binary`)
- **Асинхронность**: ASGI (через `asgiref`)

## Frontend
- **PDF Rendering**: PDF.js (модульный импорт с CDN)
  - URL: `https://mozilla.github.io/pdf.js/build/pdf.mjs`
  - Worker: `https://mozilla.github.io/pdf.js/build/pdf.worker.mjs`
- **JavaScript**: Vanilla ES6+ с модульным подходом
- **CSS**: Custom CSS с переменными и flexbox/grid
- **AJAX**: Fetch API с CSRF-защитой

## Обработка PDF и текста
- **Извлечение текста из PDF**:
    - `PyPDF2`: для прямого извлечения текстового слоя
    - `pdf2image`: для конвертации страниц PDF в изображения
- **Распознавание текста (OCR)**:
    - `pytesseract`: Python-обертка для Tesseract OCR
- **Анализ текста**:
    - `yake`: для извлечения ключевых слов из текста
    - ~~`gensim`: для автоматического реферирования~~ (отключено)

## Модели данных
```python
# Основные модели
PDFDocument  # title, authors, doc_type, theme, keywords, file, extracted_text, user
Note        # text, page_number, created_at, user, document  
PDFPageText # page_number, text_content, document

# Новые поля и связи
PDFDocument.last_accessed  # auto_now для отслеживания активности
Note.page_number          # привязка к конкретной странице PDF
```

## AJAX-архитектура
- **Endpoints**: 
  - `/save-note/` - создание заметок
  - `/delete-note/<id>/` - удаление заметок  
  - `/detailed/<id>` - обновление метаданных PDF
- **Headers**: `X-Requested-With: XMLHttpRequest` для идентификации AJAX
- **CSRF**: Автоматическое включение токенов в заголовки
- **Responses**: Стандартизированный JSON `{success: boolean, data/error}`

## Другие зависимости
- **Переменные окружения**: `python-dotenv` для управления настройками через `.env` файл
- **Работа с изображениями**: `Pillow` для обработки изображений (например, миниатюр)

## Системные зависимости
- **Tesseract OCR**: Необходим для работы `pytesseract`
- **Poppler**: Необходим для работы `pdf2image`

## Git workflow
- **Основная ветка**: `main`
- **Рабочая ветка**: `Artem_branch`
- **Коммиты**: Описательные сообщения на русском языке
- **Push**: Регулярная отправка в удаленный репозиторий 