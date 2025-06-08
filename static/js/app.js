import * as pdfjsLib from 'https://mozilla.github.io/pdf.js/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
        });
    }
});

// Текущий PDF
let currentPdf = null;
let currentPage = 1;
let totalPages = 1;
let currentDocumentId = null;

document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
    initPdfNavigation();
    initNoteForm();
    initDetailPagePdf();
});

// Инициализация drag-and-drop
function initDragAndDrop() {
    const uploadArea = document.getElementById('upload-area');
    const pdfUpload = document.getElementById('pdf-upload');

    if (uploadArea) {
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    if (pdfUpload) {
        pdfUpload.addEventListener('change', function() {
            if (pdfUpload.files.length) {
                handleFiles(pdfUpload.files);
            }
        });
    }
}

// Обработка загруженных файлов
function handleFiles(files) {
    const formData = new FormData();
    let hasPdf = false;

    for (let i = 0; i < files.length; i++) {
        if (files[i].type === 'application/pdf') {
            formData.append('file', files[i]);
            formData.append('title', files[i].name);
            formData.append('doc_type', 'other');
            formData.append('authors', '');
            formData.append('theme', '');
            formData.append('keywords', '');
            hasPdf = true;
        }
    }

    if (!hasPdf) {
        alert('Пожалуйста, загрузите PDF-файл');
        return;
    }

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Отправка на сервер
    fetch(`${window.location.origin}/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(data => {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            });
        }
            return response.json();
    })
    .then(data => {
        console.log("Received data:", data);
        if (data.success) {
            currentDocumentId = data.document_id;
            const openButton = document.getElementById('open-pdf');
            if (openButton) {
                const detailUrl = `${window.location.origin}/detailed/${data.document_id}`;
                openButton.href = detailUrl;
                openButton.style.display = 'block';
                console.log("Open button updated:", openButton.href);

                // Загружаем PDF только после успешного обновления кнопки
                loadPdf(data.file_url).catch(error => {
                    console.error("Error loading PDF:", error);
                    // Даже если PDF не загрузился, кнопка "Открыть" все равно будет работать
                });
            } else {
                console.error("Open button not found");
            }
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ошибка при загрузке файла: ' + error.message);
    });
}

// Загрузка PDF для просмотра
async function loadPdf(url) {
    console.log("Loading PDF from URL:", url);
    
    try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        currentPdf = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;

        const controls = document.getElementById('pdf-controls');
        const placeholder = document.getElementById('pdf-placeholder');
        
        if (controls && placeholder) {
            controls.style.display = 'flex';
            placeholder.style.display = 'none';
            await renderPage(1);
        } else {
            throw new Error("Controls or placeholder elements not found");
        }
    } catch (error) {
        console.error("Error loading PDF:", error);
        throw error; // Пробрасываем ошибку дальше для обработки
    }
}

// Рендеринг страницы PDF
function renderPage(pageNum) {
    if (!currentPdf) return;

    currentPdf.getPage(pageNum).then(function(page) {
        const viewer = document.getElementById('pdf-viewer');
        viewer.innerHTML = '';

        const scale = 1.5;
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.style.position = 'relative';
        canvas.style.zIndex = '1';
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        viewer.appendChild(canvas);

        page.render({
            canvasContext: context,
            viewport: viewport
        });

        document.getElementById('page-num').textContent =
            `Страница ${pageNum} из ${totalPages}`;
    });
}

// Навигация по страницам PDF
function initPdfNavigation() {
    document.getElementById('prev-page')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    });

    document.getElementById('next-page')?.addEventListener('click', function() {
        if (currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
        }
    });

    document.getElementById('close-pdf')?.addEventListener('click', function() {
        currentPdf = null;
        document.getElementById('pdf-viewer').innerHTML = '';
        document.getElementById('pdf-controls').style.display = 'none';
        document.getElementById('pdf-placeholder').style.display = 'flex';
    });
}

// Работа с заметками
function initNoteForm() {
    const noteForm = document.getElementById('note-form');
    if (!noteForm) return;

    document.getElementById('add-note-btn')?.addEventListener('click', function() {
        noteForm.style.display = 'block';
        document.getElementById('note-text').focus();
    });

    document.getElementById('cancel-note')?.addEventListener('click', function() {
        noteForm.style.display = 'none';
        document.getElementById('note-text').value = '';
    });

    document.getElementById('save-note')?.addEventListener('click', saveNote);
}

function saveNote() {
    const noteText = document.getElementById('note-text').value.trim();
    if (!noteText) return;

    const formData = new FormData();
    formData.append('text', noteText);
    formData.append('document_id', document.getElementById('pdf-id').value);
    formData.append('page_number', currentPage);

    fetch(`${window.location.origin}/save-note/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.getElementsByName('csrfmiddlewaretoken').item(0).value,
            'X-Requested-With': 'XMLHttpRequest',
        }
    }).then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Ошибка сохранения заметки');
    }).then(data => {
        if (data.success) {
            addNoteToUI(data.note);
            document.getElementById('note-form').style.display = 'none';
            document.getElementById('note-text').value = '';
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('Ошибка при сохранении заметки');
    });
}

