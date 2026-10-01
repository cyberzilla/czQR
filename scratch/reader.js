
        (() => {
            'use strict';

            // === Elements ===
            const tabs = document.querySelectorAll('.tab');
            const panels = { camera: document.getElementById('panelCamera'), file: document.getElementById('panelFile') };
            const video = document.getElementById('camVideo');
            const canvas = document.getElementById('camCanvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            const camWrap = document.getElementById('camWrap');
            const camMsg = document.getElementById('camMsg');
            const camSelect = document.getElementById('camSelect');
            const camActions = document.getElementById('camActions');
            const btnStart = document.getElementById('btnCamStart');
            const btnStop = document.getElementById('btnCamStop');
            const btnScanAgain = document.getElementById('btnScanAgain');
            const scanOverlay = document.querySelector('.scan-overlay');
            const detectCanvas = document.getElementById('detectCanvas');
            const detectCtx = detectCanvas.getContext('2d');
            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('fileInput');
            const imgPreview = document.getElementById('imgPreview');
            const imgPreviewSrc = document.getElementById('imgPreviewSrc');
            const btnClearImg = document.getElementById('btnClearImg');
            const fileLoading = document.getElementById('fileLoading');
            const resultEmpty = document.getElementById('resultEmpty');
            const resultFound = document.getElementById('resultFound');
            const resultText = document.getElementById('resultText');
            const resultMeta = document.getElementById('resultMeta');
            const btnCopy = document.getElementById('btnCopy');
            const btnOpen = document.getElementById('btnOpen');
            const historyWrap = document.getElementById('historyWrap');
            const historyList = document.getElementById('historyList');
            const toastEl = document.getElementById('toast');
            const imgDetectCanvas = document.getElementById('imgDetectCanvas');
            const imgDetectCtx = imgDetectCanvas.getContext('2d');

            // Reusable: draw detection markers on a canvas
            // imgW/imgH = natural image size, canvasW/canvasH = display canvas size
            // offX/offY/renderW/renderH = actual rendered area within canvas (for object-fit:contain)
            function drawDetections(dCtx, results, imgW, imgH, canvasW, canvasH, offX, offY, renderW, renderH) {
                czQR.drawDetections(dCtx, results, {
                    imgWidth: imgW, imgHeight: imgH,
                    canvasWidth: canvasW, canvasHeight: canvasH,
                    offsetX: offX || 0, offsetY: offY || 0,
                    renderWidth: renderW || canvasW, renderHeight: renderH || canvasH
                });
            }

            let stream = null;
            let scanning = false;
            let history = [];
            let lastResult = '';

            const SCAN_INTERVAL = 200; // minimum ms between scans (~5 fps max)
            const MAX_SCAN_DIM = 480;   // max pixel dimension for scan canvas (downscale for perf)

            // Off-screen canvas for ROI extraction (reused across frames)
            const roiCanvas = document.createElement('canvas');
            const roiCtx = roiCanvas.getContext('2d', { willReadFrequently: true });
            let lastCanvasW = 0, lastCanvasH = 0;
            let scanRAF = null;
            let lastScanTime = 0;
            let multiScanMode = false; // false = fast single scan, true = readAll

            // Pause scanning when tab is backgrounded
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
                } else if (scanning) {
                    lastScanTime = 0;
                    scanRAF = requestAnimationFrame(scanFrame);
                }
            });

            async function startCamera() {
                try {
                    const constraints = {
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    };
                    const deviceId = camSelect.value;
                    if (deviceId) {
                        constraints.video = { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } };
                    }
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                    video.srcObject = stream;
                    await video.play();

                    // Initialize AudioContext on user gesture for autoplay policy
                    ensureAudioCtx();

                    camWrap.style.display = 'block';
                    camMsg.style.display = 'none';
                    btnStart.style.display = 'none';
                    camActions.style.display = 'flex';
                    btnScanAgain.style.display = 'none';
                    scanOverlay.classList.remove('scan-success');

                    listCameras();
                    lastCanvasW = 0; lastCanvasH = 0; // force canvas resize on first frame
                    scanning = true;
                    lastScanTime = 0;
                    scanRAF = requestAnimationFrame(scanFrame);
                } catch (err) {
                    toast('Camera error: ' + err.message);
                }
            }

            function stopCamera() {
                scanning = false;
                if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
                if (stream) {
                    stream.getTracks().forEach(t => t.stop());
                    stream = null;
                }
                video.srcObject = null;
                camWrap.style.display = 'none';
                camMsg.style.display = 'block';
                btnStart.style.display = 'flex';
                camActions.style.display = 'none';
                btnScanAgain.style.display = 'none';
                scanOverlay.classList.remove('scan-success');
            }

            function pauseScanning() {
                scanning = false;
                if (scanRAF) { cancelAnimationFrame(scanRAF); scanRAF = null; }
                btnScanAgain.style.display = 'flex';
                scanOverlay.classList.add('scan-success');
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(200);
            }

            function resumeScanning() {
                btnScanAgain.style.display = 'none';
                scanOverlay.classList.remove('scan-success');
                detectCtx.clearRect(0, 0, detectCanvas.width, detectCanvas.height);
                lastResult = '';
                scanning = true;
                lastScanTime = 0;
                scanRAF = requestAnimationFrame(scanFrame);
            }

            function scanFrame(timestamp) {
                if (!scanning) return;

                // Skip if tab is hidden
                if (document.hidden) {
                    scanRAF = requestAnimationFrame(scanFrame);
                    return;
                }

                // Throttle: only process at SCAN_INTERVAL rate
                if (timestamp - lastScanTime < SCAN_INTERVAL) {
                    scanRAF = requestAnimationFrame(scanFrame);
                    return;
                }
                lastScanTime = timestamp;

                try {
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        const vw = video.videoWidth, vh = video.videoHeight;

                        // Only resize main canvas when video dimensions change
                        if (lastCanvasW !== vw || lastCanvasH !== vh) {
                            canvas.width = vw;
                            canvas.height = vh;
                            lastCanvasW = vw;
                            lastCanvasH = vh;
                        }

                        // Draw full video to main canvas (for visual feedback)
                        ctx.drawImage(video, 0, 0, vw, vh);

                        // Extract ROI: center 65% of the frame, downscaled
                        const roiFrac = 0.65;
                        const srcW = Math.floor(vw * roiFrac);
                        const srcH = Math.floor(vh * roiFrac);
                        const sx = Math.floor((vw - srcW) / 2);
                        const sy = Math.floor((vh - srcH) / 2);

                        // Downscale to max MAX_SCAN_DIM for performance
                        const scale = Math.min(1, MAX_SCAN_DIM / Math.max(srcW, srcH));
                        const dstW = Math.round(srcW * scale);
                        const dstH = Math.round(srcH * scale);

                        // Resize ROI canvas only when needed
                        if (roiCanvas.width !== dstW || roiCanvas.height !== dstH) {
                            roiCanvas.width = dstW;
                            roiCanvas.height = dstH;
                        }
                        roiCtx.drawImage(canvas, sx, sy, srcW, srcH, 0, 0, dstW, dstH);
                        const imageData = roiCtx.getImageData(0, 0, dstW, dstH);

                        // Fast path: single code scan first
                        let results = [];
                        if (multiScanMode) {
                            results = czQR.readAll(imageData);
                        } else {
                            const r = czQR.read(imageData);
                            if (r && r.data) results = [r];
                        }

                        // Clear detection overlay
                        const wrapRect = camWrap.getBoundingClientRect();
                        const dw = wrapRect.width, dh = wrapRect.height;
                        if (detectCanvas.width !== Math.round(dw) || detectCanvas.height !== Math.round(dh)) {
                            detectCanvas.width = Math.round(dw);
                            detectCanvas.height = Math.round(dh);
                        }
                        detectCtx.clearRect(0, 0, detectCanvas.width, detectCanvas.height);

                        if (results.length > 0) {
                            // Map ROI coordinates → display coordinates
                            // video uses object-fit: cover on a 1:1 container
                            const vidAspect = vw / vh;
                            const wrapAspect = dw / dh;
                            let vidDispW, vidDispH, vidOffX, vidOffY;
                            if (vidAspect > wrapAspect) {
                                vidDispH = dh;
                                vidDispW = dh * vidAspect;
                                vidOffX = -(vidDispW - dw) / 2;
                                vidOffY = 0;
                            } else {
                                vidDispW = dw;
                                vidDispH = dw / vidAspect;
                                vidOffX = 0;
                                vidOffY = -(vidDispH - dh) / 2;
                            }
                            const mapX = (rx) => vidOffX + (sx + rx / scale) / vw * vidDispW;
                            const mapY = (ry) => vidOffY + (sy + ry / scale) / vh * vidDispH;

                            // Map results to display coords for marker drawing
                            const mappedResults = results.map(r => {
                                if (r.format === 'qr' && r.points && r.points.length >= 3) {
                                    return { ...r, points: r.points.map(p => ({
                                        x: (sx + p.x / scale) / vw * vidDispW,
                                        y: (sy + p.y / scale) / vh * vidDispH
                                    }))};
                                } else if (r.bounds) {
                                    const bx2 = (sx + r.bounds.x / scale) / vw * vidDispW;
                                    const by2 = (sy + r.bounds.y / scale) / vh * vidDispH;
                                    const bw2 = (sx + (r.bounds.x + r.bounds.w) / scale) / vw * vidDispW - bx2;
                                    const bh2 = (sy + (r.bounds.y + r.bounds.h) / scale) / vh * vidDispH - by2;
                                    return { ...r, bounds: { x: bx2, y: by2, w: bw2, h: bh2 }};
                                }
                                return r;
                            });
                            czQR.drawDetections(detectCtx, mappedResults, {
                                imgWidth: vidDispW, imgHeight: vidDispH,
                                canvasWidth: detectCanvas.width, canvasHeight: detectCanvas.height,
                                offsetX: vidOffX, offsetY: vidOffY,
                                showLabels: false
                            });

                            // Show results
                            if (results.length === 1) {
                                showResult(results[0].data, 'Camera', results[0].format);
                                toast('✓ ' + (results[0].format === 'qr' ? 'QR Code' : 'Barcode [' + (results[0].format || '').toUpperCase() + ']') + ' detected!');
                            } else {
                                showMultiResults(results, 'Camera');
                                toast('✓ ' + results.length + ' codes detected!');
                            }
                            playBeep();
                            pauseScanning();
                            return; // stop scan loop
                        }
                    }
                } catch (err) {
                    console.warn('Scan frame error:', err);
                }
                scanRAF = requestAnimationFrame(scanFrame);
            }

            // === Tabs ===
            tabs.forEach(t => t.addEventListener('click', () => {
                tabs.forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                Object.values(panels).forEach(p => p.classList.remove('active'));
                panels[t.dataset.tab].classList.add('active');
                if (t.dataset.tab === 'file') stopCamera();
            }));

            // === Toast ===
            let toastTimer;
            function toast(msg) {
                toastEl.textContent = msg;
                toastEl.classList.add('show');
                clearTimeout(toastTimer);
                toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2500);
            }

            // === Audio Feedback ===
            let sharedAudioCtx = null;
            function ensureAudioCtx() {
                if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
                return sharedAudioCtx;
            }
            function playBeep() {
                try {
                    const ac = ensureAudioCtx();
                    const osc = ac.createOscillator();
                    const gain = ac.createGain();
                    osc.connect(gain);
                    gain.connect(ac.destination);
                    osc.frequency.value = 1800;
                    osc.type = 'sine';
                    gain.gain.value = 0.15;
                    osc.start();
                    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.15);
                    osc.stop(ac.currentTime + 0.15);
                } catch { }
            }

            // === Result ===
            function showResult(text, source, format, fromHistory) {
                resultEmpty.style.display = 'none';
                resultFound.style.display = 'block';
                resultText.textContent = text;

                // Open link button
                try {
                    const url = new URL(text);
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                        btnOpen.href = text;
                        btnOpen.style.display = 'inline-flex';
                    } else {
                        btnOpen.style.display = 'none';
                    }
                } catch {
                    btnOpen.style.display = 'none';
                }

                // Meta info
                const now = new Date();
                const type = detectType(text);
                const fmtLabel = format === 'qr' ? 'QR Code' : (format || 'Unknown').toUpperCase();
                resultMeta.innerHTML = `
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--p)"></div>Format: ${fmtLabel}</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--cy)"></div>Type: ${type}</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--em)"></div>Length: ${text.length} chars</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--am)"></div>Source: ${source}</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--p)"></div>${now.toLocaleTimeString()}</div>
                `;

                // Add to history (avoid duplicates in sequence, skip if from history click)
                if (!fromHistory && text !== lastResult) {
                    lastResult = text;
                    history.unshift({ text, time: now, source, type, format: fmtLabel, rawFormat: format });
                    if (history.length > 20) history.pop();
                    renderHistory();
                }
            }

            function showMultiResults(results, source) {
                if (!results || results.length === 0) return;
                if (results.length === 1) {
                    showResult(results[0].data, source, results[0].format);
                    return;
                }
                resultEmpty.style.display = 'none';
                resultFound.style.display = 'block';
                btnOpen.style.display = 'none';

                let html = '';
                const now = new Date();
                results.forEach((r, i) => {
                    const fmtLabel = r.format === 'qr' ? 'QR Code' : (r.format || 'Unknown').toUpperCase();
                    const type = detectType(r.data);
                    let linkBtn = '';
                    try {
                        const url = new URL(r.data);
                        if (url.protocol === 'http:' || url.protocol === 'https:')
                            linkBtn = ` <a href="${escHtml(r.data)}" target="_blank" rel="noopener" style="color:var(--cy);font-size:12px">🔗 Open</a>`;
                    } catch {}
                    html += `<div style="background:var(--bg);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-bottom:8px">
                        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
                            <span style="background:var(--p);color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700">${i+1}</span>
                            <span style="font-weight:600;color:var(--fg)">${fmtLabel}</span>
                            <span style="color:var(--fg2);font-size:12px">${type}</span>${linkBtn}
                        </div>
                        <div style="word-break:break-all;font-family:'Fira Code',monospace;font-size:13px;color:var(--cy);cursor:pointer" onclick="navigator.clipboard.writeText(this.textContent).then(()=>{this.style.opacity='0.5';setTimeout(()=>this.style.opacity='1',300)})">${escHtml(r.data)}</div>
                    </div>`;
                    // Add each to history
                    if (r.data !== lastResult) {
                        history.unshift({ text: r.data, time: now, source, type, format: fmtLabel, rawFormat: r.format });
                    }
                });
                if (history.length > 20) history.length = 20;
                renderHistory();
                lastResult = results[results.length - 1].data;

                resultText.textContent = '';
                resultMeta.innerHTML = `<div class="meta-chip"><div class="meta-dot" style="background:var(--p)"></div>Found ${results.length} codes</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--am)"></div>Source: ${source}</div>
                    <div class="meta-chip"><div class="meta-dot" style="background:var(--p)"></div>${now.toLocaleTimeString()}</div>`;
                resultText.innerHTML = html;
            }

            function detectType(text) {
                try {
                    const url = new URL(text);
                    if (url.protocol === 'http:' || url.protocol === 'https:') return 'URL';
                    if (url.protocol === 'mailto:') return 'Email';
                    if (url.protocol === 'tel:') return 'Phone';
                    return 'URI';
                } catch { }
                if (text.startsWith('BEGIN:VCARD')) return 'vCard';
                if (text.startsWith('BEGIN:VEVENT')) return 'Event';
                if (text.startsWith('WIFI:')) return 'WiFi';
                if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(text)) return 'Email';
                if (/^\+?[\d\s()-]{7,15}$/.test(text)) return 'Phone';
                return 'Text';
            }

            function renderHistory() {
                if (history.length === 0) { historyWrap.style.display = 'none'; return; }
                historyWrap.style.display = 'block';
                historyList.innerHTML = history.map((h, i) => `
                    <div class="history-item" data-idx="${i}">
                        <span class="hi-text">${escHtml(h.text)}</span>
                        <span class="hi-time">${h.time.toLocaleTimeString()}</span>
                    </div>
                `).join('');
                historyList.querySelectorAll('.history-item').forEach(el => {
                    el.addEventListener('click', () => {
                        const h = history[parseInt(el.dataset.idx)];
                        showResult(h.text, h.source, h.rawFormat, true);
                    });
                });
            }

            function escHtml(s) {
                return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            // === Copy ===
            btnCopy.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(resultText.textContent);
                    toast('✓ Copied to clipboard');
                } catch {
                    // Fallback
                    const ta = document.createElement('textarea');
                    ta.value = resultText.textContent;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                    toast('✓ Copied to clipboard');
                }
            });

            // === Camera ===
            async function listCameras() {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const cams = devices.filter(d => d.kind === 'videoinput');
                    if (cams.length > 1) {
                        camSelect.innerHTML = cams.map((c, i) =>
                            `<option value="${c.deviceId}">${c.label || 'Camera ' + (i + 1)}</option>`
                        ).join('');
                        camSelect.style.display = 'block';
                    }
                } catch { }
            }

            btnStart.addEventListener('click', startCamera);
            btnStop.addEventListener('click', stopCamera);
            btnScanAgain.addEventListener('click', resumeScanning);
            camSelect.addEventListener('change', () => {
                if (stream) {
                    stopCamera();
                    startCamera();
                }
            });

            // === File Upload ===
            function handleFile(file) {
                if (!file || !file.type.startsWith('image/')) {
                    toast('Please select an image file');
                    return;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        // Show preview
                        imgPreviewSrc.src = e.target.result;
                        imgPreview.style.display = 'block';
                        dropZone.style.display = 'none';

                        // Show loading indicator
                        fileLoading.style.display = 'flex';
                        imgDetectCtx.clearRect(0, 0, imgDetectCanvas.width, imgDetectCanvas.height);

                        // Decode using czQR.readAll (deferred to let UI update)
                        setTimeout(() => {
                            try {
                                const results = czQR.readAll(img);
                                if (results.length > 0) {
                                    if (results.length === 1) {
                                        showResult(results[0].data, 'File', results[0].format);
                                        toast('✓ ' + (results[0].format === 'qr' ? 'QR Code' : 'Barcode [' + (results[0].format || '').toUpperCase() + ']') + ' decoded!');
                                    } else {
                                        showMultiResults(results, 'File');
                                        toast('✓ ' + results.length + ' codes decoded!');
                                    }
                                    playBeep();

                                    // Draw markers on the preview overlay
                                    const natW = img.naturalWidth || img.width;
                                    const natH = img.naturalHeight || img.height;
                                    // Wait for imgPreviewSrc to render, then match canvas to display size
                                    requestAnimationFrame(() => {
                                        const elW = imgPreviewSrc.clientWidth;
                                        const elH = imgPreviewSrc.clientHeight;
                                        imgDetectCanvas.width = elW;
                                        imgDetectCanvas.height = elH;
                                        // Compute object-fit: contain rendering area
                                        const imgAspect = natW / natH;
                                        const elAspect = elW / elH;
                                        let renderW, renderH, offX, offY;
                                        if (imgAspect > elAspect) {
                                            // Image wider than container → letterbox top/bottom
                                            renderW = elW;
                                            renderH = elW / imgAspect;
                                            offX = 0;
                                            offY = (elH - renderH) / 2;
                                        } else {
                                            // Image taller than container → pillarbox left/right
                                            renderH = elH;
                                            renderW = elH * imgAspect;
                                            offX = (elW - renderW) / 2;
                                            offY = 0;
                                        }
                                        drawDetections(imgDetectCtx, results, natW, natH, elW, elH, offX, offY, renderW, renderH);
                                    });
                                } else {
                                    toast('No QR code or barcode found in this image');
                                }
                            } catch (err) {
                                console.warn('File decode error:', err);
                                if (err.name === 'SecurityError') {
                                    toast('Cannot read image: cross-origin restriction');
                                } else {
                                    toast('Error decoding: ' + (err.message || 'Unknown error'));
                                }
                            } finally {
                                fileLoading.style.display = 'none';
                            }
                        }, 50);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            }

            fileInput.addEventListener('change', (e) => {
                if (e.target.files[0]) handleFile(e.target.files[0]);
            });

            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
            });

            btnClearImg.addEventListener('click', () => {
                imgPreview.style.display = 'none';
                dropZone.style.display = 'flex';
                fileInput.value = '';
                imgDetectCtx.clearRect(0, 0, imgDetectCanvas.width, imgDetectCanvas.height);
            });

            // === Paste support ===
            document.addEventListener('paste', (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                    if (item.type.startsWith('image/')) {
                        e.preventDefault();
                        handleFile(item.getAsFile());
                        // Switch to file tab
                        tabs.forEach(x => x.classList.remove('active'));
                        document.querySelector('[data-tab="file"]').classList.add('active');
                        Object.values(panels).forEach(p => p.classList.remove('active'));
                        panels.file.classList.add('active');
                        break;
                    }
                }
            });
        })();
    