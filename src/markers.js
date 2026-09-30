  // ════════════════════════════════════════════════════════════════════════
  // markers.js — Detection marker rendering with customizable options
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Draw detection markers on a canvas context for scan results.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas 2D context to draw on
   * @param {Array} results - Array from readAll() or read()
   * @param {Object} [options] - Drawing options
   * @param {number} options.imgWidth - Original image width (for coordinate mapping)
   * @param {number} options.imgHeight - Original image height
   * @param {number} [options.canvasWidth] - Canvas width (defaults to ctx.canvas.width)
   * @param {number} [options.canvasHeight] - Canvas height (defaults to ctx.canvas.height)
   * @param {number} [options.offsetX=0] - X offset for object-fit calculations
   * @param {number} [options.offsetY=0] - Y offset for object-fit calculations
   * @param {number} [options.renderWidth] - Rendered width (defaults to canvasWidth)
   * @param {number} [options.renderHeight] - Rendered height (defaults to canvasHeight)
   * @param {string} [options.lineColor='#10b981'] - Stroke color
   * @param {number} [options.lineWidth=2] - Stroke width
   * @param {string} [options.fillColor='rgba(16,185,129,0.06)'] - Fill color
   * @param {number} [options.cornerLength] - Corner bracket length (auto-calculated if omitted)
   * @param {string} [options.markerStyle='corners'] - 'corners' | 'rect' | 'none'
   * @param {boolean} [options.showLabels=true] - Show format labels
   * @param {string} [options.labelFont='bold 10px monospace'] - Label font
   * @param {string} [options.labelBg='rgba(16,185,129,0.85)'] - Label background color
   * @param {string} [options.labelColor='#000'] - Label text color
   * @param {boolean} [options.showQRDots=true] - Show corner dots on QR markers
   * @param {number} [options.dotRadius=3] - QR corner dot radius
   * @param {boolean} [options.clearCanvas=true] - Clear canvas before drawing
   */
  static drawDetections(ctx, results, options = {}) {
    if (!ctx || !results || !results.length) return;

    const cw = options.canvasWidth || ctx.canvas.width;
    const ch = options.canvasHeight || ctx.canvas.height;
    const imgW = options.imgWidth || cw;
    const imgH = options.imgHeight || ch;
    const offX = options.offsetX || 0;
    const offY = options.offsetY || 0;
    const rW = options.renderWidth || cw;
    const rH = options.renderHeight || ch;

    const lineColor = options.lineColor || '#10b981';
    const lineWidth = options.lineWidth || 2;
    const fillColor = options.fillColor || 'rgba(16,185,129,0.06)';
    const markerStyle = options.markerStyle || 'corners';
    const showLabels = options.showLabels !== false;
    const labelFont = options.labelFont || 'bold 10px monospace';
    const labelBg = options.labelBg || 'rgba(16,185,129,0.85)';
    const labelColor = options.labelColor || '#000';
    const showQRDots = options.showQRDots !== false;
    const dotRadius = options.dotRadius || 3;

    if (options.clearCanvas !== false) ctx.clearRect(0, 0, cw, ch);

    const scaleX = rW / imgW;
    const scaleY = rH / imgH;
    const mx = (px) => offX + px * scaleX;
    const my = (py) => offY + py * scaleY;

    const drawCorners = (x, y, w, h) => {
      const L = options.cornerLength || Math.min(Math.max(8, Math.min(w, h) * 0.2), 24);
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    };

    const drawLabel = (text, x, y) => {
      if (!showLabels) return;
      ctx.font = labelFont;
      const tw = ctx.measureText(text).width;
      const pad = 3;
      ctx.fillStyle = labelBg;
      ctx.beginPath();
      ctx.roundRect(x, y - 12, tw + pad * 2, 14, 3);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.fillText(text, x + pad, y - 1);
    };

    for (const r of results) {
      if (r.format === 'qr' && r.points && r.points.length >= 3) {
        const pts = r.points.map(p => [mx(p.x), my(p.y)]);
        const br = [pts[1][0] + pts[2][0] - pts[0][0], pts[1][1] + pts[2][1] - pts[0][1]];

        // Module size in canvas pixels (average of 3 finders)
        const avgMs = (r.points[0].estModuleSize + r.points[1].estModuleSize + r.points[2].estModuleSize) / 3;
        const expandX = avgMs * 3.5 * scaleX;
        const expandY = avgMs * 3.5 * scaleY;

        // Compute bounding box from the 4 corners, expanded to QR outer edge
        const allX = [pts[0][0], pts[1][0], pts[2][0], br[0]];
        const allY = [pts[0][1], pts[1][1], pts[2][1], br[1]];
        const bx = Math.max(0, Math.min(...allX) - expandX);
        const by = Math.max(0, Math.min(...allY) - expandY);
        const bw = Math.min(cw - bx, Math.max(...allX) - bx + expandX);
        const bh = Math.min(ch - by, Math.max(...allY) - by + expandY);

        // Fill
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        ctx.lineTo(pts[1][0], pts[1][1]);
        ctx.lineTo(br[0], br[1]);
        ctx.lineTo(pts[2][0], pts[2][1]);
        ctx.closePath();
        ctx.fill();

        // Corner brackets (same style as barcodes)
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        drawCorners(bx, by, bw, bh);

        // 3 finder pattern dots (larger, prominent)
        if (showQRDots) {
          const dr = dotRadius * 1.5;
          ctx.fillStyle = lineColor;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr, 0, Math.PI * 2);
            ctx.fill();
            // White inner circle
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = lineColor;
          }
        }

        drawLabel('QR', bx, by);

      } else if (r.bounds && markerStyle !== 'none') {
        const bx = mx(r.bounds.x), by = my(r.bounds.y);
        const bw = r.bounds.w * scaleX, bh = r.bounds.h * scaleY;

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(bx, by, bw, bh);

        // Stroke
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        if (markerStyle === 'rect') {
          ctx.strokeRect(bx, by, bw, bh);
        } else {
          drawCorners(bx, by, bw, bh);
        }

        // Label
        let labelText = (r.format || '').toUpperCase();
        if (r.format === 'datamatrix') labelText = 'DATA MATRIX';
        drawLabel(labelText, bx, by);
      }
    }
  }

