# Technical Context: PDFocus

## Технологический стек

- **Бэкенд**: Django (Python)
- **База данных**: PostgreSQL
- **Фронтенд**: HTML, CSS, JavaScript (без фреймворков)
- **Обработка PDF и изображений**:
  - `pytesseract`: Для оптического распознавания символов (OCR).
  - `pdf2image`: Для конвертации страниц PDF в изображения.
  - `Pillow`: Для работы с изображениями.
- **Управление зависимостями**: `pip` и `requirements.txt`
- **Виртуальное окружение**: `venv`
- **Система контроля версий**: Git
- **Веб-сервер (для разработки)**: Django development server 