/**
 * Smith Chart Generator
 * This file contains functions to generate and manipulate a Smith chart on the canvas
 */

class SmithChart {
    constructor(canvas) {
        this.canvas = canvas;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
        this.chartObjects = [];
    }

    /**
     * Draw a Smith chart from an image file
     * @param {number} centerX - x-coordinate of the center
     * @param {number} centerY - y-coordinate of the center
     * @param {number} radius - radius of the Smith chart
     */
    drawSmithChartFromImage(centerX, centerY, radius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
        
        // Load Smith chart image
        fabric.Image.fromURL('images/Smith_chart.png', (img) => {
            const canvasHeight = this.canvas.getHeight();
            
            // Set scale to fill the canvas height (leaving some margin)
            const heightScaleFactor = (canvasHeight * 0.9) / img.height;
            
            // Set image properties with perfect center alignment
            img.set({
                left: centerX,
                top: centerY,
                originX: 'center',
                originY: 'center',
                scaleX: heightScaleFactor,
                scaleY: heightScaleFactor,
                selectable: false,
                evented: false,
                permanent: true,  // Mark as permanent so it won't be cleared
                objectCaching: false  // Disable caching for better rendering
            });
            
            // Clear any existing chart objects
            this.clearChartObjects();
            
            // Add the image to the canvas
            this.canvas.add(img);
            
            // Store reference to the chart image
            this.chartImage = img;
            
            // Send to back (in case there are other objects on the canvas)
            this.canvas.sendToBack(img);
            
            // Render the canvas to see the changes
            this.canvas.renderAll();
        });
        
        return true;
    }

    /**
     * Draw a basic Smith chart on the canvas
     * @param {number} centerX - x-coordinate of the center
     * @param {number} centerY - y-coordinate of the center
     * @param {number} radius - radius of the Smith chart
     */
    drawSmithChart(centerX, centerY, radius) {
        // Try to use the image method first
        if (this.drawSmithChartFromImage(centerX, centerY, radius)) {
            return;
        }
        
        // Otherwise, fall back to the programmatic method
        this.drawProgrammaticSmithChart(centerX, centerY, radius);
    }

