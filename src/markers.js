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

    // Axis-aligned corner brackets (for barcode, DM, Aztec)
    const drawCorners = (x, y, w, h) => {
      const L = options.cornerLength || Math.min(Math.max(8, Math.min(w, h) * 0.2), 24);
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    };

    // Rotated corner bracket at point p, with arms along directions d1 and d2
    const drawRotatedCorner = (p, d1, d2, armLen) => {
      ctx.beginPath();
      ctx.moveTo(p[0] + d1[0] * armLen, p[1] + d1[1] * armLen);
      ctx.lineTo(p[0], p[1]);
      ctx.lineTo(p[0] + d2[0] * armLen, p[1] + d2[1] * armLen);
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

    // Normalize vector to unit length
    const normalize = (dx, dy) => {
      const len = Math.sqrt(dx * dx + dy * dy);
      return len > 0 ? [dx / len, dy / len] : [0, 0];
    };

    for (const r of results) {
      if (r.format === 'qr' && r.points && r.points.length >= 3) {
        const pts = r.points.map(p => [mx(p.x), my(p.y)]);
        // 4th corner: p1 + p2 - p0 (parallelogram)
        const br = [pts[1][0] + pts[2][0] - pts[0][0], pts[1][1] + pts[2][1] - pts[0][1]];

        // Module size in canvas pixels
        const avgMs = (r.points[0].estModuleSize + r.points[1].estModuleSize + r.points[2].estModuleSize) / 3;
        const ms = avgMs || 3;

        // Module-vector expansion using edge directions from finder centers
        // pt0=TL finder, pt1=TR finder, pt2=BL finder
        // uX = unit direction along top edge (pt0→pt1), uY = unit direction along left edge (pt0→pt2)
        const d01 = normalize(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
        const d02 = normalize(pts[2][0] - pts[0][0], pts[2][1] - pts[0][1]);
        const ex = ms * 4; // expansion: 3.5 modules + 0.5 quiet zone buffer

        // QR boundary corners (expanded outward from finder centers by ex modules)
        const expanded = [
          [pts[0][0] - d01[0] * ex - d02[0] * ex, pts[0][1] - d01[1] * ex - d02[1] * ex],  // TL
          [pts[1][0] + d01[0] * ex - d02[0] * ex, pts[1][1] + d01[1] * ex - d02[1] * ex],  // TR
          [br[0]     + d01[0] * ex + d02[0] * ex, br[1]     + d01[1] * ex + d02[1] * ex],  // BR
          [pts[2][0] - d01[0] * ex + d02[0] * ex, pts[2][1] - d01[1] * ex + d02[1] * ex],  // BL
        ];

        // Fill rotated quad
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.moveTo(expanded[0][0], expanded[0][1]);
        ctx.lineTo(expanded[1][0], expanded[1][1]);
        ctx.lineTo(expanded[2][0], expanded[2][1]);
        ctx.lineTo(expanded[3][0], expanded[3][1]);
        ctx.closePath();
        ctx.fill();

        // Rotated corner brackets at each expanded corner
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        const armLen = options.cornerLength || Math.min(Math.max(10, ms * 5), 30);
        for (let i = 0; i < 4; i++) {
          const prev = expanded[(i + 3) % 4];
          const curr = expanded[i];
          const next = expanded[(i + 1) % 4];
          const a1 = normalize(prev[0] - curr[0], prev[1] - curr[1]);
          const a2 = normalize(next[0] - curr[0], next[1] - curr[1]);
          drawRotatedCorner(curr, a1, a2, armLen);
        }

        // 3 finder pattern dots
        if (showQRDots) {
          const dr = dotRadius * 1.5;
          ctx.fillStyle = lineColor;
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(pts[i][0], pts[i][1], dr * 0.45, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = lineColor;
          }
        }

        // Rotated label at TL corner
        if (showLabels) {
          const angle = Math.atan2(d01[1], d01[0]);
          ctx.save();
          ctx.translate(expanded[0][0], expanded[0][1]);
          ctx.rotate(angle);
          ctx.font = labelFont;
          const tw = ctx.measureText('QR').width;
          const pad = 3;
          ctx.fillStyle = labelBg;
          ctx.beginPath();
          ctx.roundRect(0, -14, tw + pad * 2, 14, 3);
          ctx.fill();
          ctx.fillStyle = labelColor;
          ctx.fillText('QR', pad, -2);
          ctx.restore();
        }

      } else if (r.format === 'aztec' && r.bounds && markerStyle !== 'none') {
        const bx = mx(r.bounds.x), by = my(r.bounds.y);
        const bw = r.bounds.w * scaleX, bh = r.bounds.h * scaleY;

        // Fill
        ctx.fillStyle = fillColor;
        ctx.fillRect(bx, by, bw, bh);

        // Corner brackets
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        drawCorners(bx, by, bw, bh);

        // Bull's eye finder dot (like QR finder dots)
        if (r.bullsEye && showQRDots) {
          const bcx = mx(r.bullsEye.x), bcy = my(r.bullsEye.y);
          const beR = r.bullsEye.radius * Math.min(scaleX, scaleY);
          // Outer square ring (bull's eye is concentric squares)
          ctx.strokeStyle = lineColor;
          ctx.lineWidth = lineWidth * 1.5;
          const sqSize = beR * 1.2;
          ctx.strokeRect(bcx - sqSize / 2, bcy - sqSize / 2, sqSize, sqSize);
          // Center dot
          const dr = dotRadius * 1.8;
          ctx.fillStyle = lineColor;
          ctx.beginPath();
          ctx.arc(bcx, bcy, dr, 0, Math.PI * 2);
          ctx.fill();
          // White inner
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(bcx, bcy, dr * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }

        drawLabel('AZTEC', bx, by);

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

