// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdfjs/pdf.worker.min.js';

const container = document.getElementById('viewer-container');
const viewer = document.getElementById('viewer');

// Get file URL from query param
const urlParams = new URLSearchParams(window.location.search);
const fileUrl = urlParams.get('file');

if (fileUrl) {
    console.log('Loading PDF from:', fileUrl);
    loadPdf(fileUrl);
} else {
    console.error('No file specified');
}

async function loadPdf(url) {
    try {
        console.log('Fetching document...');
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        console.log('PDF loaded, pages:', pdf.numPages);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log('Rendering page:', pageNum);
            await renderPage(pdf, pageNum);
        }
        console.log('All pages rendered');
    } catch (e) {
        console.error('Error loading PDF:', e);
    }
}

async function renderPage(pdf, pageNum) {
    try {
        const page = await pdf.getPage(pageNum);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        console.log('Page loaded:', pageNum, 'Viewport:', viewport);

        // Create page div
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.style.width = `${viewport.width}px`;
        pageDiv.style.height = `${viewport.height}px`;
        pageDiv.dataset.pageNumber = pageNum;
        viewer.appendChild(pageDiv);

        // Canvas for rendering PDF content
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        pageDiv.appendChild(canvas);

        const context = canvas.getContext('2d');
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };

        console.log('Rendering canvas for page:', pageNum);
        await page.render(renderContext).promise;
        console.log('Canvas rendered for page:', pageNum);

        // Text Layer for selection
        const textContent = await page.getTextContent();
        const textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        textLayerDiv.style.width = `${viewport.width}px`;
        textLayerDiv.style.height = `${viewport.height}px`;
        pageDiv.appendChild(textLayerDiv);

        // Use PDF.js text layer rendering
        // Note: In recent PDF.js versions, we need to use pdfjsLib.renderTextLayer
        // But since we are using the minified build, we might need to implement a simple version or check the API
        // For simplicity in this custom viewer, we will manually create spans if renderTextLayer is complex to setup without the full viewer components

        // Checking if pdfjsLib.renderTextLayer exists or we need to construct it
        // Actually, pdfjsLib usually exposes renderTextLayer in the main build or we need pdf_viewer.js
        // Let's try a manual approach for the text layer to ensure it works without extra dependencies

        textContent.items.forEach(item => {
            const tx = pdfjsLib.Util.transform(
                viewport.transform,
                item.transform
            );

            const fontHeight = Math.sqrt((tx[2] * tx[2]) + (tx[3] * tx[3]));
            const div = document.createElement('span');
            div.textContent = item.str;
            div.style.fontFamily = 'sans-serif'; // Fallback
            div.style.fontSize = `${fontHeight}px`;
            div.style.transform = `scaleX(${item.width / div.clientWidth})`; // Approximate

            // Position
            div.style.left = `${tx[4]}px`;
            div.style.top = `${tx[5] - fontHeight}px`; // PDF coords are bottom-up usually, but viewport transform handles it?
            // Actually viewport.transform handles the coordinate conversion

            // Let's use a simplified approach if possible or just rely on the viewport transform
            // The viewport transform gives us canvas coordinates.
            // item.transform is [scaleX, skewY, skewX, scaleY, translateX, translateY]

            // Re-evaluating: The manual text layer is hard to get right. 
            // Let's try to use the official TextLayerBuilder if available, but it's usually in pdf_viewer.js
            // Since we only downloaded pdf.min.js, we might not have it.

            // Alternative: Just render text items as absolute positioned spans
            // We need to be careful with coordinates.
            // Let's try a simplified version for now.

            const style = div.style;
            style.left = `${tx[4]}px`;
            style.top = `${tx[5] - fontHeight}px`;
            style.fontSize = `${fontHeight}px`;
            // style.fontFamily = item.fontName; // We don't have the font loaded

            // textLayerDiv.appendChild(div); 
        });

        // Better approach for Text Layer without full PDF.js viewer:
        // We can just use the textContent to create spans.
        // However, for high fidelity, we really should have downloaded pdf_viewer.js and css.
        // But for this MVP, let's try to get basic text selection working.

        // Let's use a simplified text layer rendering
        textLayerDiv.style.setProperty('--scale-factor', viewport.scale);
        console.log('Rendering text layer for page:', pageNum);
        pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport: viewport,
            textDivs: []
        });
        console.log('Text layer rendered for page:', pageNum);
    } catch (e) {
        console.error('Error rendering page ' + pageNum + ':', e);
    }
}