function addNoteToUI(note) {
    const notesContainer = document.querySelector('.notes-list');
    if (!notesContainer) return;

    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.innerHTML = `
        <div class="note-text">${note.text}</div>
        <div class="note-meta">Стр. ${note.page_number} - ${note.created_at}</div>
    `;

    const firstElement = notesContainer.firstChild;
    if (firstElement && firstElement.tagName !== 'P') {
        notesContainer.insertBefore(noteElement, firstElement);
    } else {
        notesContainer.appendChild(noteElement);
    }
}

// Инициализация PDF на странице детального просмотра
function initDetailPagePdf() {
    // Проверяем, что мы на странице детального просмотра
    const detailViewer = document.getElementById('pdf-viewer-detail');
    if (!detailViewer) return;

    // Получаем URL PDF из скрытого поля или из данных страницы
    const pdfIdElement = document.querySelector('input[name="document_id"]');
    if (!pdfIdElement) return;

    const documentId = pdfIdElement.value;
    // Здесь нужно получить URL файла, возможно через AJAX или встроить в шаблон
    loadDetailPdf(documentId);
    initDetailPdfNavigation();
    initDetailNoteForm();
    initDetailMetaForm();
}

// Загрузка PDF для детального просмотра
async function loadDetailPdf(documentId) {
    const pdfUrlElement = document.getElementById('pdf-file-url');
    if (!pdfUrlElement) {
        console.error('PDF URL not found');
        return;
    }
    
    const pdfUrl = pdfUrlElement.value;
    console.log("Loading detail PDF from URL:", pdfUrl);
    
    try {
        const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
        window.currentDetailPdf = pdf;
        window.currentDetailPage = 1;
        window.totalDetailPages = pdf.numPages;

        const placeholder = document.getElementById('pdf-placeholder-detail');
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        await renderDetailPage(1);
        updateDetailPageInfo();
        updateNotePageNumber();
    } catch (error) {
        console.error("Error loading detail PDF:", error);
        const placeholder = document.getElementById('pdf-placeholder-detail');
        if (placeholder) {
            placeholder.innerHTML = '<i>❌</i><p>Ошибка загрузки PDF</p>';
        }
    }
}

// Рендеринг страницы для детального просмотра
async function renderDetailPage(pageNum) {
    if (!window.currentDetailPdf) return;

    try {
        const page = await window.currentDetailPdf.getPage(pageNum);
        const viewer = document.getElementById('pdf-viewer-detail');
        viewer.innerHTML = '';

        const scale = 1.2;
        const viewport = page.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';

        viewer.appendChild(canvas);

        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        window.currentDetailPage = pageNum;
        updateDetailPageInfo();
        updatePageText(pageNum);
    } catch (error) {
        console.error("Error rendering detail page:", error);
    }
}

