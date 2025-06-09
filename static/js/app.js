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

// Проверка доступности PDF.js
function checkPdfJsAvailability() {
    if (typeof pdfjsLib === 'undefined') {
        console.error('PDF.js is not loaded! PDF preview will not work.');
        return false;
    }
    console.log('PDF.js is available, version:', pdfjsLib.version || 'unknown');
    return true;
}

// Fallback для отображения PDF без предпросмотра
function showPdfFallback(url) {
    console.log("Using PDF fallback for URL:", url);
    
    const viewer = document.getElementById('pdf-viewer');
    if (viewer) {
        viewer.innerHTML = `
            <div class="pdf-placeholder" style="display: flex;">
                <i>📄</i>
                <h3>PDF загружен успешно</h3>
                <p>Предпросмотр недоступен. <a href="${url}" target="_blank">Открыть PDF в новой вкладке</a></p>
            </div>
        `;
    }
    
    // Показываем кнопки управления с ограниченным функционалом
    const controls = document.getElementById('pdf-controls');
    if (controls) {
        controls.style.display = 'flex';
        const pageNum = document.getElementById('page-num');
        if (pageNum) pageNum.textContent = 'PDF готов к просмотру';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing application...");
    
    // Диагностика PDF.js
    setTimeout(() => {
        console.log("=== PDF.js Diagnostic ===");
        console.log("typeof pdfjsLib:", typeof pdfjsLib);
        if (typeof pdfjsLib !== 'undefined') {
            console.log("PDF.js version:", pdfjsLib.version);
            console.log("Worker src:", pdfjsLib.GlobalWorkerOptions.workerSrc);
        } else {
            console.error("❌ PDF.js is not loaded!");
        }
        console.log("========================");
    }, 1000); // Проверяем через секунду после загрузки
    
    initDragAndDrop();
    initPdfNavigation();
    initNoteForm();
    initDetailPagePdf();
    initSearch();
});

