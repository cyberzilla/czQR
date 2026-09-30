  // ════════════════════════════════════════════════════════════════════════
  // datamatrix-encode.js — Data Matrix ECC200 generation
  // Based on etiket reference (MIT) — rewritten for czQR
  // ════════════════════════════════════════════════════════════════════════

  // ── Symbol size table ──
  // [rows, cols, dataRegionRows, dataRegionCols, totalData, ecCW, blocks]
  static _DM_SIZES = [
    [10,10,8,8,3,5,1],[12,12,10,10,5,7,1],[14,14,12,12,8,10,1],
    [16,16,14,14,12,12,1],[18,18,16,16,18,14,1],[20,20,18,18,22,18,1],
    [22,22,20,20,30,20,1],[24,24,22,22,36,24,1],[26,26,24,24,44,28,1],
    [32,32,14,14,62,36,1],[36,36,16,16,86,42,1],[40,40,18,18,114,48,1],
    [44,44,20,20,144,56,1],[48,48,22,22,174,68,1],[52,52,24,24,204,84,2],
    [64,64,14,14,280,112,2],[72,72,16,16,368,144,4],[80,80,18,18,456,192,4],
    [88,88,20,20,576,224,4],[96,96,22,22,696,272,4],[104,104,24,24,816,336,6],
    [120,120,18,18,1050,408,6],[132,132,20,20,1304,496,8],[144,144,22,22,1558,620,10],
  ];

  // ── GF(256) tables (poly 301 = 0x12D) ──
  static _DM_EXP = null;
  static _DM_LOG = null;

  static _dm_initGF() {
    if (czQR._DM_EXP) return;
    const exp = new Uint8Array(512);
    const log = new Uint8Array(256);
    let x = 1;
    for (let i = 0; i < 255; i++) {
      exp[i] = x;
      log[x] = i;
      x <<= 1;
      if (x >= 256) x ^= 0x12d;
    }
    for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
    czQR._DM_EXP = exp;
    czQR._DM_LOG = log;
  }

  // ── ASCII encoding ──
  static _dm_encodeASCII(text) {
    const cw = [];
    let i = 0;
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c > 255) throw new Error(`Data Matrix: unsupported char U+${c.toString(16)}`);
      if (c >= 48 && c <= 57 && i + 1 < text.length) {
        const c2 = text.charCodeAt(i + 1);
        if (c2 >= 48 && c2 <= 57) {
          cw.push((c - 48) * 10 + (c2 - 48) + 130);
          i += 2;
          continue;
        }
      }
      if (c >= 128) { cw.push(235); cw.push(c - 127); }
      else cw.push(c + 1);
      i++;
    }
    return cw;
  }

  // ── Encoding values for C40/TEXT/X12 ──
  static _c40Value(ch) {
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 };
    if (ch >= 0 && ch <= 31) return { set: 1, value: ch };
    if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 };
    if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 };
    if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 };
    if (ch >= 96 && ch <= 127) return { set: 3, value: ch - 96 };
    return { set: -1, value: 0 };
  }

  static _textValue(ch) {
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 97 && ch <= 122) return { set: 0, value: ch - 97 + 14 };
    if (ch >= 0 && ch <= 31) return { set: 1, value: ch };
    if (ch >= 33 && ch <= 47) return { set: 2, value: ch - 33 };
    if (ch >= 58 && ch <= 64) return { set: 2, value: ch - 58 + 15 };
    if (ch >= 91 && ch <= 95) return { set: 2, value: ch - 91 + 22 };
    if (ch === 96) return { set: 3, value: 0 };
    if (ch >= 65 && ch <= 90) return { set: 3, value: ch - 65 + 1 };
    if (ch >= 123 && ch <= 127) return { set: 3, value: ch - 123 + 27 };
    return { set: -1, value: 0 };
  }

  static _x12Value(ch) {
    if (ch === 13) return { set: 0, value: 0 };
    if (ch === 42) return { set: 0, value: 1 };
    if (ch === 62) return { set: 0, value: 2 };
    if (ch === 32) return { set: 0, value: 3 };
    if (ch >= 48 && ch <= 57) return { set: 0, value: ch - 48 + 4 };
    if (ch >= 65 && ch <= 90) return { set: 0, value: ch - 65 + 14 };
    return { set: -1, value: 0 };
  }

  static _dm_triplet(a, b, c) {
    const v = a * 1600 + b * 40 + c + 1;
    return [Math.floor(v / 256), v % 256];
  }

  static _dm_encodeC40Text(text, latchCW, valueFn) {
    const values = [];
    const valueCharIndex = [];
    let fallbackFrom = text.length;

    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      const { set, value } = valueFn(ch);
      if (set === -1) {
        fallbackFrom = i;
        break;
      }
      if (set > 0) {
        values.push(set - 1);
        valueCharIndex.push(i);
        values.push(value);
        valueCharIndex.push(i);
      } else {
        values.push(value);
        valueCharIndex.push(i);
      }
    }

    const split = values.length - (values.length % 3);
    const head = [latchCW];
    for (let i = 0; i < split; i += 3) {
      head.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
    }
    const rest = values.slice(split);
    const asciiFrom = rest.length > 0 ? Math.min(valueCharIndex[split], fallbackFrom) : fallbackFrom;
    
    let shortest = head.slice();
    if (fallbackFrom >= text.length) {
      if (rest.length === 0) {
        // Fits exact
      } else if (rest.length === 2) {
        shortest.push(...czQR._dm_triplet(rest[0], rest[1], 0));
      } else if (asciiFrom === text.length - 1 && valueCharIndex[values.length - 2] !== asciiFrom) {
        shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
      } else {
        shortest.push(254);
        if (asciiFrom < text.length) shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
      }
    } else {
      shortest.push(254);
      if (asciiFrom < text.length) shortest.push(...czQR._dm_encodeASCII(text.slice(asciiFrom)));
    }
    return shortest;
  }

  static _dm_encodeC40(text) {
    return czQR._dm_encodeC40Text(text, 230, czQR._c40Value);
  }

  static _dm_encodeText(text) {
    return czQR._dm_encodeC40Text(text, 239, czQR._textValue);
  }

  static _dm_encodeX12(text) {
    if (text.length === 0 || text.length % 3 !== 0) return undefined;
    const values = [];
    for (let i = 0; i < text.length; i++) {
      const { set, value } = czQR._x12Value(text.charCodeAt(i));
      if (set === -1) return undefined;
      values.push(value);
    }
    const head = [238];
    for (let i = 0; i < values.length; i += 3) {
      head.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
    }
    head.push(254);
    return head;
  }

  static _dm_edifactQuads(values) {
    const codewords = [];
    for (let i = 0; i < values.length; i += 4) {
      const count = Math.min(4, values.length - i);
      const packed =
        ((values[i] || 0) << 18) |
        ((values[i + 1] || 0) << 12) |
        ((values[i + 2] || 0) << 6) |
        (values[i + 3] || 0);
      codewords.push((packed >> 16) & 0xff);
      if (count >= 2) codewords.push((packed >> 8) & 0xff);
      if (count >= 3) codewords.push(packed & 0xff);
    }
    return codewords;
  }

  static _dm_encodeEDIFACT(text) {
    if (text.length === 0) return undefined;
    const values = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code < 32 || code > 94) return undefined;
      values.push(code & 0x3f);
    }
    values.push(31); // unlatch
    return [240, ...czQR._dm_edifactQuads(values)];
  }

  static _dm_randomize255(value, position) {
    const pseudoRandom = ((149 * position) % 255) + 1;
    const result = value + pseudoRandom;
    return result <= 255 ? result : result - 256;
  }

  static _dm_encodeBase256(bytes, startPos = 1) {
    const data = Array.from(bytes);
    const codewords = [231];
    let position = startPos + 1;

    if (data.length < 250) {
      codewords.push(czQR._dm_randomize255(data.length, position++));
    } else {
      codewords.push(czQR._dm_randomize255(Math.floor(data.length / 250) + 249, position++));
      codewords.push(czQR._dm_randomize255(data.length % 250, position++));
    }

    for (const byte of data) {
      codewords.push(czQR._dm_randomize255(byte, position++));
    }

    return codewords;
  }

  static _dm_encodeECI(eci) {
    if (!Number.isInteger(eci) || eci < 0 || eci > 999999) {
      throw new Error("Data Matrix ECI assignment number must be 0-999999");
    }
    if (eci <= 126) return [241, eci + 1];
    if (eci <= 16382) {
      const value = eci - 127;
      return [241, Math.floor(value / 254) + 128, (value % 254) + 1];
    }
    const value = eci - 16383;
    return [
      241,
      Math.floor(value / 64516) + 192,
      (Math.floor(value / 254) % 254) + 1,
      (value % 254) + 1,
    ];
  }

  static _dm_optimizeEncoding(text) {
    const length = text.length;
    let hasNonLatin1 = false;
    for (let i = 0; i < length; i++) {
      if (text.codePointAt(i) > 0xff) {
        hasNonLatin1 = true; break;
      }
    }
    if (hasNonLatin1) {
      let encoder;
      if (typeof TextEncoder !== 'undefined') encoder = new TextEncoder();
      else if (typeof require !== 'undefined') encoder = new (require('util').TextEncoder)();
      if (encoder) {
        const bytes = encoder.encode(text);
        const eci = czQR._dm_encodeECI(26);
        return [...eci, ...czQR._dm_encodeBase256(bytes, eci.length + 1)];
      }
    }

    const MIXED_MODES = [
      { latch: 230, group: 3, emitted: 2 }, // C40
      { latch: 239, group: 3, emitted: 2 }, // Text
      { latch: 238, group: 3, emitted: 2 }, // X12
      { latch: 240, group: 4, emitted: 3 }, // EDIFACT
    ];
    const MIXED_STATES = 14;
    const MIXED_BASE = [1, 4, 7, 10];
    const UNREACHABLE = 1e9;

    function mixedState(mode, pending) { return MIXED_BASE[mode] + pending; }

    function mixedValues(mode, charCode) {
      if (mode === 2) {
        const { set, value } = czQR._x12Value(charCode);
        return set === -1 ? undefined : [value];
      }
      if (mode === 3) return charCode >= 32 && charCode <= 94 ? [charCode & 0x3f] : undefined;
      const { set, value } = mode === 0 ? czQR._c40Value(charCode) : czQR._textValue(charCode);
      if (set === -1) return undefined;
      return set > 0 ? [set - 1, value] : [value];
    }

    function asciiStep(txt, at) {
      const char = txt.charCodeAt(at);
      const next = at + 1 < txt.length ? txt.charCodeAt(at + 1) : -1;
      if (char >= 48 && char <= 57 && next >= 48 && next <= 57) return { cost: 1, advance: 2 };
      return { cost: char >= 128 ? 2 : 1, advance: 1 };
    }

    const cost = new Float64Array((length + 1) * MIXED_STATES).fill(UNREACHABLE);
    const from = new Int32Array((length + 1) * MIXED_STATES).fill(-1);
    cost[0] = 0;

    const relax = (at, state, total, advance, previous) => {
      const slot = at * MIXED_STATES + state;
      if (total >= cost[slot]) return;
      cost[slot] = total;
      from[slot] = (advance << 8) | previous;
    };

    for (let at = 0; at <= length; at++) {
      const base = at * MIXED_STATES;
      for (let round = 0; round < 2; round++) {
        const ascii = cost[base];
        for (let mode = 0; mode < MIXED_MODES.length; mode++) {
          if (ascii < UNREACHABLE) relax(at, mixedState(mode, 0), ascii + 1, 0, 0);
          const idle = cost[base + mixedState(mode, 0)];
          if (idle < UNREACHABLE) relax(at, 0, idle + 1, 0, mixedState(mode, 0));
        }
      }
      if (at === length) break;
      const charCode = text.charCodeAt(at);
      const ascii = cost[base];
      if (ascii < UNREACHABLE) {
        const { cost: step, advance } = asciiStep(text, at);
        relax(at + advance, 0, ascii + step, advance, 0);
      }
      for (let mode = 0; mode < MIXED_MODES.length; mode++) {
        const spec = MIXED_MODES[mode];
        const values = mixedValues(mode, charCode);
        if (!values) continue;
        for (let pending = 0; pending < spec.group; pending++) {
          const here = cost[base + mixedState(mode, pending)];
          if (here >= UNREACHABLE) continue;
          const held = pending + values.length;
          const total = here + Math.floor(held / spec.group) * spec.emitted;
          relax(at + 1, mixedState(mode, held % spec.group), total, 1, mixedState(mode, pending));
        }
      }
    }

    const build = (endState, terminate) => {
      if (cost[length * MIXED_STATES + endState] >= UNREACHABLE) return undefined;
      const route = new Array(length).fill(0);
      let at = length;
      let state = endState;
      while (from[at * MIXED_STATES + state] !== -1) {
        const packed = from[at * MIXED_STATES + state];
        const advance = packed >> 8;
        const previous = packed & 0xff;
        for (let i = at - advance; i < at; i++) route[i] = previous;
        at -= advance;
        state = previous;
      }

      const codewords = [];
      let head = 0;
      let edifact = false;
      let index = 0;
      while (index < length) {
        if (route[index] === 0) {
          const { advance } = asciiStep(text, index);
          codewords.push(...czQR._dm_encodeASCII(text.slice(index, index + advance)));
          index += advance;
          continue;
        }
        const mode = MIXED_BASE.findIndex(
          (start, i) => route[index] >= start && route[index] < start + MIXED_MODES[i].group
        );
        const spec = MIXED_MODES[mode];
        let end = index;
        while (
          end < length &&
          route[end] >= MIXED_BASE[mode] &&
          route[end] < MIXED_BASE[mode] + spec.group
        ) {
          end++;
        }

        const values = [];
        for (let i = index; i < end; i++) values.push(...mixedValues(mode, text.charCodeAt(i)));
        codewords.push(spec.latch);
        const last = end === length;
        if (spec.group === 3) {
          for (let i = 0; i < values.length; i += 3) {
            codewords.push(...czQR._dm_triplet(values[i], values[i + 1], values[i + 2]));
          }
          if (last) head = codewords.length;
          if (!last || terminate) codewords.push(254);
        } else {
          codewords.push(...czQR._dm_edifactQuads(values));
          if (last) { head = codewords.length; edifact = true; }
          if (!last || terminate) codewords.push(...czQR._dm_edifactQuads([31]));
        }
        index = end;
      }
      return { codewords, head, edifact };
    };

    const forms = [];
    const ascii = build(0, true);
    if (ascii) forms.push(ascii.codewords);
    for (let mode = 0; mode < MIXED_MODES.length; mode++) {
      const open = build(mixedState(mode, 0), false);
      if (open) forms.push(open.codewords);
    }
    if (forms.length === 0) return czQR._dm_encodeASCII(text);
    forms.sort((a, b) => a.length - b.length);
    return forms[0];
  }

  // ── Find smallest symbol ──
  static _dm_findSize(dataLen) {
    for (const s of czQR._DM_SIZES) {
      if (s[4] >= dataLen) return s;
    }
    return null;
  }

  // ── Pad data codewords ──
  static _dm_pad(cw, capacity) {
    if (cw.length < capacity) cw.push(129);
    while (cw.length < capacity) {
      const pos = cw.length + 1;
      const pr = ((149 * pos) % 253) + 1;
      let v = 129 + pr;
      if (v > 254) v -= 254;
      cw.push(v);
    }
  }

  // ── Reed-Solomon EC (roots a^1..a^n per ISO 16022) ──
  static _dm_rsEncode(data, ecCount) {
    const exp = czQR._DM_EXP, log = czQR._DM_LOG;
    const gen = new Array(ecCount + 1).fill(0);
    gen[0] = 1;
    for (let i = 1; i <= ecCount; i++) {
      for (let j = gen.length - 1; j >= 1; j--)
        gen[j] = gen[j - 1] ^ (gen[j] === 0 ? 0 : exp[(log[gen[j]] + i) % 255]);
      gen[0] = gen[0] === 0 ? 0 : exp[(log[gen[0]] + i) % 255];
    }
    const rem = new Array(ecCount).fill(0);
    for (const b of data) {
      const lead = b ^ rem[0];
      for (let j = 0; j < ecCount - 1; j++)
        rem[j] = rem[j + 1] ^ (lead === 0 ? 0 : exp[(log[lead] + log[gen[ecCount - 1 - j]]) % 255]);
      rem[ecCount - 1] = lead === 0 ? 0 : exp[(log[lead] + log[gen[0]]) % 255];
    }
    return rem;
  }

  // ── Interleaved EC ──
  static _dm_addEC(dataCW, ecTotal, blocks) {
    const ecPer = ecTotal / blocks;
    const result = new Array(ecTotal).fill(0);
    for (let b = 0; b < blocks; b++) {
      const block = [];
      for (let i = b; i < dataCW.length; i += blocks) block.push(dataCW[i]);
      const ec = czQR._dm_rsEncode(block, ecPer);
      for (let i = 0; i < ecPer; i++) result[i * blocks + b] = ec[i];
    }
    return [...dataCW, ...result];
  }

  // ── Placement map (ISO 16022 Annex M) ──
  static _dm_buildPlacementMap(nrow, ncol) {
    const total = nrow * ncol;
    const placed = new Int32Array(total).fill(-1);
    let bp = 0;

    function setMod(r, c, bp, bit) {
      if (r < 0) { r += nrow; c += 4 - ((nrow + 4) % 8); }
      if (c < 0) { c += ncol; r += 4 - ((ncol + 4) % 8); }
      if (r >= 0 && r < nrow && c >= 0 && c < ncol)
        placed[r * ncol + c] = bp + bit;
    }

    function utah(r, c, bp) {
      setMod(r-2,c-2,bp,0); setMod(r-2,c-1,bp,1);
      setMod(r-1,c-2,bp,2); setMod(r-1,c-1,bp,3); setMod(r-1,c,bp,4);
      setMod(r,c-2,bp,5);   setMod(r,c-1,bp,6);   setMod(r,c,bp,7);
      return bp + 8;
    }

    function corner1(bp) {
      setMod(nrow-1,0,bp,0); setMod(nrow-1,1,bp,1); setMod(nrow-1,2,bp,2);
      setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-1,bp,5); setMod(2,ncol-1,bp,6); setMod(3,ncol-1,bp,7);
      return bp + 8;
    }
    function corner2(bp) {
      setMod(nrow-3,0,bp,0); setMod(nrow-2,0,bp,1); setMod(nrow-1,0,bp,2);
      setMod(0,ncol-4,bp,3); setMod(0,ncol-3,bp,4); setMod(0,ncol-2,bp,5);
      setMod(0,ncol-1,bp,6); setMod(1,ncol-1,bp,7);
      return bp + 8;
    }
    function corner3(bp) {
      setMod(nrow-3,0,bp,0); setMod(nrow-2,0,bp,1); setMod(nrow-1,0,bp,2);
      setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-1,bp,5); setMod(2,ncol-1,bp,6); setMod(3,ncol-1,bp,7);
      return bp + 8;
    }
    function corner4(bp) {
      setMod(nrow-1,0,bp,0); setMod(nrow-1,ncol-1,bp,1);
      setMod(0,ncol-3,bp,2); setMod(0,ncol-2,bp,3); setMod(0,ncol-1,bp,4);
      setMod(1,ncol-3,bp,5); setMod(1,ncol-2,bp,6); setMod(1,ncol-1,bp,7);
      return bp + 8;
    }

    let row = 4, col = 0;
    while (row < nrow || col < ncol) {
      if (row === nrow && col === 0) bp = corner1(bp);
      if (row === nrow - 2 && col === 0 && ncol % 4 !== 0) bp = corner2(bp);
      if (row === nrow - 2 && col === 0 && ncol % 8 === 4) bp = corner3(bp);
      if (row === nrow + 4 && col === 2 && ncol % 8 === 0) bp = corner4(bp);
      // Sweep up-right
      while (row >= 0 && col < ncol) {
        if (row < nrow && col >= 0 && placed[row * ncol + col] === -1)
          bp = utah(row, col, bp);
        row -= 2; col += 2;
      }
      row += 1; col += 3;
      // Sweep down-left
      while (row < nrow && col >= 0) {
        if (row >= 0 && col < ncol && placed[row * ncol + col] === -1)
          bp = utah(row, col, bp);
        row += 2; col -= 2;
      }
      row += 3; col += 1;
    }
    // Fixed corner
    if (placed[(nrow - 1) * ncol + (ncol - 1)] === -1) {
      placed[(nrow - 1) * ncol + (ncol - 1)] = -2;
      placed[(nrow - 2) * ncol + (ncol - 2)] = -2;
    }
    return placed;
  }

  /**
   * Generate a Data Matrix ECC200 barcode.
   * @param {string} data - Data to encode
   * @param {Object} [options]
   * @param {number} [options.size=300] - Output pixel size
   * @param {string} [options.fg='#000000'] - Foreground color
   * @param {string} [options.bg='#ffffff'] - Background color
   * @param {number} [options.margin=1] - Quiet zone in modules
   * @param {string} [options.output='svg'] - 'svg'|'canvas'|'png'|'datauri'
   * @returns {string|HTMLCanvasElement}
   */
  static dataMatrix(data, options = {}) {
    czQR._dm_initGF();
    const text = String(data);
    const mode = (options.mode || 'auto').toLowerCase();
    let enc;
    if (mode === 'auto') {
      enc = czQR._dm_optimizeEncoding(text);
    } else {
      const modeNames = { ascii:'ASCII', c40:'C40', text:'TEXT', x12:'X12', edifact:'EDIFACT', base256:'Base256' };
      try {
        if (mode === 'ascii') enc = czQR._dm_encodeASCII(text);
        else if (mode === 'c40') enc = czQR._dm_encodeC40(text);
        else if (mode === 'text') enc = czQR._dm_encodeText(text);
        else if (mode === 'x12') enc = czQR._dm_encodeX12(text);
        else if (mode === 'edifact') enc = czQR._dm_encodeEDIFACT(text);
        else if (mode === 'base256') enc = czQR._dm_encodeBase256(text.split('').map(c => c.charCodeAt(0)));
        else enc = czQR._dm_optimizeEncoding(text);
        if (!enc || !enc.length) throw new Error('encoding produced no codewords');
      } catch (e) {
        const mn = modeNames[mode] || mode;
        throw new Error(`${mn} mode cannot encode this content. ${mn === 'X12' ? 'X12 only supports: 0-9, A-Z, space, CR, *, >' : mn === 'EDIFACT' ? 'EDIFACT only supports ASCII 32-94' : mn === 'C40' ? 'C40 is optimized for uppercase, digits, and space' : mn === 'TEXT' ? 'TEXT is optimized for lowercase, digits, and space' : 'Try Auto mode.'}`);
      }
    }
    const sym = czQR._dm_findSize(enc.length);
    if (!sym) throw new Error(`Data too long for Data Matrix (${enc.length} codewords)`);

    const [symR, symC, drR, drC, totalData, ecCW, blocks] = sym;
    const vRegs = symR / (drR + 2);
    const hRegs = symC / (drC + 2);
    const mapR = drR * vRegs;
    const mapC = drC * hRegs;

    // Pad & add EC
    czQR._dm_pad(enc, totalData);
    const allCW = czQR._dm_addEC(enc, ecCW, blocks);

    // Build placement map & fill mapping matrix
    const pmap = czQR._dm_buildPlacementMap(mapR, mapC);
    const mapping = Array.from({ length: mapR }, () => new Uint8Array(mapC));

    for (let r = 0; r < mapR; r++) {
      for (let c = 0; c < mapC; c++) {
        const bi = pmap[r * mapC + c];
        if (bi === -2) { mapping[r][c] = 1; continue; }
        if (bi >= 0) {
          const cwIdx = Math.floor(bi / 8);
          const bitOff = bi % 8;
          if (cwIdx < allCW.length)
            mapping[r][c] = (allCW[cwIdx] >> (7 - bitOff)) & 1;
        }
      }
    }

    // Build final matrix with finder patterns
    const matrix = Array.from({ length: symR }, () => new Uint8Array(symC));
    for (let vr = 0; vr < vRegs; vr++) {
      for (let hr = 0; hr < hRegs; hr++) {
        const sr = vr * (drR + 2);
        const sc = hr * (drC + 2);
        // Clock track: top alternating, right alternating
        for (let c = 0; c < drC + 2; c++) matrix[sr][sc + c] = (c % 2 === 0) ? 1 : 0;
        for (let r = 0; r < drR + 2; r++) matrix[sr + r][sc + drC + 1] = (r % 2 !== 0) ? 1 : 0;
        // L-shape finder: bottom solid, left solid (drawn after clock to override corners)
        for (let c = 0; c < drC + 2; c++) matrix[sr + drR + 1][sc + c] = 1;
        for (let r = 0; r < drR + 2; r++) matrix[sr + r][sc] = 1;
        // Data modules
        for (let dr = 0; dr < drR; dr++)
          for (let dc = 0; dc < drC; dc++)
            matrix[sr + 1 + dr][sc + 1 + dc] = mapping[vr * drR + dr][hr * drC + dc];
      }
    }

    // Render
    const size = options.size || 300;
    const fg = options.fg || '#000000';
    const bg = options.bg || '#ffffff';
    const margin = options.margin != null ? options.margin : 1;
    const output = (options.output || 'svg').toLowerCase();

    if (output === 'svg') return czQR._dm_renderSVG(matrix, symR, symC, size, fg, bg, margin);
    const canvas = czQR._dm_renderCanvas(matrix, symR, symC, size, fg, bg, margin);
    if (output === 'canvas') return canvas;
    if (output === 'png' || output === 'datauri') return canvas.toDataURL('image/png');
    return canvas;
  }

  // ── SVG renderer ──
  static _dm_renderSVG(matrix, rows, cols, size, fg, bg, margin) {
    const sx = cols + margin * 2;
    const sy = rows + margin * 2;
    const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${sx} ${sy}" shape-rendering="crispEdges">`;
    if (bg !== 'transparent') svg += `<rect width="${sx}" height="${sy}" fill="${esc(bg)}"/>`;
    let d = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (matrix[r][c]) d += `M${c + margin},${r + margin}h1v1h-1z`;
      }
    }
    if (d) svg += `<path d="${d}" fill="${esc(fg)}"/>`;
    svg += '</svg>';
    return svg;
  }

  // ── Canvas renderer ──
  static _dm_renderCanvas(matrix, rows, cols, size, fg, bg, margin) {
    const sx = cols + margin * 2;
    const sy = rows + margin * 2;
    const ms = size / Math.max(sx, sy);
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (bg === 'transparent') ctx.clearRect(0, 0, size, size);
    else { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
    ctx.fillStyle = fg;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (matrix[r][c])
          ctx.fillRect(Math.floor((c + margin) * ms), Math.floor((r + margin) * ms), Math.ceil(ms), Math.ceil(ms));
    return canvas;
  }

