let currentPDF = null;
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
    const pdfUpload = document.getElementById('pdf-upload');
    if(pdfUpload) {
        pdfUpload.addEventListener('change', (e) => {
            if(e.target.files[0]) {
                loadPDF(e.target.files[0]);
            }
        });
    }

    document.getElementById('prev-page')?.addEventListener('click', () => {
        if(currentPage > 1) {
            currentPage--;
            renderPage(currentPage);
        }
    });

    document.getElementById('next-page')?.addEventListener('click', () => {
        if(currentPage < totalPages) {
            currentPage++;
            renderPage(currentPage);
        }
    });
});

async function loadPDF(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({data: pdfData}).promise;
        currentPDF = pdf;
        totalPages = pdf.numPages;
        currentPage = 1;
        document.getElementById('pdf-controls').style.display = 'flex';
        document.getElementById('pdf-placeholder').style.display = 'none';
        renderPage(1);
    };
    reader.readAsArrayBuffer(file);
}

async function renderPage(pageNum) {
    const page = await currentPDF.getPage(pageNum);
    const viewport = page.getViewport({scale: 1.5});
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    document.getElementById('pdf-viewer').innerHTML = '';
    document.getElementById('pdf-viewer').appendChild(canvas);

    await page.render({
        canvasContext: context,
        viewport: viewport
    }).promise;

    document.getElementById('page-num').textContent =
        `Страница ${pageNum} из ${totalPages}`;
}