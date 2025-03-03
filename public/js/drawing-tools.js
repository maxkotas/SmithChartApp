/**
 * Drawing Tools for Smith Chart
 * This file contains various drawing tools and utilities for the Smith Chart app
 */

class DrawingTools {
    constructor(canvas, statusMessageElement) {
        this.canvas = canvas;
        this.statusMessage = statusMessageElement;
        this.currentMode = null;
        this.drawingState = {
            mode: null,
            step: 0,
            points: []
        };
        this.currentObject = null;
        this.drawingSettings = {
            strokeWidth: 2,
            strokeColor: '#000000',
            lineStyle: 'solid'  // solid, dashed, dotted
        };
        
        // Initialize the event listeners
        this._initializeEventListeners();
        
        // Initialize keyboard events for deletion
        this._initializeKeyboardEvents();
    }
    
    /**
     * Set current drawing mode
     * @param {string} mode - The drawing mode to set
     */
    setMode(mode) {
        this.currentMode = mode;
        this.drawingState = {
            mode: mode,
            step: 0,
            points: []
        };
        this.currentObject = null;
        
        if (mode === 'Select') {
            // Enable selection mode
            this.canvas.selection = true;
            
            this.canvas.forEachObject(obj => {
                // Skip the smith chart image
                if (!obj.permanent) {
                    obj.selectable = true;
                    obj.evented = true;
                }
            });
            
            this.updateStatus('Selection mode: Click objects to select or drag to select multiple');
        } else {
            // Disable selection for drawing modes
            this.canvas.selection = false;
            
            this.canvas.forEachObject(obj => {
                obj.selectable = false;
                obj.evented = false;
            });
            
            // Set appropriate status message based on mode
            if (mode === 'Circle') {
                this.updateStatus('Circle tool: Click to set center point, then click again to set radius');
            } else if (mode === 'Arc') {
                this.updateStatus('Arc tool: Click to set center, then radius, then end angle');
            } else if (mode === 'Line') {
                this.updateStatus('Line tool: Click to set start point, then click again to set end point');
            } else if (mode === 'Eraser') {
                this.updateStatus('Eraser tool: Click on objects to remove them');
            } else if (mode === 'Text') {
                this.updateStatus('Text tool: Click where you want to add text');
            }
        }
        
        // Deselect any selected objects when switching modes
        this.canvas.discardActiveObject().renderAll();
    }
    
    /**
     * Reset the drawing state
     */
    resetState() {
        // Reset drawing state
        this.drawingState = {
            mode: this.currentMode,
            step: 0,
            points: []
        };
        
        // Clean up any temporary objects
        if (this.currentObject) {
            // For arc drawing
            if (typeof this.currentObject === 'object' && !Array.isArray(this.currentObject)) {
                if (this.currentObject.tempLine) this.canvas.remove(this.currentObject.tempLine);
                if (this.currentObject.startLine) this.canvas.remove(this.currentObject.startLine);
                if (this.currentObject.endLine) this.canvas.remove(this.currentObject.endLine);
                if (this.currentObject.arc) this.canvas.remove(this.currentObject.arc);
            } 
            // For single objects
            else if (!this.currentObject.permanent && typeof this.currentObject.remove === 'function') {
                this.canvas.remove(this.currentObject);
            }
        }
        
        this.currentObject = null;
        this.canvas.renderAll();
    }
    
    /**
     * Update the drawing settings
     * @param {Object} settings - Settings to update
     */
    updateSettings(settings) {
        Object.assign(this.drawingSettings, settings);
        
        // Update active objects with new settings if in select mode
        if (this.currentMode === 'Select') {
            const activeObjects = this.canvas.getActiveObjects();
            if (activeObjects.length > 0) {
                activeObjects.forEach(obj => {
                    if (settings.strokeWidth !== undefined) obj.set('strokeWidth', settings.strokeWidth);
                    if (settings.strokeColor !== undefined) {
                        obj.set('stroke', settings.strokeColor);
                        if (obj.type === 'text') obj.set('fill', settings.strokeColor);
                    }
                    if (settings.lineStyle !== undefined) {
                        switch(settings.lineStyle) {
                            case 'dashed':
                                obj.set('strokeDashArray', [6, 6]);
                                break;
                            case 'dotted':
                                obj.set('strokeDashArray', [2, 2]);
                                break;
                            default:
                                obj.set('strokeDashArray', null);
                        }
                    }
                });
                
                this.canvas.renderAll();
            }
        }
    }
    
