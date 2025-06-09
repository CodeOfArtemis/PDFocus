// Простой PDF viewer без PDF.js
function showSimplePdfViewer(url) {
    console.log("Using simple PDF viewer for URL:", url);
    
    const viewer = document.getElementById('pdf-viewer');
    const controls = document.getElementById('pdf-controls');
    const placeholder = document.getElementById('pdf-placeholder');
    
    // Проверяем наличие всех необходимых элементов
    if (!viewer || !controls || !placeholder) {
        console.log("PDF viewer elements not found on this page. Cannot show simple viewer.");
        throw new Error('PDF viewer elements not available on this page');
    }
    
    // Создаем iframe для отображения PDF
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.width = '100%';
    iframe.style.height = '600px';
    iframe.style.border = '1px solid #ddd';
    iframe.style.borderRadius = '8px';
    
    // Очищаем и добавляем iframe
    viewer.innerHTML = '';
    viewer.appendChild(iframe);
    
    // Показываем контролы (состояние уже сброшено в app.js)
    controls.style.display = 'flex';
    placeholder.style.display = 'none';
    
    // Обновляем информацию о странице
    const pageNum = document.getElementById('page-num');
    if (pageNum) {
        pageNum.textContent = 'PDF отображается в браузере';
    }
    
    // Скрываем кнопки навигации по страницам (не работают с iframe)
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    
    console.log("Simple PDF viewer loaded successfully");
}

// Экспортируем функцию для использования в основном app.js
window.showSimplePdfViewer = showSimplePdfViewer; 