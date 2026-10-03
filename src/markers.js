  // ════════════════════════════════════════════════════════════════════════
  // markers.js — Detection marker rendering with customizable options
  // ════════════════════════════════════════════════════════════════════════

  /**
   * Draw detection markers on a canvas context for scan results.
   * Markers follow the actual orientation of detected codes — if a QR code,
   * barcode, Data Matrix, or Aztec code is rotated, the marker and label
   * rotate to match.
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

    // Normalize vector to unit length
    const normalize = (dx, dy) => {
      const len = Math.sqrt(dx * dx + dy * dy);
      return len > 0 ? [dx / len, dy / len] : [0, 0];
    };

    // ── Rotated quad helpers (shared by QR, DM, Aztec, and any code with corners) ──

    // Fill a quad defined by 4 canvas-space points
    const fillQuad = (pts) => {
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      ctx.lineTo(pts[1][0], pts[1][1]);
      ctx.lineTo(pts[2][0], pts[2][1]);
      ctx.lineTo(pts[3][0], pts[3][1]);
      ctx.closePath();
      ctx.fill();
    };

    // Draw a corner bracket at point p with arms toward two adjacent corners
    const drawRotatedCorner = (p, d1, d2, armLen) => {
      ctx.beginPath();
      ctx.moveTo(p[0] + d1[0] * armLen, p[1] + d1[1] * armLen);
      ctx.lineTo(p[0], p[1]);
      ctx.lineTo(p[0] + d2[0] * armLen, p[1] + d2[1] * armLen);
      ctx.stroke();
    };

    // Draw rotated corner brackets on a 4-point quad (TL, TR, BR, BL order)
    const drawQuadCorners = (pts, armLen) => {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = lineColor;
      for (let i = 0; i < 4; i++) {
        const prev = pts[(i + 3) % 4];
        const curr = pts[i];
        const next = pts[(i + 1) % 4];
        const a1 = normalize(prev[0] - curr[0], prev[1] - curr[1]);
        const a2 = normalize(next[0] - curr[0], next[1] - curr[1]);
        drawRotatedCorner(curr, a1, a2, armLen);
      }
    };

    // Draw a rotated label at the TL corner of a quad, aligned along the top edge
    const drawRotatedLabel = (text, pts) => {
      if (!showLabels) return;
      const d = normalize(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      const angle = Math.atan2(d[1], d[0]);
      ctx.save();
      ctx.translate(pts[0][0], pts[0][1]);
      ctx.rotate(angle);
      ctx.font = labelFont;
      const tw = ctx.measureText(text).width;
      const pad = 3;
      ctx.fillStyle = labelBg;
      ctx.beginPath();
      ctx.roundRect(0, -14, tw + pad * 2, 14, 3);
      ctx.fill();
      ctx.fillStyle = labelColor;
      ctx.fillText(text, pad, -2);
      ctx.restore();
    };

    // Axis-aligned corner brackets (fallback for codes without rotation data)
    const drawCorners = (x, y, w, h) => {
      const L = options.cornerLength || Math.min(Math.max(8, Math.min(w, h) * 0.2), 24);
      ctx.beginPath();
      ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y);
      ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L);
      ctx.moveTo(x + w, y + h - L); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - L, y + h);
      ctx.moveTo(x + L, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - L);
      ctx.stroke();
    };

    // Axis-aligned label (fallback for codes without rotation data)
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

    // Draw finder/bull's-eye dots (QR finder, Aztec bull's eye center)
    const drawFinderDot = (cx, cy, radius) => {
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.45, 0, Math.PI * 2);
      ctx.fill();
    };


    for (const r of results) {

      // ═══════════════════════════════════════════════════════
      // QR CODE — uses 3 finder pattern center points
      // ═══════════════════════════════════════════════════════
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
        fillQuad(expanded);

        // Rotated corner brackets
        const armLen = options.cornerLength || Math.min(Math.max(10, ms * 5), 30);
        drawQuadCorners(expanded, armLen);

        // 3 finder pattern dots
        if (showQRDots) {
          const dr = dotRadius * 1.5;
          for (let i = 0; i < 3; i++) {
            drawFinderDot(pts[i][0], pts[i][1], dr);
          }
        }

        // Rotated label at TL corner
        drawRotatedLabel('QR', expanded);


      // ═══════════════════════════════════════════════════════
      // DATA MATRIX — uses corners[] if available, else bounds
      // ═══════════════════════════════════════════════════════
      } else if (r.format === 'datamatrix' && markerStyle !== 'none') {

        if (r.corners && r.corners.length === 4) {
          // ── Rotated marker using actual detected quadrilateral corners ──
          const cpts = r.corners.map(c => [mx(c.x), my(c.y)]);

          // Fill rotated quad
          fillQuad(cpts);

          // Compute arm length from edge size
          const edgeLen = Math.sqrt(
            (cpts[1][0] - cpts[0][0]) ** 2 + (cpts[1][1] - cpts[0][1]) ** 2
          );
          const armLen = options.cornerLength || Math.min(Math.max(8, edgeLen * 0.15), 24);

          if (markerStyle === 'rect') {
            // Draw full rotated rectangle outline
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(cpts[0][0], cpts[0][1]);
            ctx.lineTo(cpts[1][0], cpts[1][1]);
            ctx.lineTo(cpts[2][0], cpts[2][1]);
            ctx.lineTo(cpts[3][0], cpts[3][1]);
            ctx.closePath();
            ctx.stroke();
          } else {
            // Rotated corner brackets
            drawQuadCorners(cpts, armLen);
          }

          // Rotated label at TL corner
          drawRotatedLabel('DATA MATRIX', cpts);

        } else if (r.bounds) {
          // ── Fallback: axis-aligned bounds ──
          const bx = mx(r.bounds.x), by = my(r.bounds.y);
          const bw = r.bounds.w * scaleX, bh = r.bounds.h * scaleY;

          ctx.fillStyle = fillColor;
          ctx.fillRect(bx, by, bw, bh);

          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = lineColor;
          if (markerStyle === 'rect') {
            ctx.strokeRect(bx, by, bw, bh);
          } else {
            drawCorners(bx, by, bw, bh);
          }

          drawLabel('DATA MATRIX', bx, by);
        }


      // ═══════════════════════════════════════════════════════
      // AZTEC — uses corners[] if available, else bounds
      // ═══════════════════════════════════════════════════════
      } else if (r.format === 'aztec' && markerStyle !== 'none') {

        if (r.corners && r.corners.length === 4) {
          // ── Rotated marker using computed corner positions ──
          const cpts = r.corners.map(c => [mx(c.x), my(c.y)]);

          // Fill rotated quad
          fillQuad(cpts);

          // Compute arm length from edge size
          const edgeLen = Math.sqrt(
            (cpts[1][0] - cpts[0][0]) ** 2 + (cpts[1][1] - cpts[0][1]) ** 2
          );
          const armLen = options.cornerLength || Math.min(Math.max(8, edgeLen * 0.15), 24);

          if (markerStyle === 'rect') {
            ctx.lineWidth = lineWidth;
            ctx.strokeStyle = lineColor;
            ctx.beginPath();
            ctx.moveTo(cpts[0][0], cpts[0][1]);
            ctx.lineTo(cpts[1][0], cpts[1][1]);
            ctx.lineTo(cpts[2][0], cpts[2][1]);
            ctx.lineTo(cpts[3][0], cpts[3][1]);
            ctx.closePath();
            ctx.stroke();
          } else {
            drawQuadCorners(cpts, armLen);
          }

          // Bull's eye finder dot at center
          if (r.bullsEye && showQRDots) {
            const bcx = mx(r.bullsEye.x), bcy = my(r.bullsEye.y);
            const beR = r.bullsEye.radius * Math.min(scaleX, scaleY);
            // Outer square ring (bull's eye is concentric squares)
            // Rotate the square ring to match the code's angle
            const angle = r.angle || 0;
            ctx.save();
            ctx.translate(bcx, bcy);
            ctx.rotate(angle);
            const sqSize = beR * 1.2;
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth * 1.5;
            ctx.strokeRect(-sqSize / 2, -sqSize / 2, sqSize, sqSize);
            ctx.restore();
            // Center dot
            const dr = dotRadius * 1.8;
            drawFinderDot(bcx, bcy, dr);
          }

          // Rotated label at TL corner
          drawRotatedLabel('AZTEC', cpts);

        } else if (r.bounds) {
          // ── Fallback: axis-aligned bounds ──
          const bx = mx(r.bounds.x), by = my(r.bounds.y);
          const bw = r.bounds.w * scaleX, bh = r.bounds.h * scaleY;

          ctx.fillStyle = fillColor;
          ctx.fillRect(bx, by, bw, bh);

          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = lineColor;
          drawCorners(bx, by, bw, bh);

          // Bull's eye finder dot (like QR finder dots)
          if (r.bullsEye && showQRDots) {
            const bcx = mx(r.bullsEye.x), bcy = my(r.bullsEye.y);
            const beR = r.bullsEye.radius * Math.min(scaleX, scaleY);
            ctx.strokeStyle = lineColor;
            ctx.lineWidth = lineWidth * 1.5;
            const sqSize = beR * 1.2;
            ctx.strokeRect(bcx - sqSize / 2, bcy - sqSize / 2, sqSize, sqSize);
            const dr = dotRadius * 1.8;
            drawFinderDot(bcx, bcy, dr);
          }

          drawLabel('AZTEC', bx, by);
        }


      // ═══════════════════════════════════════════════════════
      // BARCODE (1D) & OTHER FORMATS — oriented or axis-aligned
      // ═══════════════════════════════════════════════════════
      } else if (r.corners && r.corners.length === 4 && markerStyle !== 'none') {
        // ── Oriented marker using rotated corners ──
        const cpts = r.corners.map(c => [mx(c.x), my(c.y)]);

        // Fill rotated quad
        fillQuad(cpts);

        // Compute arm length from edge size
        const edgeLen = Math.sqrt(
          (cpts[1][0] - cpts[0][0]) ** 2 + (cpts[1][1] - cpts[0][1]) ** 2
        );
        const armLen = options.cornerLength || Math.min(Math.max(8, edgeLen * 0.12), 24);

        if (markerStyle === 'rect') {
          ctx.lineWidth = lineWidth;
          ctx.strokeStyle = lineColor;
          ctx.beginPath();
          ctx.moveTo(cpts[0][0], cpts[0][1]);
          ctx.lineTo(cpts[1][0], cpts[1][1]);
          ctx.lineTo(cpts[2][0], cpts[2][1]);
          ctx.lineTo(cpts[3][0], cpts[3][1]);
          ctx.closePath();
          ctx.stroke();
        } else {
          drawQuadCorners(cpts, armLen);
        }

        // Rotated label
        let labelText = (r.format || '').toUpperCase();
        if (r.format === 'datamatrix') labelText = 'DATA MATRIX';
        drawRotatedLabel(labelText, cpts);

      } else if (r.bounds && markerStyle !== 'none') {
        // ── Fallback: axis-aligned bounds ──
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