    /**
     * Update the status message
     * @param {string} message - The message to display
     */
    updateStatus(message) {
        if (this.statusMessage) {
            this.statusMessage.textContent = message;
        }
    }
    
    /**
     * Initialize event listeners for canvas interactions
     */
    _initializeEventListeners() {
        // Mouse down event
        this.canvas.on('mouse:down', (options) => {
            if (!this.currentMode) return;
            
            if (options.target && this.currentMode === 'Eraser') {
                // If clicking on an object in eraser mode
                this._eraseObject(options.target);
                return;
            }
            
            const pointer = this.canvas.getPointer(options.e);
            
            switch (this.currentMode) {
                case 'Circle':
                    this._handleCircleClick(pointer);
                    break;
                case 'Arc':
                    this._handleArcClick(pointer);
                    break;
                case 'Line':
                    this._handleLineClick(pointer);
                    break;
                case 'Text':
                    this._showTextInput(pointer);
                    break;
            }
        });
        
        // Mouse move event for live feedback
        this.canvas.on('mouse:move', (options) => {
            if (!this.currentMode || this.drawingState.step === 0) return;
            
            const pointer = this.canvas.getPointer(options.e);
            
            switch (this.currentMode) {
                case 'Circle':
                    this._updateCirclePreview(pointer);
                    break;
                case 'Line':
                    this._updateLinePreview(pointer);
                    break;
                case 'Arc':
                    this._updateArcPreview(pointer);
                    break;
            }
        });
    }
    