    /**
     * Draw a programmatically generated Smith chart
     * @param {number} centerX - x-coordinate of the center
     * @param {number} centerY - y-coordinate of the center
     * @param {number} radius - radius of the Smith chart
     */
    drawProgrammaticSmithChart(centerX, centerY, radius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;

        // Clear any existing chart objects
        this.clearChartObjects();

        // Main circle (outline of the Smith chart)
        const mainCircle = new fabric.Circle({
            left: centerX - radius,
            top: centerY - radius,
            radius: radius,
            fill: 'transparent',
            stroke: '#000',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(mainCircle);
        this.chartObjects.push(mainCircle);

        // Horizontal axis
        const horizontalAxis = new fabric.Line(
            [centerX - radius, centerY, centerX + radius, centerY], 
            {
                stroke: '#000',
                strokeWidth: 1,
                selectable: false,
                evented: false,
                permanent: true
            }
        );
        this.canvas.add(horizontalAxis);
        this.chartObjects.push(horizontalAxis);

        // Real axis circles (resistance circles)
        this._drawResistanceCircles(centerX, centerY, radius);

        // Reactance arcs (constant reactance)
        this._drawReactanceArcs(centerX, centerY, radius);

        // Add labels
        this._addLabels(centerX, centerY, radius);

        // Add a big label in the center to make it clear
        const title = new fabric.Text("SMITH CHART", {
            left: centerX,
            top: centerY - 20,
            fontSize: 24,
            fontWeight: 'bold',
            fill: '#333',
            originX: 'center',
            originY: 'center',
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(title);
        this.chartObjects.push(title);

        this.canvas.renderAll();
    }
    
    /**
     * Clear all Smith chart objects from canvas
     */
    clearChartObjects() {
        // Remove all existing chart objects from the canvas
        if (this.chartObjects && this.chartObjects.length > 0) {
            this.chartObjects.forEach(obj => {
                this.canvas.remove(obj);
            });
        }
        
        // Reset the chart objects array
        this.chartObjects = [];
        
        // Remove the chart image if it exists
        if (this.chartImage) {
            this.canvas.remove(this.chartImage);
            this.chartImage = null;
        }
    }

    /**
     * Draw resistance circles (constant real part)
     */
    _drawResistanceCircles(centerX, centerY, radius) {
        // Resistance values: 0, 0.2, 0.5, 1.0, 2.0, 5.0, ∞
        const resistanceValues = [0.2, 0.5, 1.0, 2.0, 5.0];
        
        resistanceValues.forEach(r => {
            const circleRadius = radius / (1 + r);
            const centerOffset = (radius * r) / (1 + r);
            
            const resCircle = new fabric.Circle({
                left: (centerX + centerOffset) - circleRadius,
                top: centerY - circleRadius,
                radius: circleRadius,
                fill: 'transparent',
                stroke: '#666',
                strokeWidth: 1,
                strokeDashArray: r === 1.0 ? [] : [5, 5],
                selectable: false,
                evented: false,
                permanent: true
            });
            
            this.canvas.add(resCircle);
            this.chartObjects.push(resCircle);
            
            // Add resistance label
            const labelX = centerX + centerOffset + 5;
            const labelY = centerY + 15;
            
            const label = new fabric.Text(r.toString(), {
                left: labelX,
                top: labelY,
                fontSize: 12,
                fill: '#666',
                selectable: false,
                evented: false,
                permanent: true
            });
            
            this.canvas.add(label);
            this.chartObjects.push(label);
        });
    }

    /**
     * Draw reactance arcs (constant imaginary part)
     */
    _drawReactanceArcs(centerX, centerY, radius) {
        // Reactance values for both positive and negative
        const reactanceValues = [0.2, 0.5, 1.0, 2.0, 5.0];
        
        reactanceValues.forEach(x => {
            // Draw positive reactance (inductive, top half)
            this._drawReactanceArc(centerX, centerY, radius, x, true);
            
            // Draw negative reactance (capacitive, bottom half)
            this._drawReactanceArc(centerX, centerY, radius, x, false);
        });
    }

    /**
     * Draw a reactance arc
     */
    _drawReactanceArc(centerX, centerY, radius, reactance, isPositive) {
        const r = 1 / reactance;
        const arcRadius = radius * (1 + r*r) / (2 * r);
        
        // Calculate center of the arc circle
        const arcCenterX = centerX + radius;
        const arcCenterY = centerY + (isPositive ? arcRadius : -arcRadius);
        
        // Calculate start and end angles
        const startAngle = Math.PI - Math.asin(radius / arcRadius);
        const endAngle = Math.asin(radius / arcRadius);
        
        // For fabric.js, angles are in degrees
        const startAngleDeg = (startAngle * 180 / Math.PI) % 360;
        const endAngleDeg = (endAngle * 180 / Math.PI) % 360;
        
        // Create the arc
        const arc = new fabric.Circle({
            left: arcCenterX - arcRadius,
            top: arcCenterY - arcRadius,
            radius: arcRadius,
            angle: 0,
            startAngle: isPositive ? startAngleDeg : endAngleDeg + 180,
            endAngle: isPositive ? endAngleDeg : startAngleDeg + 180,
            stroke: '#666',
            fill: 'transparent',
            strokeWidth: 1,
            strokeDashArray: [5, 5],
            selectable: false,
            evented: false,
            permanent: true
        });
        
        this.canvas.add(arc);
        this.chartObjects.push(arc);
        
        // Add reactance label
        const labelAngle = isPositive ? (startAngleDeg + endAngleDeg) / 2 * Math.PI / 180 : 
                                       ((startAngleDeg + endAngleDeg) / 2 + 180) * Math.PI / 180;
        const labelRadius = arcRadius * 0.95;
        const labelX = arcCenterX + labelRadius * Math.cos(labelAngle);
        const labelY = arcCenterY + labelRadius * Math.sin(labelAngle);
        
        const label = new fabric.Text(isPositive ? `j${reactance}` : `-j${reactance}`, {
            left: labelX,
            top: labelY,
            fontSize: 12,
            fill: '#666',
            selectable: false,
            evented: false,
            angle: isPositive ? 30 : -30,
            permanent: true
        });
        
        this.canvas.add(label);
        this.chartObjects.push(label);
    }

    /**
     * Add labels to the Smith chart
     */
    _addLabels(centerX, centerY, radius) {
        // Label for center point (1.0 + j0.0)
        const centerLabel = new fabric.Text('1.0 + j0.0', {
            left: centerX + 10,
            top: centerY + 10,
            fontSize: 12,
            fill: '#000',
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(centerLabel);
        this.chartObjects.push(centerLabel);
        
        // Label for open circuit (right side of chart, ∞)
        const openLabel = new fabric.Text('∞', {
            left: centerX + radius - 20,
            top: centerY - 20,
            fontSize: 16,
            fill: '#000',
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(openLabel);
        this.chartObjects.push(openLabel);
        
        // Label for short circuit (left side of chart, 0.0)
        const shortLabel = new fabric.Text('0.0', {
            left: centerX - radius + 10,
            top: centerY - 20,
            fontSize: 12,
            fill: '#000',
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(shortLabel);
        this.chartObjects.push(shortLabel);
        
        // Title at the top
        const titleLabel = new fabric.Text('IMPEDANCE AND ADMITTANCE CHART', {
            left: centerX,
            top: centerY - radius - 30,
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#000',
            originX: 'center',
            selectable: false,
            evented: false,
            permanent: true
        });
        this.canvas.add(titleLabel);
        this.chartObjects.push(titleLabel);
    }
}