// Делаем функцию доступной глобально для использования в других шаблонах
window.initDetailPagePdf = initDetailPagePdf;

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

        if (data.success) {
            currentDocumentId = data.document_id;
            const openButton = document.getElementById('open-pdf');
            if (openButton) {
                const detailUrl = `${window.location.origin}/detailed/${data.document_id}`;
                openButton.href = detailUrl;
                openButton.style.display = 'block';


                            // Небольшая задержка для полной загрузки DOM
            setTimeout(() => {
                // Проверяем, есть ли на странице элементы для предпросмотра
                const viewer = document.getElementById('pdf-viewer');
                const controls = document.getElementById('pdf-controls');
                const placeholder = document.getElementById('pdf-placeholder');
                

                
                if (viewer && controls && placeholder) {
                // Сбрасываем состояние перед новой загрузкой
                controls.style.display = 'none';
                placeholder.style.display = 'flex';
                viewer.innerHTML = '';
                
                // Загружаем PDF
                loadPdf(data.file_url).catch(error => {
                    console.error("Error loading PDF for preview:", error);
                    console.log("PDF URL that failed:", data.file_url);
                    
                    // Пробуем использовать простой iframe viewer
                    try {
                        if (typeof window.showSimplePdfViewer === 'function') {
                            window.showSimplePdfViewer(data.file_url);
                            console.log("Simple PDF viewer loaded successfully");
                        } else {
                            showPdfFallback(data.file_url);
                            console.log("PDF fallback displayed successfully");
                        }
                    } catch (fallbackError) {
                        console.error("Fallback also failed:", fallbackError);
                        // Сбрасываем состояние при полном провале
                        controls.style.display = 'none';
                        placeholder.style.display = 'flex';
                        viewer.innerHTML = '';
                        // Показываем пользователю, что предпросмотр недоступен, но файл загружен
                        alert('Файл успешно загружен! Предпросмотр недоступен, но вы можете открыть документ в редакторе.');
                    }
                });
                } else {
                    console.log("No PDF viewer elements on this page. Skipping preview.");
                }
            }, 100); // Задержка 100мс
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

    
    // Проверяем, есть ли нужные элементы на странице
    const viewer = document.getElementById('pdf-viewer');
    const controls = document.getElementById('pdf-controls');
    const placeholder = document.getElementById('pdf-placeholder');
    

    
    if (!viewer || !controls || !placeholder) {
        console.log("PDF viewer elements not found on this page. Skipping PDF.js loading.");
        throw new Error('PDF viewer elements not available on this page');
    }
    
    // Проверяем доступность PDF.js
    if (!checkPdfJsAvailability()) {
        throw new Error('PDF.js is not available');
    }
    
    try {
        const pdf = await pdfjsLib.getDocument(url).promise;
        
        currentPdf = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;

        // Показываем контролы и скрываем placeholder
            controls.style.display = 'flex';
            placeholder.style.display = 'none';
            await renderPage(1);
        
    } catch (error) {
        console.error("Detailed error loading PDF:", error);
        console.error("Error type:", error.name);
        console.error("Error message:", error.message);
        if (error.stack) console.error("Error stack:", error.stack);
        
        // Восстанавливаем placeholder если произошла ошибка
        if (controls) controls.style.display = 'none';
        if (placeholder) placeholder.style.display = 'flex';
        
        throw error; // Пробрасываем ошибку дальше для обработки
    }
}

// Рендеринг страницы PDF
function renderPage(pageNum) {
    if (!currentPdf) return;

    currentPdf.getPage(pageNum).then(function(page) {
        const viewer = document.getElementById('pdf-viewer');
        if (!viewer) return;
        
        // Очищаем содержимое viewer'а
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

        const pageNumElement = document.getElementById('page-num');
        if (pageNumElement) {
            pageNumElement.textContent = `Страница ${pageNum} из ${totalPages}`;
        }
    }).catch(error => {
        console.error('Error rendering page:', error);
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
        // Полная очистка состояния
        currentPdf = null;
        currentPage = 1;
        totalPages = 1;
        currentDocumentId = null;
        
        // Очистка интерфейса
        const viewer = document.getElementById('pdf-viewer');
        if (viewer) viewer.innerHTML = '';
        
        const controls = document.getElementById('pdf-controls');
        if (controls) controls.style.display = 'none';
        
        const placeholder = document.getElementById('pdf-placeholder');
        if (placeholder) placeholder.style.display = 'flex';
        
        // Скрываем кнопку "Открыть в редакторе"
        const openButton = document.getElementById('open-pdf');
        if (openButton) openButton.style.display = 'none';
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
    initDetailNoteDelete();
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
    noteElement.setAttribute('data-note-id', note.id);
    noteElement.innerHTML = `
        <div class="note-content">
            <p class="note-text">${note.text}</p>
            <span class="note-meta">Стр. ${note.page_number} - ${note.created_at}</span>
        </div>
        <button class="note-delete-btn" data-note-id="${note.id}" title="Удалить заметку">✕</button>
    `;

    // Добавляем в начало списка
    notesContainer.insertBefore(noteElement, notesContainer.firstChild);
    
    // Добавляем обработчик удаления для новой заметки
    const deleteBtn = noteElement.querySelector('.note-delete-btn');
    deleteBtn.addEventListener('click', function() {
        deleteDetailNote(note.id, noteElement);
    });
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

// Инициализация кнопок удаления заметок
function initDetailNoteDelete() {
    const deleteButtons = document.querySelectorAll('.note-delete-btn');
    console.log('Found delete buttons:', deleteButtons.length);
    
    deleteButtons.forEach(button => {
        button.addEventListener('click', function() {
            const noteId = this.getAttribute('data-note-id');
            const noteElement = this.closest('.note-item');
            
            console.log('Delete button clicked, noteId:', noteId, 'element:', noteElement);
            
            if (!noteId) {
                console.error('No note ID found on button:', this);
                alert('Ошибка: не удалось найти ID заметки');
                return;
            }
            
            deleteDetailNote(noteId, noteElement);
        });
    });
}

// Удаление заметки через AJAX
function deleteDetailNote(noteId, noteElement) {
    console.log('Attempting to delete note with ID:', noteId);
    
    if (!noteId || noteId === 'undefined') {
        console.error('Invalid note ID:', noteId);
        alert('Ошибка: не удалось получить ID заметки');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить эту заметку?')) {
        return;
    }

    const formData = new FormData();
    
    fetch(`${window.location.origin}/delete-note/${noteId}/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value,
            'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'same-origin'
    })
    .then(response => {
        console.log('Delete response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Server response:', text);
                throw new Error(`Ошибка удаления заметки (${response.status})`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Плавно скрываем заметку
            noteElement.style.transition = 'opacity 0.3s ease';
            noteElement.style.opacity = '0';
            
            setTimeout(() => {
                noteElement.remove();
                
                // Проверяем, остались ли заметки
                const notesContainer = document.querySelector('.notes-list');
                const remainingNotes = notesContainer.querySelectorAll('.note-item');
                
                if (remainingNotes.length === 0) {
                    const noNotesMessage = document.createElement('p');
                    noNotesMessage.textContent = 'К этому документу пока нет заметок.';
                    notesContainer.appendChild(noNotesMessage);
                }
            }, 300);
            
            showSuccessMessage('Заметка успешно удалена!');
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ошибка при удалении заметки: ' + error.message);
    });
}

// Инициализация поиска
function initSearch() {
    const searchInput = document.querySelector('.search-bar input');
    
    if (!searchInput) return;
    
    let searchTimeout;
    
    // Поиск при вводе (с задержкой)
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        if (query.length === 0) {
            showAllDocuments();
            return;
        }
        
        searchTimeout = setTimeout(() => {
            filterDocuments(query);
        }, 300); // Задержка 300мс
    });
    
    // Поиск по Enter
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = this.value.trim();
            filterDocuments(query);
        }
    });
}

// Фильтрация документов на странице
function filterDocuments(query) {
    const documentCards = document.querySelectorAll('.pdf-card, .document-card');
    const noResultsElement = document.querySelector('.no-search-results');
    let visibleCount = 0;
    
    if (query.length === 0) {
        showAllDocuments();
        return;
    }
    
    const searchQuery = query.toLowerCase();
    
    documentCards.forEach(card => {
        // Используем data-атрибуты если есть, иначе берем из текста
        const title = card.dataset.searchTitle || card.querySelector('h3, h4')?.textContent?.toLowerCase() || '';
        const authors = card.dataset.searchAuthors || card.querySelector('.pdf-meta span, .document-authors')?.textContent?.toLowerCase() || '';
        const theme = card.dataset.searchTheme || card.querySelector('.document-theme')?.textContent?.toLowerCase() || '';
        const keywords = card.dataset.searchKeywords || card.querySelector('.document-keywords')?.textContent?.toLowerCase() || '';
        
        const isMatch = title.includes(searchQuery) || 
                       authors.includes(searchQuery) || 
                       theme.includes(searchQuery) || 
                       keywords.includes(searchQuery);
        
        if (isMatch) {
            card.style.display = '';
            card.style.opacity = '1';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Показать/скрыть сообщение "Ничего не найдено"
    showNoResultsMessage(visibleCount === 0, query);
}

// Показать все документы
function showAllDocuments() {
    const documentCards = document.querySelectorAll('.pdf-card, .document-card');
    const noResultsElement = document.querySelector('.no-search-results');
    
    documentCards.forEach(card => {
        card.style.display = '';
    });
    
    // Скрыть сообщение "Ничего не найдено"
    if (noResultsElement) {
        noResultsElement.remove();
    }
}

// Показать сообщение "Ничего не найдено"
function showNoResultsMessage(show, query) {
    let noResultsElement = document.querySelector('.no-search-results');
    
    if (show && !noResultsElement) {
        const container = document.querySelector('.catalog-container, .account-files');
        if (container) {
            noResultsElement = document.createElement('div');
            noResultsElement.className = 'no-search-results';
            noResultsElement.innerHTML = `
                <div class="empty-state">
                    <i>🔍</i>
                    <h3>Ничего не найдено</h3>
                    <p>По запросу "${escapeHtml(query)}" документы не найдены</p>
                </div>
            `;
            container.appendChild(noResultsElement);
        }
    } else if (!show && noResultsElement) {
        noResultsElement.remove();
    }
}

// Экранирование HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