    /**
     * Handle circle drawing clicks
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _handleCircleClick(pointer) {
        if (this.drawingState.step === 0) {
            // First click - set center
            this.drawingState.step = 1;
            this.drawingState.points = [pointer];
            
            // Draw a temporary circle
            const circle = new fabric.Circle({
                left: pointer.x,
                top: pointer.y,
                radius: 0,
                stroke: this.drawingSettings.strokeColor,
                strokeWidth: this.drawingSettings.strokeWidth,
                fill: 'transparent',
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            
            // Apply line style
            if (this.drawingSettings.lineStyle === 'dashed') {
                circle.strokeDashArray = [6, 6];
            } else if (this.drawingSettings.lineStyle === 'dotted') {
                circle.strokeDashArray = [2, 2];
            }
            
            this.canvas.add(circle);
            this.currentObject = circle;
            this.updateStatus('Move to preview, click to set radius');
        } else if (this.drawingState.step === 1) {
            // Second click - set radius and complete
            const center = this.drawingState.points[0];
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const radius = Math.sqrt(dx*dx + dy*dy);
            
            // Update the circle with the final radius
            this.currentObject.set({ radius: radius });
            this.canvas.renderAll();
            
            // Reset state for next drawing
            this.drawingState.step = 0;
            this.currentObject = null;
            this.updateStatus('Circle created. Click to create another circle.');
        }
    }
    
    /**
     * Update circle preview during mouse movement
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _updateCirclePreview(pointer) {
        if (this.drawingState.step !== 1 || !this.currentObject) return;
        
        const center = this.drawingState.points[0];
        const dx = pointer.x - center.x;
        const dy = pointer.y - center.y;
        const radius = Math.sqrt(dx*dx + dy*dy);
        
        this.currentObject.set({ radius: radius });
        this.canvas.renderAll();
    }
    
    /**
     * Handle line drawing clicks
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _handleLineClick(pointer) {
        if (this.drawingState.step === 0) {
            // First click - set start point
            this.drawingState.step = 1;
            this.drawingState.points = [pointer];
            
            // Create a temporary line
            const line = new fabric.Line(
                [pointer.x, pointer.y, pointer.x, pointer.y],
                {
                    stroke: this.drawingSettings.strokeColor,
                    strokeWidth: this.drawingSettings.strokeWidth,
                    selectable: false,
                    evented: false
                }
            );
            
            // Apply line style
            if (this.drawingSettings.lineStyle === 'dashed') {
                line.strokeDashArray = [6, 6];
            } else if (this.drawingSettings.lineStyle === 'dotted') {
                line.strokeDashArray = [2, 2];
            }
            
            this.canvas.add(line);
            this.currentObject = line;
            this.updateStatus('Move to preview, click to set end point');
        } else if (this.drawingState.step === 1) {
            // Second click - set end point and complete
            this.currentObject.set({
                x2: pointer.x,
                y2: pointer.y
            });
            
            this.canvas.renderAll();
            
            // Reset state for next line
            this.drawingState.step = 0;
            this.currentObject = null;
            this.updateStatus('Line created. Click to create another line.');
        }
    }
    
    /**
     * Update line preview during mouse movement
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _updateLinePreview(pointer) {
        if (this.drawingState.step !== 1 || !this.currentObject) return;
        
        this.currentObject.set({
            x2: pointer.x,
            y2: pointer.y
        });
        
        this.canvas.renderAll();
    }
    
    /**
     * Handle arc drawing clicks
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _handleArcClick(pointer) {
        if (this.drawingState.step === 0) {
            // First click - set center
            this.drawingState.step = 1;
            
            // Create a temporary dashed guide line
            const tempLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                stroke: this.drawingSettings.strokeColor,
                strokeWidth: 1,
                strokeDashArray: [5, 5],
                selectable: false,
                evented: false
            });
            
            this.canvas.add(tempLine);
            
            this.currentObject = {
                center: { x: pointer.x, y: pointer.y },
                tempLine: tempLine
            };
            
            this.updateStatus('Move to set radius, click to set start angle');
            
        } else if (this.drawingState.step === 1) {
            // Second click - set radius and start angle
            const center = this.currentObject.center;
            
            // Calculate radius and start angle
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const radius = Math.sqrt(dx*dx + dy*dy);
            const startAngle = Math.atan2(dy, dx);
            
            // Remove temporary line
            this.canvas.remove(this.currentObject.tempLine);
            
            // Create fixed start angle guide line
            const startLine = new fabric.Line(
                [center.x, center.y, pointer.x, pointer.y], 
                {
                    stroke: this.drawingSettings.strokeColor,
                    strokeWidth: 1,
                    strokeDashArray: [5, 5],
                    selectable: false,
                    evented: false
                }
            );
            
            // Create end angle guide line (initially same as start)
            const endLine = new fabric.Line(
                [center.x, center.y, pointer.x, pointer.y], 
                {
                    stroke: this.drawingSettings.strokeColor,
                    strokeWidth: 1,
                    strokeDashArray: [5, 5],
                    selectable: false,
                    evented: false
                }
            );
            
            this.canvas.add(startLine);
            this.canvas.add(endLine);
            
            // Update currentObject with all the arc information
            this.currentObject = {
                center: center,
                radius: radius,
                startAngle: startAngle,
                currentAngle: startAngle,
                startLine: startLine,
                endLine: endLine,
                arc: null
            };
            
            this.drawingState.step = 2;
            this.updateStatus('Move to set end angle, click to complete arc');
            
        } else if (this.drawingState.step === 2) {
            // Third click - complete the arc
            const center = this.currentObject.center;
            const radius = this.currentObject.radius;
            const startAngle = this.currentObject.startAngle;
            const endAngle = this.currentObject.currentAngle;
            
            // Remove guide lines and temporary arc
            this.canvas.remove(this.currentObject.startLine);
            this.canvas.remove(this.currentObject.endLine);
            if (this.currentObject.arc) {
                this.canvas.remove(this.currentObject.arc);
            }
            
            // Create final arc
            const arc = this._createArc(center.x, center.y, radius, startAngle, endAngle);
            
            // Apply the selected line style
            if (this.drawingSettings.lineStyle === 'dashed') {
                arc.strokeDashArray = [6, 6];
            } else if (this.drawingSettings.lineStyle === 'dotted') {
                arc.strokeDashArray = [2, 2];
            }
            
            // Make it selectable
            arc.set({
                selectable: this.currentMode === 'Select',
                evented: this.currentMode === 'Select'
            });
            
            this.canvas.add(arc);
            this.canvas.renderAll();
            
            // Reset for next drawing
            this.drawingState.step = 0;
            this.currentObject = null;
            this.updateStatus('Arc created. Click to create another arc.');
        }
    }
    
    /**
     * Update arc preview during mouse movement
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _updateArcPreview(pointer) {
        if (this.drawingState.step === 1 && this.currentObject.tempLine) {
            // Update the temporary radius line
            this.currentObject.tempLine.set({
                x2: pointer.x,
                y2: pointer.y
            });
            this.canvas.renderAll();
            
        } else if (this.drawingState.step === 2) {
            // Update the end angle line and arc
            const center = this.currentObject.center;
            const radius = this.currentObject.radius;
            const startAngle = this.currentObject.startAngle;
            
            // Calculate current angle based on mouse position
            const dx = pointer.x - center.x;
            const dy = pointer.y - center.y;
            const currentAngle = Math.atan2(dy, dx);
            this.currentObject.currentAngle = currentAngle;
            
            // Calculate endpoint that maintains radius
            const endX = center.x + radius * Math.cos(currentAngle);
            const endY = center.y + radius * Math.sin(currentAngle);
            
            // Update the end angle line
            this.currentObject.endLine.set({
                x2: endX,
                y2: endY
            });
            
            // Remove existing arc
            if (this.currentObject.arc) {
                this.canvas.remove(this.currentObject.arc);
            }
            
            // Create new arc with current angles
            const arc = this._createArc(center.x, center.y, radius, startAngle, currentAngle);
            
            this.canvas.add(arc);
            this.currentObject.arc = arc;
            
            this.canvas.renderAll();
        }
    }
    
    /**
     * Create an arc path that can span 360 degrees or more
     * @param {number} centerX - X coordinate of center
     * @param {number} centerY - Y coordinate of center
     * @param {number} radius - Radius of arc
     * @param {number} startAngle - Start angle in radians
     * @param {number} endAngle - End angle in radians
     * @returns {fabric.Path} The created arc
     */
    _createArc(centerX, centerY, radius, startAngle, endAngle) {
        // Calculate start and end points
        const startX = centerX + radius * Math.cos(startAngle);
        const startY = centerY + radius * Math.sin(startAngle);
        const endX = centerX + radius * Math.cos(endAngle);
        const endY = centerY + radius * Math.sin(endAngle);
        
        // Calculate angle difference (normalized to [-π, π])
        let angleDiff = endAngle - startAngle;
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
        
        // Set large arc flag - determines whether to draw the major or minor arc
        // 1 for arcs > 180 degrees, 0 for arcs <= 180 degrees
        const largeArcFlag = Math.abs(angleDiff) > Math.PI ? 1 : 0;
        
        // Set sweep flag - determines arc direction (1 = clockwise, 0 = counterclockwise)
        const sweepFlag = angleDiff < 0 ? 0 : 1;
        
        // Create path data string
        const pathData = [
            'M', startX, startY,
            'A', radius, radius, 0, largeArcFlag, sweepFlag, endX, endY
        ];
        
        // Create fabric path object
        const arc = new fabric.Path(pathData.join(' '), {
            fill: '',
            stroke: this.drawingSettings.strokeColor,
            strokeWidth: this.drawingSettings.strokeWidth,
            selectable: false,
            evented: false
        });
        
        return arc;
    }
    
