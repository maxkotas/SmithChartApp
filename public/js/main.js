/**
 * Main Application Script
 * This file initializes the Smith Chart drawing application and connects UI elements
 */

// Define global smith chart image reference
let smithChartImage = null;

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the canvas
    const canvas = initializeCanvas();
    window.fabricCanvas = canvas; // Make canvas globally accessible
    
    // Initialize tools and chart
    const statusMessage = document.getElementById('status-message');
    const drawingTools = new DrawingTools(canvas, statusMessage);
    
    // Create empty SmithChart instance with no functionality
    const smithChart = {canvas: canvas}; 
    
    // Set up toolbar event listeners
    setupToolbarListeners(canvas, drawingTools, smithChart);
    
    // Set up style control event listeners
    setupStyleControls(drawingTools);
    
    // Load the Smith chart image ONCE
    loadSmithChartImage(canvas);
    
    // On resize, just reload the chart
    window.addEventListener('resize', () => {
        setTimeout(() => {
            loadSmithChartImage(canvas);
        }, 200);
    });
    
    // Set initial state
    drawingTools.updateStatus('Ready');
});

/**
 * Initialize the Fabric.js canvas
 * @returns {fabric.Canvas} - The initialized canvas
 */
function initializeCanvas() {
    const canvasEl = document.getElementById('smith-canvas');
    
    // Calculate dimensions accounting for the sidebar width
    const canvasWidth = window.innerWidth - 300; 
    const canvasHeight = window.innerHeight - 120; // Space for header and footer
    
    // Ensure dimensions are even numbers for perfect centering
    const adjustedWidth = canvasWidth - (canvasWidth % 2);
    const adjustedHeight = canvasHeight - (canvasHeight % 2);
    
    const canvas = new fabric.Canvas(canvasEl, {
        width: adjustedWidth,
        height: adjustedHeight,
        selection: true,
        preserveObjectStacking: true,
        backgroundColor: 'white'
    });
    
    return canvas;
}

/**
 * Load the Smith chart image and adjust canvas size to match available height
 * @param {fabric.Canvas} canvas - The Fabric.js canvas
 */
function loadSmithChartImage(canvas) {
    // First, remove ANY existing Smith chart images to prevent duplicates
    const allObjects = canvas.getObjects();
    const chartImages = allObjects.filter(obj => obj.type === 'image');
    chartImages.forEach(img => canvas.remove(img));
    
    // Now load a fresh one
    const imagePath = 'images/Smith_chart.png';
    
    fabric.Image.fromURL(imagePath, function(img) {
        // Get canvas dimensions
        const canvasWidth = canvas.getWidth();
        const canvasHeight = canvas.getHeight();
        
        // Calculate the scale to fit the chart properly
        // We'll use 90% of the available height to ensure it fits
        const scale = (canvasHeight * 0.9) / img.height;
        
        // Position in center
        img.set({
            left: canvasWidth / 2,
            top: canvasHeight / 2,
            originX: 'center',
            originY: 'center',
            scaleX: scale,
            scaleY: scale,
            selectable: false,
            evented: false,
            permanent: true
        });
        
        // Store as global reference
        smithChartImage = img;
        
        // Add the image to the canvas
        canvas.add(img);
        
        // Send to back so drawings appear on top
        img.sendToBack();
        
        canvas.renderAll();
    });
}

/**
 * Set up event listeners for toolbar buttons
 */