// Обновление текста текущей страницы
function updatePageText(pageNum) {
    const textArea = document.querySelector('.extracted-text-section textarea');
    if (!textArea) return;

    // Получаем текст для текущей страницы
    const pageText = window.pageTexts && window.pageTexts[pageNum] 
        ? window.pageTexts[pageNum] 
        : 'Текст для этой страницы не найден';

    textArea.value = pageText;
    
    // Обновляем заголовок секции с текстом
    const textSectionHeader = document.querySelector('.extracted-text-section h3');
    if (textSectionHeader) {
        textSectionHeader.textContent = `Текст страницы ${pageNum}:`;
    }
}

// Обновление информации о странице
function updateDetailPageInfo() {
    const pageNumElement = document.getElementById('page-num-detail');
    if (pageNumElement) {
        pageNumElement.textContent = `Страница ${window.currentDetailPage || 1} из ${window.totalDetailPages || 1}`;
    }
    
    // Обновляем скрытое поле формы заметок
    updateNotePageNumber();
}

// Синхронизация номера страницы в форме заметок
function updateNotePageNumber() {
    const pageNumberField = document.getElementById('current_page_number');
    if (pageNumberField && window.currentDetailPage) {
        pageNumberField.value = window.currentDetailPage;
    }
}

// Навигация для детального просмотра PDF
function initDetailPdfNavigation() {
    const prevButton = document.getElementById('prev-page-detail');
    const nextButton = document.getElementById('next-page-detail');
    
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (window.currentDetailPage > 1) {
                renderDetailPage(window.currentDetailPage - 1);
            }
        });
    }
    
    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (window.currentDetailPage < window.totalDetailPages) {
                renderDetailPage(window.currentDetailPage + 1);
            }
        });
    }
}

// Инициализация формы заметок на детальной странице
function initDetailNoteForm() {
    const noteForm = document.getElementById('note-form-detail');
    if (!noteForm) return;

    noteForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Предотвращаем стандартную отправку формы
        saveDetailNote();
    });
}

// Сохранение заметки на детальной странице через AJAX
function saveDetailNote() {
    const noteForm = document.getElementById('note-form-detail');
    const noteText = document.getElementById('id_note_text').value.trim();
    
    if (!noteText) {
        alert('Введите текст заметки');
        return;
    }

    const formData = new FormData(noteForm);

    fetch(`${window.location.origin}/save-note/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка сохранения заметки');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Добавляем заметку в список
            addDetailNoteToUI(data.note);
            // Очищаем форму  
            document.getElementById('id_note_text').value = '';
            // Показываем уведомление
            showSuccessMessage('Заметка успешно добавлена!');
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ошибка при сохранении заметки: ' + error.message);
    });
}

// Добавление заметки в список на детальной странице
function addDetailNoteToUI(note) {
    const notesContainer = document.querySelector('.notes-list');
    if (!notesContainer) return;

    // Убираем сообщение "пока нет заметок" если оно есть
    const noNotesMessage = notesContainer.querySelector('p');
    if (noNotesMessage && noNotesMessage.textContent.includes('пока нет заметок')) {
        noNotesMessage.remove();
    }

    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.innerHTML = `
        <p class="note-text">${note.text}</p>
        <span class="note-meta">Стр. ${note.page_number} - ${note.created_at}</span>
    `;

    // Добавляем в начало списка
    notesContainer.insertBefore(noteElement, notesContainer.firstChild);
}

// Показ уведомления об успехе
function showSuccessMessage(message) {
    // Создаем временное уведомление
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Убираем уведомление через 3 секунды
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Инициализация формы метаданных на детальной странице
function initDetailMetaForm() {
    const metaForm = document.getElementById('pdf-meta-form');
    if (!metaForm) return;

    metaForm.addEventListener('submit', function(e) {
        e.preventDefault(); // Предотвращаем стандартную отправку формы
        saveDetailMetadata();
    });
}

// Сохранение метаданных PDF через AJAX
function saveDetailMetadata() {
    const metaForm = document.getElementById('pdf-meta-form');
    if (!metaForm) return;

    const formData = new FormData(metaForm);

    fetch(window.location.href, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Ошибка сохранения метаданных');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showSuccessMessage('Изменения успешно сохранены!');
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ошибка при сохранении метаданных: ' + error.message);
    });
}
