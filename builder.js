
window.onload = function() {
    let hoveredElement = null;
    let gridSizes = [0, 5, 10, 20];
    let gridIndex = 2;

    // Helper to check if a string is a color
    function isColor(str) {
        const s = new Option().style;
        s.color = str;
        return s.color !== '';
    }

    // 1. SETUP ZONES (Backgrounds only)
    document.querySelectorAll('section.zone').forEach(section => {
        const bg = section.getAttribute('data-bg');
        if (bg) {
            if (isColor(bg)) {
                // It's a color
                section.style.backgroundColor = bg;
            } else if (bg.includes('gradient')) {
                // It's a gradient
                section.style.backgroundImage = bg;
                section.style.backgroundSize = 'cover';
                section.style.backgroundRepeat = 'no-repeat';
            } else if (bg.includes('http') || bg.includes('.') || bg.includes('/')) {
                // It's an image URL
                section.style.backgroundImage = `url('${bg}')`;
                section.style.backgroundRepeat = 'repeat';
            } else {
                // Try as color first, fallback to image
                section.style.backgroundColor = bg;
            }
        }

        const vh = section.getAttribute('data-height');
        if (vh) section.style.minHeight = vh + "vh";
    });

    // 2. SETUP DRAGGABLES - STORE ORIGINAL CSS POSITIONS
    document.querySelectorAll('.draggable').forEach(el => {
        // Get the ORIGINAL position from CSS (before any dragging)
        const computed = window.getComputedStyle(el);

        // Store the original CSS values
        if (!el.dataset.originalLeft) {
            el.dataset.originalLeft = computed.left === 'auto' ? '0px' : computed.left;
        }
        if (!el.dataset.originalTop) {
            el.dataset.originalTop = computed.top === 'auto' ? '0px' : computed.top;
        }

        // EXTRACT EXISTING TRANSFORM VALUES FROM CSS
        const existingTransform = computed.transform;

        // Default values
        let existingScale = 1;
        let existingRotate = 0;

        if (existingTransform && existingTransform !== 'none') {
            // Parse the transform matrix
            const matrix = new DOMMatrixReadOnly(existingTransform);

            // Extract scale (average of x and y scale)
            const scaleX = Math.sqrt(matrix.a * matrix.a + matrix.b * matrix.b);
            const scaleY = Math.sqrt(matrix.c * matrix.c + matrix.d * matrix.d);
            existingScale = ((scaleX + scaleY) / 2).toFixed(2);

            // Extract rotation (angle in degrees)
            existingRotate = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
        }

        // Only set if not already defined or different from CSS
        if (!el.dataset.scale) {
            el.dataset.scale = existingScale;
        }
        if (!el.dataset.rotate) {
            el.dataset.rotate = Math.round(existingRotate);
        }

        // Parse the original values (strip 'px')
        const originalLeft = parseFloat(el.dataset.originalLeft);
        const originalTop = parseFloat(el.dataset.originalTop);

        // Store current drag offsets (starts at 0)
        el.setAttribute('data-x', 0);
        el.setAttribute('data-y', 0);

        el.onmouseenter = () => {
            hoveredElement = el;
            el.style.outline = "2px solid #00ff00";
            updateTooltip(el); // Update immediately on hover
        };
        el.onmouseleave = () => {
            hoveredElement = null;
            el.style.outline = "none";
        };

        // Apply initial transform preserving existing CSS values
        const x = parseFloat(el.getAttribute('data-x')) || 0;
        const y = parseFloat(el.getAttribute('data-y')) || 0;
        el.style.transform = `translate(${x}px, ${y}px) scale(${el.dataset.scale}) rotate(${el.dataset.rotate}deg)`;
        el.style.transformOrigin = 'center';
    });

    // 3. HUD UI
    const tooltip = document.createElement('div');
    tooltip.style.cssText = "position:fixed; background:rgba(0,0,0,0.9); color:cyan; padding:8px; font-family:monospace; font-size:11px; pointer-events:none; z-index:10000; border:1px solid cyan; border-radius:4px; max-width:300px; white-space:pre;";
    document.body.appendChild(tooltip);

    const toolbox = document.createElement('div');
    toolbox.style.cssText = `position: fixed; top: 20px; right: 20px; background: rgba(20, 20, 20, 0.95); color: #00ff00; padding: 15px; border: 2px solid #00ff00; font-family: monospace; font-size: 12px; z-index: 10001; border-radius: 8px;`;
    document.body.appendChild(toolbox);

    function updateHUD() {
        let snap = gridSizes[gridIndex];
        toolbox.innerHTML = `<div style="text-align:center; border-bottom:1px solid #00ff00; margin-bottom:10px;">🛠️ ENGINE ACTIVE</div>
            [E/A] Layer +/- | [R/F] Scale +/- | [Q/D] Rotate<br>
            [G] GRID: ${snap === 0 ? 'OFF' : snap+'px'} | [S] SAVE CSS`;
    }
    updateHUD();

    // Function to update tooltip for an element
    function updateTooltip(element) {
        if (!element) return;

        const rect = element.getBoundingClientRect();
        const zone = element.closest('.zone');
        const zoneRect = zone.getBoundingClientRect();

        // Calculate position relative to zone
        const relativeLeft = rect.left - zoneRect.left;
        const relativeTop = rect.top - zoneRect.top;

        // Get properties
        const scale = element.dataset.scale || 1;
        const rotate = element.dataset.rotate || 0;
        const zIndex = element.style.zIndex || window.getComputedStyle(element).zIndex || 10;
        const dragX = parseFloat(element.getAttribute('data-x')) || 0;
        const dragY = parseFloat(element.getAttribute('data-y')) || 0;

        tooltip.innerHTML = `
<b>${element.id}</b>
├─ Position: ${Math.round(relativeLeft)}px, ${Math.round(relativeTop)}px
├─ Drag offset: ${Math.round(dragX)}px, ${Math.round(dragY)}px
├─ Scale: ${scale}x
├─ Rotation: ${rotate}°
└─ Z-index: ${zIndex}
        `.trim();
    }

    // 4. DRAG LOGIC WITH GRID SNAPPING
    interact('.draggable').draggable({
        inertia: false,
        modifiers: [
            interact.modifiers.snap({
                targets: [
                    interact.createSnapGrid({
                        x: function() { return gridSizes[gridIndex]; },
                        y: function() { return gridSizes[gridIndex]; },
                        offset: { x: 0, y: 0 }
                    })
                ],
                range: Infinity,
                relativePoints: [ { x: 0, y: 0 } ],
                enabled: function() { return gridSizes[gridIndex] > 0; }
            })
        ],
        listeners: {
            start(event) {
                if (hoveredElement) {
                    hoveredElement = event.target;
                    updateTooltip(hoveredElement);
                }
            },
            move(event) {
                const target = event.target;
                // Get the snapped movement from interact.js
                let x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                let y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                // Still apply grid rounding to ensure precision
                let snap = gridSizes[gridIndex];
                if (snap > 0) {
                    x = Math.round(x / snap) * snap;
                    y = Math.round(y / snap) * snap;
                }

                target.style.transform = `translate(${x}px, ${y}px) scale(${target.dataset.scale}) rotate(${target.dataset.rotate}deg)`;
                target.style.transformOrigin = 'center';
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);

                // Update tooltip in real-time during drag
                if (hoveredElement === target) {
                    updateTooltip(target);
                }
            },
            end(event) {
                if (hoveredElement === event.target) {
                    updateTooltip(event.target);
                }
            }
        }
    });

    // 5. KEYBOARD & SAVE with real-time tooltip updates
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'g') {
            gridIndex = (gridIndex + 1) % gridSizes.length;
            updateHUD();

            // Update tooltip with new grid info
            if (!hoveredElement) {
                tooltip.innerHTML = `
Mouse: ${Math.round(e.pageX)}px, ${Math.round(e.pageY)}px
Grid: ${gridSizes[gridIndex] === 0 ? 'OFF' : gridSizes[gridIndex] + 'px'}
                `.trim();
            }
            return;
        }

        if (hoveredElement) {
            let s = parseFloat(hoveredElement.dataset.scale);
            let r = parseFloat(hoveredElement.dataset.rotate);
            let z = parseInt(window.getComputedStyle(hoveredElement).zIndex) || 10;

            let changed = false;

            if (key === 'r') { s += 0.05; changed = true; }
            if (key === 'f') { s -= 0.05; changed = true; }
            if (key === 'd') { r += 5; changed = true; }
            if (key === 'q') { r -= 5; changed = true; }
            if (key === 'e') { z++; hoveredElement.style.zIndex = z; changed = true; }
            if (key === 'a') { z--; hoveredElement.style.zIndex = z; changed = true; }

            if (changed) {
                hoveredElement.dataset.scale = s.toFixed(2);
                hoveredElement.dataset.rotate = r;

                const x = hoveredElement.getAttribute('data-x') || 0;
                const y = hoveredElement.getAttribute('data-y') || 0;
                hoveredElement.style.transform = `translate(${x}px, ${y}px) scale(${s}) rotate(${r}deg)`;
                hoveredElement.style.transformOrigin = 'center';

                // Update tooltip immediately after keyboard changes
                updateTooltip(hoveredElement);
            }
        }

        if (key === 's') {
            let css = "/* --- AUTO-GENERATED WORLD CSS --- */\n";

            document.querySelectorAll('section.zone').forEach(zone => {
                const bg = zone.getAttribute('data-bg');
                let bgCss = '';

                if (bg) {
                    if (isColor(bg)) {
                        bgCss = `background-color: ${bg};`;
                    } else if (bg.includes('gradient')) {
                        bgCss = `background-image: ${bg}; background-size: cover; background-repeat: no-repeat;`;
                    } else if (bg.includes('http') || bg.includes('.') || bg.includes('/')) {
                        bgCss = `background-image: url('${bg}'); background-repeat: repeat;`;
                    } else {
                        bgCss = `background-color: ${bg};`;
                    }
                }

                css += `\n/* ZONE: ${zone.id.toUpperCase()} */\n`;
                css += `#${zone.id} { position: relative; width: 100%; min-height: ${zone.style.minHeight}; ${bgCss} overflow: visible; }\n`;

                zone.querySelectorAll('.draggable').forEach(el => {
                    // Get original CSS position
                    const originalLeft = parseFloat(el.dataset.originalLeft) || 0;
                    const originalTop = parseFloat(el.dataset.originalTop) || 0;

                    // Get current drag offsets
                    const dragX = parseFloat(el.getAttribute('data-x')) || 0;
                    const dragY = parseFloat(el.getAttribute('data-y')) || 0;

                    // Calculate FINAL position
                    const finalLeft = originalLeft + dragX;
                    const finalTop = originalTop + dragY;

                    const scale = el.dataset.scale || 1;
                    const rotate = el.dataset.rotate || 0;
                    const zIndex = el.style.zIndex || window.getComputedStyle(el).zIndex || 10;

                    css += `#${el.id} { position: absolute; top: ${Math.round(finalTop)}px; left: ${Math.round(finalLeft)}px; z-index: ${zIndex}; transform: scale(${scale}) rotate(${rotate}deg); transform-origin: center; }\n`;

                    // Update the element's inline styles to match the new position
                    el.style.left = finalLeft + 'px';
                    el.style.top = finalTop + 'px';
                    el.style.transform = `scale(${scale}) rotate(${rotate}deg)`;
                    el.style.transformOrigin = 'center';

                    // Update the original position for next session
                    el.dataset.originalLeft = finalLeft + 'px';
                    el.dataset.originalTop = finalTop + 'px';

                    // Reset drag offsets since position is now baked
                    el.setAttribute('data-x', 0);
                    el.setAttribute('data-y', 0);
                });
            });

            navigator.clipboard.writeText(css);
            alert("CSS Saved! Copied to clipboard.");

            // Update tooltip if hovering an element after save
            if (hoveredElement) {
                updateTooltip(hoveredElement);
            }
        }
    });

    // 6. MOUSE TRACKING
    window.onmousemove = (e) => {
        tooltip.style.left = (e.clientX + 15) + "px";
        tooltip.style.top = (e.clientY + 15) + "px";

        // Only update if not hovering an element
        if (!hoveredElement) {
            tooltip.innerHTML = `
Mouse: ${Math.round(e.pageX)}px, ${Math.round(e.pageY)}px
Grid: ${gridSizes[gridIndex] === 0 ? 'OFF' : gridSizes[gridIndex] + 'px'}
            `.trim();
        }
    };
};