    /**
     * Use eraser to remove an object
     * @param {fabric.Object} object - The object to erase
     */
    _eraseObject(object) {
        // Don't erase the Smith chart image
        if (object.permanent) {
            this.updateStatus("Can't erase the Smith chart image.");
            return;
        }
        
        this.canvas.remove(object);
        this.canvas.renderAll();
        this.updateStatus('Object erased. Click on objects to erase them.');
    }
    
    /**
     * Show text input dialog
     * @param {Object} pointer - Mouse pointer coordinates
     */
    _showTextInput(pointer) {
        const text = prompt('Enter text:');
        if (text) {
            this._addText(pointer, text);
        }
    }
    
    /**
     * Add text at the specified position
     * @param {Object} pointer - The mouse pointer coordinates
     * @param {string} text - The text to add
     */
    _addText(pointer, text) {
        if (text) {
            const textObj = new fabric.Text(text, {
                left: pointer.x,
                top: pointer.y,
                fontSize: this.drawingSettings.strokeWidth * 8,
                fill: this.drawingSettings.strokeColor,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false
            });
            
            this.canvas.add(textObj);
            this.canvas.renderAll();
            this.updateStatus('Text added. Click to add more text.');
        }
    }
    
    /**
     * Initialize keyboard events for deletion
     */
    _initializeKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && 
                this.currentMode === 'Select') {
                const activeObjects = this.canvas.getActiveObjects();
                
                if (activeObjects.length > 0) {
                    activeObjects.forEach(obj => {
                        // Don't delete the Smith chart
                        if (!obj.permanent) {
                            this.canvas.remove(obj);
                        }
                    });
                    
                    this.canvas.discardActiveObject();
                    this.canvas.renderAll();
                    this.updateStatus(`Deleted ${activeObjects.length} object(s)`);
                }
            }
        });
    }
}