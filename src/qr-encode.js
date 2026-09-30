  // ════════════════════════════════════════════════════════════════════════
  // qr-encode.js — QR Code generation, rendering, and encoding engine
  // ════════════════════════════════════════════════════════════════════════

  constructor(data, ec = 'M', quietZone = 2, minVer = 1, maxVer = 40) {
    czQR._initMathTables();
    this._ecLevelChar = ec;
    this._quiet = Math.max(0, quietZone);
    this._text = data;
    this._errorCorrectionLevel = czQR._EC_INTERNAL[ec];
    this._typeNumber = 0;
    this._modules = null;
    this._moduleCount = 0;
    this._dataCache = null;
    this._dataList = [];
    this._detectedMode = 'Byte';
    this._bestMaskPattern = 0;

    this._moduleRadius = 0;
    this._moduleShape = 'square';
    this._finderStyle = null;
    this._renderSize = 400;
    this._renderFg = '#000000';
    this._renderBg = '#ffffff';
    this._renderQuality = 0.85;
    this._renderScalable = false;
    this._renderTitle = null;
    this._renderDesc = null;
    this._renderMargin = 2;
    this._logoSrc = null;
    this._logoOptions = { ratio: 0.2, padding: 6, radius: 15 };
    this._labelText = null;
    this._labelOptions = { size: 0.1, color: '#000000', fontFamily: 'Inter, Arial, sans-serif', strip: false };

    minVer = Math.max(1, minVer);
    maxVer = Math.min(40, maxVer);
    let success = false;
    for (let ver = minVer; ver <= maxVer; ver++) {
      try {
        this._typeNumber = ver;
        this._dataList = [];
        this._dataCache = null;
        this._modules = null;
        this._moduleCount = 0;
        this._detectedMode = this._detectMode(data);
        this._addData(data, this._detectedMode);
        this._make();
        success = true;
        break;
      } catch (e) { /* try next version */ }
    }
    if (!success) throw new Error(`Data too long for QR versions ${minVer}-${maxVer} with EC level ${ec}.`);
  }

  // ── Fluent API ──
  size(s) { this._renderSize = Math.max(10, s); return this; }
  colors(fg, bg = '#ffffff') { this._renderFg = fg; this._renderBg = bg; return this; }
  moduleRadius(r) { this._moduleRadius = Math.max(0, Math.min(0.5, r)); return this; }
  moduleShape(s) { this._moduleShape = s; return this; }
  finderStyle(outerColor = null, innerColor = null, outerRadius = null, innerRadius = null) {
    this._finderStyle = {
      outerColor, innerColor,
      outerRadius: outerRadius !== null ? Math.max(0, Math.min(0.5, outerRadius)) : null,
      innerRadius: innerRadius !== null ? Math.max(0, Math.min(0.5, innerRadius)) : null,
    };
    return this;
  }
  logo(src, ratio = 0.2, padding = 6, radius = 15) {
    this._logoSrc = src;
    if (src !== null) { this._labelText = null; this._logoOptions = { ratio, padding, radius }; }
    return this;
  }
  label(text, size = 0.1, color = '#000000', fontFamily = 'Inter, Arial, sans-serif', strip = false) {
    this._labelText = text;
    if (text !== null) { this._logoSrc = null; this._labelOptions = { size, color, fontFamily, strip }; }
    return this;
  }
  quality(q) { this._renderQuality = Math.max(0, Math.min(1, q / 100)); return this; }
  scalable(s = true) { this._renderScalable = s; return this; }
  accessibility(title, desc = null) { this._renderTitle = title; this._renderDesc = desc; return this; }
  margin(m) { this._renderMargin = Math.max(0, m); return this; }

  // ── Public Accessors ──
  isDark(row, col) {
    row -= this._quiet; col -= this._quiet;
    if (row < 0 || row >= this._moduleCount || col < 0 || col >= this._moduleCount) return false;
    return !!this._modules[row][col];
  }
  getModuleCount() { return this._moduleCount + 2 * this._quiet; }
  getRawModuleCount() { return this._moduleCount; }
  matrix() {
    const total = this.getModuleCount(), m = [];
    for (let r = 0; r < total; r++) { m[r] = []; for (let c = 0; c < total; c++) m[r][c] = this.isDark(r, c); }
    return m;
  }
  info() {
    const rsBlocks = this._getRSBlocks(this._typeNumber, this._errorCorrectionLevel);
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    const buffer = this._createBitBuffer();
    for (const data of this._dataList) {
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), this._typeNumber));
      data.write(buffer);
    }
    const dataBitsUsed = buffer.getLengthInBits();
    return {
      version: this._typeNumber, ecLevel: this._ecLevelChar, mode: this._detectedMode,
      moduleCount: this.getModuleCount(), rawModuleCount: this.getRawModuleCount(),
      maskPattern: this._bestMaskPattern,
      dataCapacityBits: totalDataCount * 8, dataUsedBits: dataBitsUsed,
      utilization: Math.round(dataBitsUsed / (totalDataCount * 8) * 10000) / 10000,
    };
  }

  // ── Render ──
  render(format = 'canvas', filename = null) {
    const size = this._renderSize, fg = this._renderFg, bg = this._renderBg;
    switch (format) {
      case 'canvas': return this._toCanvas(size, fg, bg);
      case 'png': return this._toCanvas(size, fg, bg).toDataURL('image/png');
      case 'webp': return this._toCanvas(size, fg, bg).toDataURL('image/webp', this._renderQuality);
      case 'svg': return this._renderSVG(size, fg, bg);
      case 'html': return this._toHTML(size, fg, bg);
      case 'ascii': return this._toASCII(this._renderMargin);
      case 'datauri': return this._toCanvas(size, fg, bg).toDataURL('image/png');
      case 'base64': { const d = this._toCanvas(size, fg, bg).toDataURL('image/png'); return d.replace(/^data:image\/png;base64,/, ''); }
      case 'imgtag': {
        const uri = this._toCanvas(size, fg, bg).toDataURL('image/png');
        let tag = `<img src="${uri}" width="${size}" height="${size}"`;
        if (this._renderTitle) tag += ` alt="${this._escHtml(this._renderTitle)}"`;
        return tag + '/>';
      }
      default: throw new Error(`Unsupported format: '${format}'`);
    }
  }

  /**
   * Async render — required when using logo on Canvas/PNG/WEBP formats.
   * Returns a Promise that resolves with the same output as render().
   * For SVG/HTML/ASCII (non-bitmap), it resolves immediately.
   * @param {string} format - 'canvas', 'png', 'webp', 'svg', 'html', 'ascii', 'datauri', 'base64', 'imgtag'
   * @returns {Promise<HTMLCanvasElement|string>}
   */
  async renderAsync(format = 'canvas') {
    const size = this._renderSize, fg = this._renderFg, bg = this._renderBg;
    // Non-canvas formats don't need async
    if (['svg', 'html', 'ascii'].includes(format)) return this.render(format);

    const canvas = await this._toCanvasAsync(size, fg, bg);
    switch (format) {
      case 'canvas': return canvas;
      case 'png': return canvas.toDataURL('image/png');
      case 'webp': return canvas.toDataURL('image/webp', this._renderQuality);
      case 'datauri': return canvas.toDataURL('image/png');
      case 'base64': return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
      case 'imgtag': {
        const uri = canvas.toDataURL('image/png');
        let tag = `<img src="${uri}" width="${size}" height="${size}"`;
        if (this._renderTitle) tag += ` alt="${this._escHtml(this._renderTitle)}"`;
        return tag + '/>';
      }
      default: throw new Error(`Unsupported format: '${format}'`);
    }
  }

  async download(filename = 'czQR.png', format = 'png') {
    const mime = format === 'webp' ? 'image/webp' : 'image/png';
    if (format === 'svg') {
      const svg = this._renderSVG(this._renderSize, this._renderFg, this._renderBg);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
      return;
    }
    const canvas = await this._toCanvasAsync(this._renderSize, this._renderFg, this._renderBg);
    canvas.toBlob(blob => {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    }, mime, format === 'webp' ? this._renderQuality : undefined);
  }

  /** Load an image from URL/dataURI — returns Promise<HTMLImageElement> */
  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  }

  /** Async canvas renderer — draws logo if set */
  async _toCanvasAsync(size, fg, bg) {
    const canvas = this._toCanvas(size, fg, bg);
    if (!this._logoSrc) return canvas;

    // Load logo and draw onto canvas
    const img = await this._loadImage(this._logoSrc);
    const ctx = canvas.getContext('2d');
    const opts = this._logoOptions;
    const ratio = Math.max(0.05, Math.min(0.4, opts.ratio));
    const logoSz = Math.floor(size * ratio);
    const pad = opts.padding;
    const bgSize = logoSz + pad * 2;
    const bgX = Math.floor((size - bgSize) / 2);
    const bgY = Math.floor((size - bgSize) / 2);
    const logoX = bgX + pad;
    const logoY = bgY + pad;
    const rad = Math.min(opts.radius, Math.floor(logoSz / 2));

    // Draw background behind logo
    const logoBg = bg === 'transparent' ? '#ffffff' : bg;
    ctx.fillStyle = logoBg;
    if (rad > 0) {
      this._fillRoundedRect(ctx, bgX, bgY, bgSize, bgSize, Math.min(rad, Math.floor(bgSize / 2)));
    } else {
      ctx.fillRect(bgX, bgY, bgSize, bgSize);
    }

    // Clip logo with rounded corners
    if (rad > 0) {
      ctx.save();
      ctx.beginPath();
      const r = Math.min(rad, Math.floor(logoSz / 2));
      ctx.moveTo(logoX + r, logoY);
      ctx.arcTo(logoX + logoSz, logoY, logoX + logoSz, logoY + logoSz, r);
      ctx.arcTo(logoX + logoSz, logoY + logoSz, logoX, logoY + logoSz, r);
      ctx.arcTo(logoX, logoY + logoSz, logoX, logoY, r);
      ctx.arcTo(logoX, logoY, logoX + logoSz, logoY, r);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, logoX, logoY, logoSz, logoSz);
      ctx.restore();
    } else {
      ctx.drawImage(img, logoX, logoY, logoSz, logoSz);
    }

    return canvas;
  }

  // ── Canvas Renderer ──
  _toCanvas(size, fg, bg) {
    const total = this.getModuleCount();
    const scale = (this._moduleShape === 'dot' || this._moduleShape === 'diamond') ? 8 : 4;
    const rSize = size * scale;
    const rModuleSize = rSize / total;
    const rOffset = (rSize - rModuleSize * total) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = rSize; canvas.height = rSize;
    const ctx = canvas.getContext('2d');

    if (bg === 'transparent') {
      ctx.clearRect(0, 0, rSize, rSize);
    } else {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, rSize, rSize);
    }

    this._drawModulesCanvas(ctx, total, rModuleSize, rOffset, fg, bg);

    if (this._labelText) {
      this._drawLabelCanvas(ctx, rSize, fg, bg, scale);
    }

    if (scale > 1) {
      const final = document.createElement('canvas');
      final.width = size; final.height = size;
      const fCtx = final.getContext('2d');
      fCtx.imageSmoothingEnabled = true;
      fCtx.imageSmoothingQuality = 'high';
      fCtx.drawImage(canvas, 0, 0, rSize, rSize, 0, 0, size, size);
      return final;
    }
    return canvas;
  }

  _drawModulesCanvas(ctx, total, ms, offset, fg, bg) {
    const hasFS = !!this._finderStyle;
    const shape = this._moduleShape;

    if (shape === 'square' && this._moduleRadius <= 0 && !hasFS) {
      ctx.fillStyle = fg;
      for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
        if (this.isDark(r, c)) ctx.fillRect(offset + c * ms, offset + r * ms, ms, ms);
      }
      return;
    }

    if (shape === 'dot' || shape === 'diamond') {
      const dotR = ms * 0.40, half = ms / 2;
      ctx.fillStyle = fg;
      ctx.beginPath();
      for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
        if (hasFS) {
          const rr = r - this._quiet, rc = c - this._quiet;
          if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
        }
        if (!this.isDark(r, c)) continue;
        const cx = offset + c * ms + half, cy = offset + r * ms + half;
        if (shape === 'dot') {
          ctx.moveTo(cx + dotR, cy);
          ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
        } else {
          ctx.moveTo(cx, cy - half); ctx.lineTo(cx + half, cy);
          ctx.lineTo(cx, cy + half); ctx.lineTo(cx - half, cy); ctx.closePath();
        }
      }
      ctx.fill();
      if (hasFS) this._drawFinderPatternsCanvas(ctx, ms, offset, fg, bg);
      return;
    }

    // Square with radius
    const rad = this._moduleRadius > 0 ? Math.max(1, Math.round(ms * this._moduleRadius)) : 0;
    for (let r = 0; r < total; r++) for (let c = 0; c < total; c++) {
      if (hasFS) {
        const rr = r - this._quiet, rc = c - this._quiet;
        if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
      }
      const x = offset + c * ms, y = offset + r * ms;
      const dark = this.isDark(r, c);
      if (dark) {
        if (rad <= 0) { ctx.fillStyle = fg; ctx.fillRect(x, y, ms, ms); }
        else {
          const dn = this.isDark(r - 1, c), ds = this.isDark(r + 1, c), dw = this.isDark(r, c - 1), de = this.isDark(r, c + 1);
          const nw = !dn && !dw, ne = !dn && !de, se = !ds && !de, sw = !ds && !dw;
          ctx.fillStyle = fg;
          this._roundRect(ctx, x, y, ms, ms, { tl: nw ? rad : 0, tr: ne ? rad : 0, br: se ? rad : 0, bl: sw ? rad : 0 });
          ctx.fill();
        }
      } else if (rad > 0) {
        const dn = this.isDark(r - 1, c), ds = this.isDark(r + 1, c), dw = this.isDark(r, c - 1), de = this.isDark(r, c + 1);
        const dnw = this.isDark(r - 1, c - 1), dne = this.isDark(r - 1, c + 1), dse = this.isDark(r + 1, c + 1), dsw = this.isDark(r + 1, c - 1);
        ctx.fillStyle = fg;
        if (dn && dw && dnw) this._fillInnerCorner(ctx, x, y, rad, 'nw');
        if (dn && de && dne) this._fillInnerCorner(ctx, x + ms, y, rad, 'ne');
        if (ds && de && dse) this._fillInnerCorner(ctx, x + ms, y + ms, rad, 'se');
        if (ds && dw && dsw) this._fillInnerCorner(ctx, x, y + ms, rad, 'sw');
      }
    }
    if (hasFS) this._drawFinderPatternsCanvas(ctx, ms, offset, fg, bg);
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    if (r.tr) ctx.arcTo(x + w, y, x + w, y + r.tr, r.tr); else ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + h - r.br);
    if (r.br) ctx.arcTo(x + w, y + h, x + w - r.br, y + h, r.br); else ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + r.bl, y + h);
    if (r.bl) ctx.arcTo(x, y + h, x, y + h - r.bl, r.bl); else ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r.tl);
    if (r.tl) ctx.arcTo(x, y, x + r.tl, y, r.tl); else ctx.lineTo(x, y);
    ctx.closePath();
  }

  _fillInnerCorner(ctx, cx, cy, rad, corner) {
    ctx.beginPath();
    switch (corner) {
      case 'nw': ctx.moveTo(cx, cy); ctx.lineTo(cx + rad, cy); ctx.arcTo(cx, cy, cx, cy + rad, rad); break;
      case 'ne': ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + rad); ctx.arcTo(cx, cy, cx - rad, cy, rad); break;
      case 'se': ctx.moveTo(cx, cy); ctx.lineTo(cx - rad, cy); ctx.arcTo(cx, cy, cx, cy - rad, rad); break;
      case 'sw': ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - rad); ctx.arcTo(cx, cy, cx + rad, cy, rad); break;
    }
    ctx.closePath(); ctx.fill();
  }

  _drawFinderPatternsCanvas(ctx, ms, offset, fg, bg) {
    let outerColor = fg, innerColor = fg;
    if (this._finderStyle.outerColor) outerColor = this._finderStyle.outerColor;
    if (this._finderStyle.innerColor) innerColor = this._finderStyle.innerColor;
    const outerRatio = this._finderStyle.outerRadius != null ? this._finderStyle.outerRadius : this._moduleRadius;
    const innerRatio = this._finderStyle.innerRadius != null ? this._finderStyle.innerRadius : this._moduleRadius;
    const outerRad = Math.round(7 * ms * outerRatio);
    const gapRad = Math.round(5 * ms * outerRatio);
    const innerRad = Math.round(3 * ms * innerRatio);
    const q = this._quiet, rawMC = this._moduleCount;
    const origins = [[q, q], [q, q + rawMC - 7], [q + rawMC - 7, q]];
    for (const [gr, gc] of origins) {
      const ox = offset + gc * ms, oy = offset + gr * ms;
      ctx.fillStyle = outerColor;
      this._fillRoundedRect(ctx, ox, oy, 7 * ms, 7 * ms, outerRad);
      ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg;
      this._fillRoundedRect(ctx, ox + ms, oy + ms, 5 * ms, 5 * ms, gapRad);
      ctx.fillStyle = innerColor;
      this._fillRoundedRect(ctx, ox + 2 * ms, oy + 2 * ms, 3 * ms, 3 * ms, innerRad);
    }
  }

  _fillRoundedRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) { ctx.fillRect(x, y, w, h); return; }
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath(); ctx.fill();
  }

  _drawLabelCanvas(ctx, rSize, fg, bg, scale) {
    const opts = this._labelOptions;
    const labelSize = Math.max(0.05, Math.min(0.3, opts.size));
    const fontSize = Math.round(rSize * labelSize);
    const padding = Math.round(fontSize * 0.4);
    ctx.font = `bold ${fontSize}px ${opts.fontFamily}`;
    const tm = ctx.measureText(this._labelText);
    const textW = Math.ceil(tm.width);
    const textH = fontSize;
    const textX = Math.round((rSize - textW) / 2);
    const textY = Math.round(rSize / 2 + fontSize * 0.35);
    let clearLeft = textX - padding, clearRight = textX + textW + padding;
    const clearTop = textY - textH - padding, clearBottom = textY + padding;
    if (opts.strip) { clearLeft = 0; clearRight = rSize; }
    ctx.fillStyle = bg === 'transparent' ? '#ffffff' : bg;
    ctx.fillRect(clearLeft, clearTop, clearRight - clearLeft, clearBottom - clearTop);
    ctx.fillStyle = opts.color;
    ctx.fillText(this._labelText, textX, textY);
  }

  _getFinderRole(row, col) {
    const mc = this._moduleCount;
    const origins = [[0, 0], [0, mc - 7], [mc - 7, 0]];
    for (const [or_, oc] of origins) {
      const lr = row - or_, lc = col - oc;
      if (lr >= 0 && lr <= 6 && lc >= 0 && lc <= 6) {
        return (lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4) ? 'inner' : 'outer';
      }
    }
    return null;
  }

  // ── SVG Renderer ──
  _renderSVG(size, fg, bg) {
    if (this._logoSrc) return this._toSVGWithLogo(size, fg, bg);
    if (this._labelText) return this._toSVGWithLabel(size, fg, bg);
    return this._toSVG(size, fg, bg, this._renderScalable, this._renderTitle, this._renderDesc);
  }

  _toSVG(size, fg, bg, scalable = false, title = null, desc = null) {
    const total = this.getModuleCount(), ms = size / total;
    let svg = '<svg version="1.1" xmlns="http://www.w3.org/2000/svg"';
    if (!scalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (title) ariaIds.push('czQR-title');
    if (desc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += '>';
    if (title) svg += `<title id="czQR-title">${this._escHtml(title)}</title>`;
    if (desc) svg += `<description id="czQR-description">${this._escHtml(desc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    svg += '</svg>';
    return svg;
  }

  _toSVGWithLabel(size, fg, bg) {
    const opts = this._labelOptions;
    const total = this.getModuleCount(), ms = size / total;
    const labelSize = Math.max(0.05, Math.min(0.3, opts.size));
    const fontSize = size * labelSize, padding = fontSize * 0.5;
    const estTextW = this._labelText.length * fontSize * 0.6;
    const boxW = opts.strip ? size : estTextW + padding * 2;
    const boxH = fontSize + padding * 2;
    const boxX = (size - boxW) / 2, boxY = (size - boxH) / 2;
    const textX = size / 2, textY = size / 2 + fontSize * 0.35;
    let svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg"`;
    if (!this._renderScalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (this._renderTitle) ariaIds.push('czQR-title');
    if (this._renderDesc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += `>`;
    if (this._renderTitle) svg += `<title id="czQR-title">${this._escHtml(this._renderTitle)}</title>`;
    if (this._renderDesc) svg += `<description id="czQR-description">${this._escHtml(this._renderDesc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    const labelBg = bg === 'transparent' ? 'white' : this._escHtml(bg);
    svg += `<rect x="${boxX}" y="${boxY}" width="${boxW}" height="${boxH}" fill="${labelBg}" rx="4" ry="4"/>`;
    svg += `<text x="${textX}" y="${textY}" font-family="${this._escHtml(opts.fontFamily)}" font-size="${fontSize}" font-weight="bold" fill="${this._escHtml(opts.color)}" text-anchor="middle">${this._escHtml(this._labelText)}</text>`;
    svg += '</svg>';
    return svg;
  }

  _toSVGWithLogo(size, fg, bg) {
    const opts = this._logoOptions;
    const total = this.getModuleCount(), ms = size / total;
    const ratio = Math.max(0.05, Math.min(0.4, opts.ratio));
    const logoSz = Math.floor(size * ratio);
    const logoBgSize = logoSz + opts.padding * 2;
    const logoBgX = (size - logoBgSize) / 2, logoBgY = (size - logoBgSize) / 2;
    const logoX = logoBgX + opts.padding, logoY = logoBgY + opts.padding;
    let svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`;
    if (!this._renderScalable) svg += ` width="${size}px" height="${size}px"`;
    svg += ` viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMinYMin meet"`;
    const ariaIds = [];
    if (this._renderTitle) ariaIds.push('czQR-title');
    if (this._renderDesc) ariaIds.push('czQR-description');
    if (ariaIds.length) svg += ` role="img" aria-labelledby="${ariaIds.join(' ')}"`;
    svg += `>`;
    if (this._renderTitle) svg += `<title id="czQR-title">${this._escHtml(this._renderTitle)}</title>`;
    if (this._renderDesc) svg += `<description id="czQR-description">${this._escHtml(this._renderDesc)}</description>`;
    if (bg !== 'transparent') svg += `<rect width="100%" height="100%" fill="${this._escHtml(bg)}"/>`;
    svg += this._buildSVGModules(total, ms, 0, fg);
    const logoBg = bg === 'transparent' ? 'white' : this._escHtml(bg);
    const bgRad = Math.min(opts.radius, Math.floor(logoBgSize / 2));
    svg += `<rect x="${logoBgX}" y="${logoBgY}" width="${logoBgSize}" height="${logoBgSize}" fill="${logoBg}" rx="${bgRad}" ry="${bgRad}"/>`;
    const clipRad = Math.min(opts.radius, Math.floor(logoSz / 2));
    if (opts.radius > 0) {
      svg += `<defs><clipPath id="logoClip"><rect x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" rx="${clipRad}" ry="${clipRad}"/></clipPath></defs>`;
      svg += `<image x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" href="${this._logoSrc}" preserveAspectRatio="xMidYMid meet" clip-path="url(#logoClip)"/>`;
    } else {
      svg += `<image x="${logoX}" y="${logoY}" width="${logoSz}" height="${logoSz}" href="${this._logoSrc}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    svg += '</svg>';
    return svg;
  }

  _buildSVGModules(total, ms, offset, foreground) {
    const fg = this._escHtml(foreground);
    const hasFS = !!this._finderStyle;
    const shape = this._moduleShape;
    const finderOuterFg = hasFS && this._finderStyle.outerColor ? this._escHtml(this._finderStyle.outerColor) : fg;
    const finderInnerFg = hasFS && this._finderStyle.innerColor ? this._escHtml(this._finderStyle.innerColor) : fg;
    const defaultRad = +(ms * this._moduleRadius).toFixed(4);

    if (shape === 'square' && this._moduleRadius <= 0 && !hasFS) {
      const r = +ms.toFixed(4);
      let d = '';
      for (let row = 0; row < total; row++) {
        const mr = +(row * ms + offset).toFixed(4);
        for (let col = 0; col < total; col++) {
          if (this.isDark(row, col)) {
            const mc = +(col * ms + offset).toFixed(4);
            d += `M${mc},${mr}l${r},0 0,${r} -${r},0 0,-${r}z `;
          }
        }
      }
      return `<path d="${d}" fill="${fg}"/>`;
    }

    if (shape === 'dot' || shape === 'diamond') {
      let d = '';
      const dotR = +(ms * 0.40).toFixed(4), halfMs = +(ms / 2).toFixed(4);
      for (let row = 0; row < total; row++) for (let col = 0; col < total; col++) {
        if (hasFS) {
          const rr = row - this._quiet, rc = col - this._quiet;
          if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
        }
        if (!this.isDark(row, col)) continue;
        const cx = +(col * ms + offset + halfMs).toFixed(4);
        const cy = +(row * ms + offset + halfMs).toFixed(4);
        if (shape === 'dot') {
          const d2 = +(dotR * 2).toFixed(4);
          d += `M${+(cx - dotR).toFixed(4)},${cy}a${dotR},${dotR} 0 1,0 ${d2},0a${dotR},${dotR} 0 1,0 -${d2},0Z `;
        } else {
          d += `M${cx},${+(cy - halfMs).toFixed(4)}L${+(cx + halfMs).toFixed(4)},${cy}L${cx},${+(cy + halfMs).toFixed(4)}L${+(cx - halfMs).toFixed(4)},${cy}Z `;
        }
      }
      let svg = '';
      if (d) svg += `<path d="${d}" fill="${fg}"/>`;
      if (hasFS) svg += this._buildSVGFinderRects(total, ms, offset, fg, finderOuterFg, finderInnerFg);
      return svg;
    }

    // Square with radius
    let d = '';
    const rad = defaultRad;
    for (let row = 0; row < total; row++) for (let col = 0; col < total; col++) {
      if (hasFS) {
        const rr = row - this._quiet, rc = col - this._quiet;
        if (rr >= 0 && rc >= 0 && this._getFinderRole(rr, rc) !== null) continue;
      }
      const l = +(col * ms + offset).toFixed(4), t = +(row * ms + offset).toFixed(4);
      const r = +(l + ms).toFixed(4), b = +(t + ms).toFixed(4);
      const dc = this.isDark(row, col);
      if (dc) {
        if (rad <= 0) {
          d += `M${l},${t}l${+ms.toFixed(4)},0 0,${+ms.toFixed(4)} -${+ms.toFixed(4)},0 0,-${+ms.toFixed(4)}z `;
        } else {
          const dn = this.isDark(row - 1, col), ds = this.isDark(row + 1, col), dw = this.isDark(row, col - 1), de = this.isDark(row, col + 1);
          const nw = !dn && !dw, ne = !dn && !de, se = !ds && !de, sw = !ds && !dw;
          d += nw ? `M${l + rad},${t}` : `M${l},${t}`;
          d += ne ? `L${r - rad},${t}A${rad},${rad} 0 0 1 ${r},${t + rad}` : `L${r},${t}`;
          d += se ? `L${r},${b - rad}A${rad},${rad} 0 0 1 ${r - rad},${b}` : `L${r},${b}`;
          d += sw ? `L${l + rad},${b}A${rad},${rad} 0 0 1 ${l},${b - rad}` : `L${l},${b}`;
          d += nw ? `L${l},${t + rad}A${rad},${rad} 0 0 1 ${l + rad},${t}` : `L${l},${t}`;
          d += 'Z ';
        }
      } else if (rad > 0) {
        const dn = this.isDark(row - 1, col), ds = this.isDark(row + 1, col), dw = this.isDark(row, col - 1), de = this.isDark(row, col + 1);
        const dnw = this.isDark(row - 1, col - 1), dne = this.isDark(row - 1, col + 1), dse = this.isDark(row + 1, col + 1), dsw = this.isDark(row + 1, col - 1);
        if (dn && dw && dnw) d += `M${l},${t}L${l + rad},${t}A${rad},${rad} 0 0 0 ${l},${t + rad}Z `;
        if (dn && de && dne) d += `M${r},${t}L${r},${t + rad}A${rad},${rad} 0 0 0 ${r - rad},${t}Z `;
        if (ds && de && dse) d += `M${r},${b}L${r - rad},${b}A${rad},${rad} 0 0 0 ${r},${b - rad}Z `;
        if (ds && dw && dsw) d += `M${l},${b}L${l},${b - rad}A${rad},${rad} 0 0 0 ${l + rad},${b}Z `;
      }
    }
    let svg = '';
    if (d) svg += `<path d="${d}" fill="${fg}"/>`;
    if (hasFS) svg += this._buildSVGFinderRects(total, ms, offset, fg, finderOuterFg, finderInnerFg);
    return svg;
  }

  _buildSVGFinderRects(total, ms, offset, fg, outerFg, innerFg) {
    const outerRatio = this._finderStyle.outerRadius != null ? this._finderStyle.outerRadius : this._moduleRadius;
    const innerRatio = this._finderStyle.innerRadius != null ? this._finderStyle.innerRadius : this._moduleRadius;
    const q = this._quiet, rawMC = this._moduleCount;
    const origins = [[q, q], [q, q + rawMC - 7], [q + rawMC - 7, q]];
    const outerRx = +(7 * ms * outerRatio).toFixed(4);
    const gapRx = +(5 * ms * outerRatio).toFixed(4);
    const innerRx = +(3 * ms * innerRatio).toFixed(4);
    const bgFill = this._escHtml(this._renderBg === 'transparent' ? '#ffffff' : this._renderBg);
    let svg = '';
    for (const [gr, gc] of origins) {
      const ox = +(gc * ms + offset).toFixed(4), oy = +(gr * ms + offset).toFixed(4);
      const outerW = +(7 * ms).toFixed(4), gapW = +(5 * ms).toFixed(4), innerW = +(3 * ms).toFixed(4);
      const gx = +(ox + ms).toFixed(4), gy = +(oy + ms).toFixed(4);
      const ix = +(ox + 2 * ms).toFixed(4), iy = +(oy + 2 * ms).toFixed(4);
      svg += `<rect x="${ox}" y="${oy}" width="${outerW}" height="${outerW}"`;
      if (outerRx > 0) svg += ` rx="${outerRx}" ry="${outerRx}"`;
      svg += ` fill="${outerFg}"/>`;
      svg += `<rect x="${gx}" y="${gy}" width="${gapW}" height="${gapW}"`;
      if (gapRx > 0) svg += ` rx="${gapRx}" ry="${gapRx}"`;
      svg += ` fill="${bgFill}"/>`;
      svg += `<rect x="${ix}" y="${iy}" width="${innerW}" height="${innerW}"`;
      if (innerRx > 0) svg += ` rx="${innerRx}" ry="${innerRx}"`;
      svg += ` fill="${innerFg}"/>`;
    }
    return svg;
  }

  // ── HTML Table Renderer ──
  _toHTML(size, fg, bg) {
    const total = this.getModuleCount(), ms = Math.floor(size / total);
    let html = '<table style="border-width:0;border-style:none;border-collapse:collapse;padding:0;margin:0;"><tbody>';
    for (let r = 0; r < total; r++) {
      html += '<tr>';
      for (let c = 0; c < total; c++) {
        const color = this.isDark(r, c) ? fg : bg;
        html += `<td style="border-width:0;border-style:none;border-collapse:collapse;padding:0;margin:0;width:${ms}px;height:${ms}px;background-color:${this._escHtml(color)};"/>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    return html;
  }

  // ── ASCII Renderer ──
  _toASCII(margin = 2) {
    const total = this.getModuleCount(), sz = total + margin * 2;
    const min = margin, max = sz - margin;
    const blocks = { '██': '█', '█ ': '▀', ' █': '▄', '  ': ' ' };
    const blocksLast = { '██': '▀', '█ ': '▀', ' █': ' ', '  ': ' ' };
    let ascii = '';
    for (let y = 0; y < sz; y += 2) {
      const r1 = y - min, r2 = y + 1 - min;
      for (let x = 0; x < sz; x++) {
        let p = '█';
        const cx = x - min;
        if (min <= x && x < max && min <= y && y < max && this.isDark(r1, cx)) p = ' ';
        if (min <= x && x < max && min <= (y + 1) && (y + 1) < max && this.isDark(r2, cx)) p += ' '; else p += '█';
        ascii += (margin < 1 && y + 1 >= max) ? blocksLast[p] : blocks[p];
      }
      ascii += '\n';
    }
    if (sz % 2 && margin > 0) return ascii.slice(0, ascii.length - sz - 1) + '▀'.repeat(sz);
    return ascii.trimEnd();
  }

  // ── QR Core: Mode Detection ──
  _detectMode(data) {
    if (/^\d+$/.test(data)) return 'Numeric';
    if (/^[0-9A-Z $%*+\-./:]+$/.test(data)) return 'Alphanumeric';
    return 'Byte';
  }

  _addData(data, mode) {
    switch (mode) {
      case 'Numeric': this._dataList.push(this._createQRNumber(data)); break;
      case 'Alphanumeric': this._dataList.push(this._createQRAlphaNum(data)); break;
      case 'Byte': this._dataList.push(this._createQR8BitByte(data)); break;
      default: throw new Error(`Unsupported mode: ${mode}`);
    }
    this._dataCache = null;
  }

  _createQR8BitByte(data) {
    const bytes = this._stringToUTF8Bytes(data);
    return {
      getMode: () => czQR.MODE_8BIT_BYTE,
      getLength: () => bytes.length,
      write: (buffer) => { for (let i = 0; i < bytes.length; i++) buffer.put(bytes[i], 8); },
    };
  }

  _createQRNumber(data) {
    return {
      getMode: () => czQR.MODE_NUMBER,
      getLength: () => data.length,
      write: (buffer) => {
        let i = 0;
        while (i + 2 < data.length) { buffer.put(parseInt(data.substring(i, i + 3), 10), 10); i += 3; }
        if (i < data.length) {
          const rem = data.length - i;
          if (rem === 1) buffer.put(parseInt(data.substring(i, i + 1), 10), 4);
          else if (rem === 2) buffer.put(parseInt(data.substring(i, i + 2), 10), 7);
        }
      },
    };
  }

  _createQRAlphaNum(data) {
    const getCode = (c) => {
      if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
      if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 55;
      const map = { ' ': 36, '$': 37, '%': 38, '*': 39, '+': 40, '-': 41, '.': 42, '/': 43, ':': 44 };
      if (map[c] !== undefined) return map[c];
      throw new Error(`Illegal alphanumeric char: ${c}`);
    };
    return {
      getMode: () => czQR.MODE_ALPHA_NUM,
      getLength: () => data.length,
      write: (buffer) => {
        let i = 0;
        while (i + 1 < data.length) { buffer.put(getCode(data[i]) * 45 + getCode(data[i + 1]), 11); i += 2; }
        if (i < data.length) buffer.put(getCode(data[i]), 6);
      },
    };
  }

  _stringToUTF8Bytes(str) {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(str));
  }

  // ── QR Core: Make ──
  _make() {
    if (this._typeNumber < 1) {
      let tn = 1;
      for (; tn < 40; tn++) {
        const rsBlocks = this._getRSBlocks(tn, this._errorCorrectionLevel);
        const buffer = this._createBitBuffer();
        for (const data of this._dataList) {
          buffer.put(data.getMode(), 4);
          buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), tn));
          data.write(buffer);
        }
        let totalDataCount = 0;
        for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
        if (buffer.getLengthInBits() <= totalDataCount * 8) break;
      }
      this._typeNumber = tn;
    }
    this._bestMaskPattern = this._getBestMaskPattern();
    this._makeImpl(false, this._bestMaskPattern);
  }

  _makeImpl(test, maskPattern) {
    this._moduleCount = this._typeNumber * 4 + 17;
    this._modules = [];
    for (let r = 0; r < this._moduleCount; r++) this._modules[r] = new Array(this._moduleCount).fill(null);
    this._setupPositionProbePattern(0, 0);
    this._setupPositionProbePattern(this._moduleCount - 7, 0);
    this._setupPositionProbePattern(0, this._moduleCount - 7);
    this._setupPositionAdjustPattern();
    this._setupTimingPattern();
    this._setupTypeInfo(test, maskPattern);
    if (this._typeNumber >= 7) this._setupTypeNumber(test);
    if (this._dataCache === null) this._dataCache = this._createData(this._typeNumber, this._errorCorrectionLevel, this._dataList);
    this._mapData(this._dataCache, maskPattern);
  }

  _setupPositionProbePattern(row, col) {
    for (let r = -1; r <= 7; r++) {
      if (row + r <= -1 || this._moduleCount <= row + r) continue;
      for (let c = -1; c <= 7; c++) {
        if (col + c <= -1 || this._moduleCount <= col + c) continue;
        this._modules[row + r][col + c] =
          (0 <= r && r <= 6 && (c === 0 || c === 6)) ||
          (0 <= c && c <= 6 && (r === 0 || r === 6)) ||
          (2 <= r && r <= 4 && 2 <= c && c <= 4);
      }
    }
  }

  _getBestMaskPattern() {
    let minLost = 0, pattern = 0;
    for (let i = 0; i < 8; i++) {
      this._makeImpl(true, i);
      const lost = this._getLostPoint();
      if (i === 0 || minLost > lost) { minLost = lost; pattern = i; }
    }
    return pattern;
  }

  _setupTimingPattern() {
    for (let r = 8; r < this._moduleCount - 8; r++) { if (this._modules[r][6] !== null) continue; this._modules[r][6] = r % 2 === 0; }
    for (let c = 8; c < this._moduleCount - 8; c++) { if (this._modules[6][c] !== null) continue; this._modules[6][c] = c % 2 === 0; }
  }

  _setupPositionAdjustPattern() {
    const pos = czQR._PATTERN_POSITION_TABLE[this._typeNumber - 1];
    for (let i = 0; i < pos.length; i++) for (let j = 0; j < pos.length; j++) {
      const row = pos[i], col = pos[j];
      if (this._modules[row][col] !== null) continue;
      for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) {
        this._modules[row + r][col + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
      }
    }
  }

  _setupTypeNumber(test) {
    const bits = this._getBCHTypeNumber(this._typeNumber);
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      this._modules[Math.floor(i / 3)][i % 3 + this._moduleCount - 8 - 3] = mod;
    }
    for (let i = 0; i < 18; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      this._modules[i % 3 + this._moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
    }
  }

  _setupTypeInfo(test, maskPattern) {
    const data = (this._errorCorrectionLevel << 3) | maskPattern;
    const bits = this._getBCHTypeInfo(data);
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      if (i < 6) this._modules[i][8] = mod;
      else if (i < 8) this._modules[i + 1][8] = mod;
      else this._modules[this._moduleCount - 15 + i][8] = mod;
    }
    for (let i = 0; i < 15; i++) {
      const mod = !test && ((bits >>> i) & 1) === 1;
      if (i < 8) this._modules[8][this._moduleCount - i - 1] = mod;
      else if (i < 9) this._modules[8][15 - i - 1 + 1] = mod;
      else this._modules[8][15 - i - 1] = mod;
    }
    this._modules[this._moduleCount - 8][8] = !test;
  }

  _mapData(data, maskPattern) {
    let inc = -1, row = this._moduleCount - 1, bitIndex = 7, byteIndex = 0;
    for (let col = this._moduleCount - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++) {
          if (this._modules[row][col - c] === null) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            if (this._getMaskValue(maskPattern, row, col - c)) dark = !dark;
            this._modules[row][col - c] = dark;
            bitIndex--;
            if (bitIndex === -1) { byteIndex++; bitIndex = 7; }
          }
        }
        row += inc;
        if (row < 0 || this._moduleCount <= row) { row -= inc; inc = -inc; break; }
      }
    }
  }

  // ── QR Core: Data Encoding ──
  _createData(typeNumber, ecLevel, dataList) {
    const PAD0 = 0xEC, PAD1 = 0x11;
    const rsBlocks = this._getRSBlocks(typeNumber, ecLevel);
    const buffer = this._createBitBuffer();
    for (const data of dataList) {
      buffer.put(data.getMode(), 4);
      buffer.put(data.getLength(), this._getLengthInBits(data.getMode(), typeNumber));
      data.write(buffer);
    }
    let totalDataCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
    if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error(`Code length overflow. (${buffer.getLengthInBits()}>${totalDataCount * 8})`);
    if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(false);
    while (true) {
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD0, 8);
      if (buffer.getLengthInBits() >= totalDataCount * 8) break;
      buffer.put(PAD1, 8);
    }
    return this._createBytes(buffer, rsBlocks);
  }

  _createBytes(buffer, rsBlocks) {
    let offset = 0, maxDcCount = 0, maxEcCount = 0;
    const dcdata = [], ecdata = [];
    for (let r = 0; r < rsBlocks.length; r++) {
      const dcCount = rsBlocks[r].dataCount, ecCount = rsBlocks[r].totalCount - dcCount;
      maxDcCount = Math.max(maxDcCount, dcCount);
      maxEcCount = Math.max(maxEcCount, ecCount);
      dcdata[r] = [];
      const bufData = buffer.getBuffer();
      for (let i = 0; i < dcCount; i++) dcdata[r][i] = 0xff & bufData[i + offset];
      offset += dcCount;
      const rsPoly = this._getErrorCorrectPolynomial(ecCount);
      const rawPoly = this._createPolynomial(dcdata[r], rsPoly.getLength() - 1);
      const modPoly = rawPoly.mod(rsPoly);
      ecdata[r] = [];
      const ecLen = rsPoly.getLength() - 1;
      for (let i = 0; i < ecLen; i++) {
        const modIndex = i + modPoly.getLength() - ecLen;
        ecdata[r][i] = modIndex >= 0 ? modPoly.getAt(modIndex) : 0;
      }
    }
    let totalCodeCount = 0;
    for (let i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
    const data = new Array(totalCodeCount).fill(0);
    let index = 0;
    for (let i = 0; i < maxDcCount; i++) for (let r = 0; r < rsBlocks.length; r++) {
      if (i < dcdata[r].length) data[index++] = dcdata[r][i];
    }
    for (let i = 0; i < maxEcCount; i++) for (let r = 0; r < rsBlocks.length; r++) {
      if (i < ecdata[r].length) data[index++] = ecdata[r][i];
    }
    return data;
  }

  // ── RS Blocks ──
  _getRSBlocks(typeNumber, ecLevel) {
    const rsBlock = this._getRsBlockTable(typeNumber, ecLevel);
    if (!rsBlock) throw new Error(`Bad RS block @ typeNumber:${typeNumber}/ecLevel:${ecLevel}`);
    const length = rsBlock.length / 3, list = [];
    for (let i = 0; i < length; i++) {
      const count = rsBlock[i * 3], totalCount = rsBlock[i * 3 + 1], dataCount = rsBlock[i * 3 + 2];
      for (let j = 0; j < count; j++) list.push({ totalCount, dataCount });
    }
    return list;
  }

  _getRsBlockTable(typeNumber, ecLevel) {
    switch (ecLevel) {
      case 1: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
      case 0: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
      case 3: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
      case 2: return czQR._RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
      default: return null;
    }
  }

  // ── Bit Buffer ──
  _createBitBuffer() {
    const buf = [], state = { length: 0 };
    return {
      getBuffer: () => buf,
      getAt: (index) => ((buf[Math.floor(index / 8)] >>> (7 - index % 8)) & 1) === 1,
      put: (num, length) => {
        for (let i = 0; i < length; i++) {
          const bit = ((num >>> (length - i - 1)) & 1) === 1;
          const bufIndex = Math.floor(state.length / 8);
          if (buf.length <= bufIndex) buf.push(0);
          if (bit) buf[bufIndex] |= (0x80 >>> (state.length % 8));
          state.length++;
        }
      },
      getLengthInBits: () => state.length,
      putBit: (bit) => {
        const bufIndex = Math.floor(state.length / 8);
        if (buf.length <= bufIndex) buf.push(0);
        if (bit) buf[bufIndex] |= (0x80 >>> (state.length % 8));
        state.length++;
      },
    };
  }

  // ── Polynomial ──
  _createPolynomial(num, shift) {
    let offset = 0;
    while (offset < num.length && num[offset] === 0) offset++;
    const coefficients = [];
    for (let i = 0; i < num.length - offset; i++) coefficients[i] = num[i + offset];
    for (let i = 0; i < shift; i++) coefficients.push(0);
    const self = {
      getAt: (index) => coefficients[index],
      getLength: () => coefficients.length,
      multiply: (e) => {
        const num2 = new Array(self.getLength() + e.getLength() - 1).fill(0);
        for (let i = 0; i < self.getLength(); i++) for (let j = 0; j < e.getLength(); j++) {
          num2[i + j] ^= czQR._gexp(czQR._glog(self.getAt(i)) + czQR._glog(e.getAt(j)));
        }
        return this._createPolynomial(num2, 0);
      },
      mod: (e) => {
        if (self.getLength() - e.getLength() < 0) return self;
        const ratio = czQR._glog(self.getAt(0)) - czQR._glog(e.getAt(0));
        const num2 = [];
        for (let i = 0; i < self.getLength(); i++) num2[i] = self.getAt(i);
        for (let i = 0; i < e.getLength(); i++) num2[i] ^= czQR._gexp(czQR._glog(e.getAt(i)) + ratio);
        return this._createPolynomial(num2, 0).mod(e);
      },
    };
    return self;
  }

  _getErrorCorrectPolynomial(ecLength) {
    let a = this._createPolynomial([1], 0);
    for (let i = 0; i < ecLength; i++) a = a.multiply(this._createPolynomial([1, czQR._gexp(i)], 0));
    return a;
  }


  // ── BCH ──
  static _getBCHDigit(data) { let d = 0; while (data !== 0) { d++; data >>>= 1; } return d; }

  _getBCHTypeInfo(data) {
    const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
    let d = data << 10;
    while (czQR._getBCHDigit(d) - czQR._getBCHDigit(G15) >= 0) d ^= (G15 << (czQR._getBCHDigit(d) - czQR._getBCHDigit(G15)));
    return ((data << 10) | d) ^ G15_MASK;
  }

  _getBCHTypeNumber(data) {
    const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    let d = data << 12;
    while (czQR._getBCHDigit(d) - czQR._getBCHDigit(G18) >= 0) d ^= (G18 << (czQR._getBCHDigit(d) - czQR._getBCHDigit(G18)));
    return (data << 12) | d;
  }

  // ── Mask ──
  _getMaskValue(maskPattern, i, j) {
    switch (maskPattern) {
      case 0: return (i + j) % 2 === 0;
      case 1: return i % 2 === 0;
      case 2: return j % 3 === 0;
      case 3: return (i + j) % 3 === 0;
      case 4: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case 5: return (i * j) % 2 + (i * j) % 3 === 0;
      case 6: return ((i * j) % 2 + (i * j) % 3) % 2 === 0;
      case 7: return ((i * j) % 3 + (i + j) % 2) % 2 === 0;
      default: throw new Error(`Bad maskPattern: ${maskPattern}`);
    }
  }

  // ── Penalty ──
  _getLostPoint() {
    const mc = this._moduleCount;
    let lp = 0;
    for (let row = 0; row < mc; row++) for (let col = 0; col < mc; col++) {
      let sameCount = 0; const dark = this._modules[row][col];
      for (let r = -1; r <= 1; r++) {
        if (row + r < 0 || mc <= row + r) continue;
        for (let c = -1; c <= 1; c++) {
          if (col + c < 0 || mc <= col + c) continue;
          if (r === 0 && c === 0) continue;
          if (dark === this._modules[row + r][col + c]) sameCount++;
        }
      }
      if (sameCount > 5) lp += 3 + sameCount - 5;
    }
    for (let row = 0; row < mc - 1; row++) for (let col = 0; col < mc - 1; col++) {
      let count = 0;
      if (this._modules[row][col]) count++;
      if (this._modules[row + 1][col]) count++;
      if (this._modules[row][col + 1]) count++;
      if (this._modules[row + 1][col + 1]) count++;
      if (count === 0 || count === 4) lp += 3;
    }
    // Rule 3: finder-like pattern with 4-module quiet zone on either side
    for (let row = 0; row < mc; row++) for (let col = 0; col < mc - 6; col++) {
      if (this._modules[row][col] && !this._modules[row][col + 1] && this._modules[row][col + 2] && this._modules[row][col + 3] && this._modules[row][col + 4] && !this._modules[row][col + 5] && this._modules[row][col + 6]) {
        // Check 4 light modules before (00001011101)
        if (col >= 4 && !this._modules[row][col - 1] && !this._modules[row][col - 2] && !this._modules[row][col - 3] && !this._modules[row][col - 4]) lp += 40;
        // Check 4 light modules after (10111010000)
        else if (col + 10 < mc && !this._modules[row][col + 7] && !this._modules[row][col + 8] && !this._modules[row][col + 9] && !this._modules[row][col + 10]) lp += 40;
      }
    }
    for (let col = 0; col < mc; col++) for (let row = 0; row < mc - 6; row++) {
      if (this._modules[row][col] && !this._modules[row + 1][col] && this._modules[row + 2][col] && this._modules[row + 3][col] && this._modules[row + 4][col] && !this._modules[row + 5][col] && this._modules[row + 6][col]) {
        // Check 4 light modules before (00001011101)
        if (row >= 4 && !this._modules[row - 1][col] && !this._modules[row - 2][col] && !this._modules[row - 3][col] && !this._modules[row - 4][col]) lp += 40;
        // Check 4 light modules after (10111010000)
        else if (row + 10 < mc && !this._modules[row + 7][col] && !this._modules[row + 8][col] && !this._modules[row + 9][col] && !this._modules[row + 10][col]) lp += 40;
      }
    }
    let darkCount = 0;
    for (let col = 0; col < mc; col++) for (let row = 0; row < mc; row++) { if (this._modules[row][col]) darkCount++; }
    const ratio = Math.abs(100 * darkCount / mc / mc - 50) / 5;
    lp += Math.floor(ratio * 10);
    return lp;
  }

  _getLengthInBits(mode, type) {
    if (type >= 1 && type < 10) {
      switch (mode) { case 1: return 10; case 2: return 9; case 4: return 8; case 8: return 8; }
    } else if (type < 27) {
      switch (mode) { case 1: return 12; case 2: return 11; case 4: return 16; case 8: return 10; }
    } else if (type < 41) {
      switch (mode) { case 1: return 14; case 2: return 13; case 4: return 16; case 8: return 12; }
    }
    throw new Error(`type: ${type}`);
  }

  // ── Helpers ──
  _escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

