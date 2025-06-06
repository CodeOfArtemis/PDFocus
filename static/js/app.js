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

document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
    initPdfNavigation();
    initNoteForm();
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
            formData.append('title', files[i].name)
            hasPdf = true;
        }
    }

    if (!hasPdf) {
        alert('Пожалуйста, загрузите PDF-файл');
        return;
    }

    // Отправка на сервер
    fetch(`${window.location.origin}/upload/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.getElementsByName('csrfmiddlewaretoken').item(0).value,
        }
    }).then(response => {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Ошибка загрузки файла');
    }).then(data => {
        if (data.success) {
            loadPdf(data.file_url);
        }
    }).catch(error => {
        console.error('Error:', error);
        alert('Ошибка при загрузке файла');
    });
}

// Загрузка PDF для просмотра
function loadPdf(url) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://mozilla.github.io/pdf.js/build/pdf.worker.mjs';
    pdfjsLib.getDocument(url).promise.then(function(pdf) {
        currentPdf = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;

        document.getElementById('pdf-controls').style.display = 'flex';
        document.getElementById('pdf-placeholder').style.display = 'none';
        renderPage(currentPage);
    });
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

    fetch(`${window.location.origin}/note/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.getElementsByName('csrfmiddlewaretoken').item(0).value,
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
    const notesList = document.getElementById('notes-list');
    const noteElement = document.createElement('div');
    noteElement.className = 'note-item';
    noteElement.innerHTML = `
        <div class="note-text">${note.text}</div>
        <div class="note-meta">
            <span>Страница ${note.page_number}</span>
            <span>${new Date(note.created_at).toLocaleString()}</span>
        </div>
    `;
    notesList.prepend(noteElement);
}