function setupToolbarListeners(canvas, drawingTools, smithChart) {
    // Selection tool
    document.getElementById('select').addEventListener('click', () => {
        setActiveButton('select');
        drawingTools.setMode('Select');
    });
    
    // Text tool
    document.getElementById('add-text').addEventListener('click', () => {
        setActiveButton('add-text');
        drawingTools.setMode('Text');
    });
    
    // Drawing tools
    document.getElementById('draw-circle').addEventListener('click', () => {
        setActiveButton('draw-circle');
        drawingTools.setMode('Circle');
    });
    
    document.getElementById('draw-arc').addEventListener('click', () => {
        setActiveButton('draw-arc');
        drawingTools.setMode('Arc');
    });
    
    document.getElementById('draw-line').addEventListener('click', () => {
        setActiveButton('draw-line');
        drawingTools.setMode('Line');
    });
    
    // Eraser tool
    document.getElementById('eraser').addEventListener('click', () => {
        setActiveButton('eraser');
        drawingTools.setMode('Eraser');
    });
    
    // Clear and Save
    document.getElementById('clear-all').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
            // Get all objects EXCEPT our Smith chart image
            const allObjects = canvas.getObjects();
            const objectsToRemove = allObjects.filter(obj => obj !== smithChartImage);
            
            // Remove everything except the Smith chart
            objectsToRemove.forEach(obj => canvas.remove(obj));
            
            // Reset drawing tools state
            drawingTools.resetState();
            
            // Make sure our chart is at the back
            if (smithChartImage && canvas.contains(smithChartImage)) {
                smithChartImage.sendToBack();
            }
            
            canvas.renderAll();
            setActiveButton(null);
            console.log('Canvas cleared, Smith chart preserved');
        }
    });
    
    // Save buttons
    document.getElementById('save-png').addEventListener('click', () => {
        saveAsPNG(canvas);
    });
    
    document.getElementById('save-pdf').addEventListener('click', () => {
        saveAsPDF(canvas);
    });
}

/**
 * Set up event listeners for style controls
 */
function setupStyleControls(drawingTools) {
    // Stroke width
    document.getElementById('stroke-width').addEventListener('input', (e) => {
        const width = parseInt(e.target.value);
        drawingTools.updateSettings({ strokeWidth: width });
    });
    
    // Stroke color
    document.getElementById('stroke-color').addEventListener('input', (e) => {
        const color = e.target.value;
        drawingTools.updateSettings({ strokeColor: color });
    });
    
    // Line style
    document.getElementById('line-style').addEventListener('change', (e) => {
        const style = e.target.value;
        drawingTools.updateSettings({ lineStyle: style });
    });
}

/**
 * Set the active button in the toolbar
 * @param {string} buttonId - The ID of the button to set as active
 */
function setActiveButton(buttonId) {
    // Remove 'active' class from all buttons
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Add 'active' class to the selected button
    if (buttonId) {
        const activeButton = document.getElementById(buttonId);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
}

/**
 * Save the canvas as a PNG image
 */
function saveAsPNG(canvas) {
    // Use Fabric's built-in toDataURL to capture the entire canvas with all objects
    const dataURL = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2, // Higher resolution
        backgroundColor: 'white' // Ensure white background
    });
    
    // Create a download link
    const link = document.createElement('a');
    link.download = 'smith-chart-drawing.png';
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Smith chart saved as PNG');
}

/**
 * Save the canvas as a PDF
 */
function saveAsPDF(canvas) {
    try {
        // Get the entire canvas data with white background
        const dataURL = canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 1.5, // Reasonable quality for PDF
            backgroundColor: 'white'
        });
        
        // Create PDF with proper dimensions
        const canvasAspectRatio = canvas.width / canvas.height;
        
        // Create PDF with appropriate orientation
        const pdf = new jspdf.jsPDF({
            orientation: canvasAspectRatio > 1 ? 'landscape' : 'portrait',
            unit: 'mm'
        });
        
        // Get PDF dimensions
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Calculate image dimensions to maintain aspect ratio
        let imgWidth = pdfWidth;
        let imgHeight = imgWidth / canvasAspectRatio;
        
        // If image height exceeds page height, scale down
        if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = imgHeight * canvasAspectRatio;
        }
        
        // Center image on page
        const xOffset = (pdfWidth - imgWidth) / 2;
        const yOffset = (pdfHeight - imgHeight) / 2;
        
        // Add the image to the PDF
        pdf.addImage(dataURL, 'PNG', xOffset, yOffset, imgWidth, imgHeight);
        
        // Save the PDF
        pdf.save('smith-chart-drawing.pdf');
        
        console.log('Smith chart saved as PDF');
    } catch (error) {
        console.error('Error creating PDF:', error);
        alert('Could not create PDF. Please try again or save as image instead.');
    }
}