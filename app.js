'use strict';

/* ===================== 常量 Constants ===================== */
const M_PER_FT = 0.3048;
const SQM_PER_SQFT = 0.09290304;

/* ===================== 工具函数 Helpers ===================== */
function fmt(n, digits) {
  if (!isFinite(n)) return '--';
  return n.toFixed(digits == null ? 2 : digits);
}
function toRad(deg) { return deg * Math.PI / 180; }
function toDeg(rad) { return rad * 180 / Math.PI; }
function angleDiff(a, b) {
  // shortest signed difference b-a in range [-180,180]
  return ((b - a + 540) % 360) - 180;
}

/* ===================== 设置 & 更多菜单 Settings & app menu ===================== */
const SETTINGS_KEY = 'site-measure-settings-v1';
const I18N = {
  'app.title': { zh: '工地测量工具', en: 'Site Measure Tool' },
  'tab.units': { zh: '单位换算', en: 'Units' },
  'tab.distance': { zh: '拍照测距', en: 'Distance' },
  'tab.level': { zh: '水平仪', en: 'Level' },
  'tab.triangle': { zh: '三角计算', en: 'Triangle' },
  'tab.room': { zh: '房间测绘', en: 'Room Scan' },
  'menu.about': { zh: '关于我们 About us', en: 'About us' },
  'menu.settings': { zh: '设置 Settings', en: 'Settings' },
  'menu.cancel': { zh: '取消 Cancel', en: 'Cancel' },
  'settings.title': { zh: '设置 Settings', en: 'Settings' },
  'settings.language': { zh: '语言 Language', en: 'Language' },
  'settings.lightTheme': { zh: '浅色主题 Light theme', en: 'Light theme' },
  'settings.levelVibrate': { zh: '水平仪震动提示 Level vibration', en: 'Level vibration' },
  'settings.clearData': { zh: '🗑️ 清除所有数据 Clear all data', en: '🗑️ Clear all data' }
};

let appSettings = {
  language: 'zh',
  defaultCamHeight: 1.2,
  defaultUnit: 'm',
  lightTheme: false,
  levelVibrate: true
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) appSettings = Object.assign(appSettings, JSON.parse(raw));
  } catch (err) { /* storage unavailable, ignore */ }
}

function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); } catch (err) { /* ignore */ }
}

// Generic bilingual-swap: every "<CN text><span class='en'>EN text</span>" label in the
// static HTML gets its bare Chinese text node wrapped once at startup, so the language
// toggle can hide/show it via CSS without needing a data-i18n tag on every single label.
function wrapBareZhTextBeforeEnSpans() {
  document.querySelectorAll('.en').forEach(enSpan => {
    const sib = enSpan.previousSibling;
    if (sib && sib.nodeType === Node.TEXT_NODE && sib.textContent.trim() !== '') {
      const span = document.createElement('span');
      span.className = 'zh-auto';
      sib.parentNode.insertBefore(span, sib);
      span.appendChild(sib);
    }
  });
}

function applyLanguage(lang) {
  document.documentElement.setAttribute('data-lang', lang);
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const entry = I18N[el.dataset.i18n];
    if (entry && entry[lang] != null) el.textContent = entry[lang];
  });
}

function applyTheme(light) {
  document.documentElement.setAttribute('data-theme', light ? 'light' : 'dark');
}

function prefillDefaultCamHeights() {
  if (!appSettings.defaultCamHeight) return;
  const roomHeightEl = document.getElementById('room-height');
  if (roomHeightEl && !roomHeightEl.value) roomHeightEl.value = appSettings.defaultCamHeight;
  const heightReadoutEl = document.getElementById('angle-height-readout');
  if (heightReadoutEl) {
    heightReadoutEl.textContent = '相机高度 Height: ' + fmt(appSettings.defaultCamHeight, 2) + 'm';
  }
}

// Formats a value already in meters/sqm as the user's preferred primary unit,
// with the other unit shown in parentheses — used by the headline result displays.
function fmtLen(meters, digits) {
  if (!isFinite(meters)) return '--';
  const d = digits == null ? 2 : digits;
  const ft = meters / M_PER_FT;
  return appSettings.defaultUnit === 'ft'
    ? fmt(ft, d) + ' ft (' + fmt(meters, d) + ' m)'
    : fmt(meters, d) + ' m (' + fmt(ft, d) + ' ft)';
}
function fmtArea(sqm, digits) {
  if (!isFinite(sqm)) return '--';
  const d = digits == null ? 2 : digits;
  const sqft = sqm / SQM_PER_SQFT;
  return appSettings.defaultUnit === 'ft'
    ? fmt(sqft, d) + ' sqft (' + fmt(sqm, d) + ' sqm)'
    : fmt(sqm, d) + ' sqm (' + fmt(sqft, d) + ' sqft)';
}

function refreshUnitDependentDisplays() {
  if (typeof renderAngleSegmentsList === 'function') renderAngleSegmentsList();
  if (typeof renderTriangle === 'function') renderTriangle();
  if (typeof updateRoomSummary === 'function') updateRoomSummary();
  if (typeof refPoints !== 'undefined' && refPoints.length === 4 && typeof evaluateRefPoints === 'function') evaluateRefPoints();
}

const btnMenu = document.getElementById('btn-menu');
const menuOverlay = document.getElementById('menu-overlay');
const aboutOverlay = document.getElementById('about-overlay');
const settingsOverlay = document.getElementById('settings-overlay');

btnMenu.addEventListener('click', () => { menuOverlay.hidden = false; });
menuOverlay.addEventListener('click', (e) => { if (e.target === menuOverlay) menuOverlay.hidden = true; });
document.getElementById('menu-cancel').addEventListener('click', () => { menuOverlay.hidden = true; });
document.getElementById('menu-about').addEventListener('click', () => { menuOverlay.hidden = true; aboutOverlay.hidden = false; });
document.getElementById('menu-settings').addEventListener('click', () => { menuOverlay.hidden = true; settingsOverlay.hidden = false; });
document.getElementById('about-close').addEventListener('click', () => { aboutOverlay.hidden = true; });
aboutOverlay.addEventListener('click', (e) => { if (e.target === aboutOverlay) aboutOverlay.hidden = true; });
document.getElementById('settings-close').addEventListener('click', () => { settingsOverlay.hidden = true; });
settingsOverlay.addEventListener('click', (e) => { if (e.target === settingsOverlay) settingsOverlay.hidden = true; });

document.getElementById('set-language').addEventListener('change', (e) => {
  appSettings.language = e.target.value;
  applyLanguage(appSettings.language);
  saveSettings();
});
document.getElementById('set-default-height').addEventListener('input', (e) => {
  appSettings.defaultCamHeight = e.target.value ? parseFloat(e.target.value) : null;
  saveSettings();
  prefillDefaultCamHeights();
});
document.getElementById('set-default-unit').addEventListener('change', (e) => {
  appSettings.defaultUnit = e.target.value;
  saveSettings();
  refreshUnitDependentDisplays();
});
document.getElementById('set-light-theme').addEventListener('change', (e) => {
  appSettings.lightTheme = e.target.checked;
  applyTheme(appSettings.lightTheme);
  saveSettings();
});
document.getElementById('set-level-vibrate').addEventListener('change', (e) => {
  appSettings.levelVibrate = e.target.checked;
  saveSettings();
});
document.getElementById('btn-clear-data').addEventListener('click', () => {
  if (!confirm('确定要清除所有本地保存的数据吗？（房间测绘记录、设置等都会被清除）\nClear all locally saved data (room scans, settings, etc)?')) return;
  localStorage.clear();
  location.reload();
});

function applySettingsToUI() {
  applyLanguage(appSettings.language);
  applyTheme(appSettings.lightTheme);
  document.getElementById('set-language').value = appSettings.language;
  document.getElementById('set-default-height').value = appSettings.defaultCamHeight || '';
  document.getElementById('set-default-unit').value = appSettings.defaultUnit;
  document.getElementById('set-light-theme').checked = appSettings.lightTheme;
  document.getElementById('set-level-vibrate').checked = appSettings.levelVibrate;
  prefillDefaultCamHeights();
}

loadSettings();
wrapBareZhTextBeforeEnSpans();
applySettingsToUI();

/* ===================== Tab 导航 ===================== */
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPages = document.querySelectorAll('.tab-page');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    tabButtons.forEach(b => b.classList.toggle('active', b === btn));
    tabPages.forEach(p => p.hidden = (p.dataset.tab !== target));
    stopCamerasExcept(target);
    if (target === 'distance' && document.querySelector('.mode-btn[data-mode="angle"]').classList.contains('active')) {
      initAngleMode();
    }
    if (target === 'room' && typeof initRoomMode === 'function') {
      initRoomMode();
    }
  });
});

/* ===================== 单位换算 ===================== */
const lenM = document.getElementById('len-m');
const lenFt = document.getElementById('len-ft');
lenM.addEventListener('input', () => {
  if (lenM.value === '') { lenFt.value = ''; return; }
  lenFt.value = fmt(parseFloat(lenM.value) / M_PER_FT, 4);
});
lenFt.addEventListener('input', () => {
  if (lenFt.value === '') { lenM.value = ''; return; }
  lenM.value = fmt(parseFloat(lenFt.value) * M_PER_FT, 4);
});

const areaSqm = document.getElementById('area-sqm');
const areaSqft = document.getElementById('area-sqft');
areaSqm.addEventListener('input', () => {
  if (areaSqm.value === '') { areaSqft.value = ''; return; }
  areaSqft.value = fmt(parseFloat(areaSqm.value) / SQM_PER_SQFT, 4);
});
areaSqft.addEventListener('input', () => {
  if (areaSqft.value === '') { areaSqm.value = ''; return; }
  areaSqm.value = fmt(parseFloat(areaSqft.value) * SQM_PER_SQFT, 4);
});

/* ===================== 相机管理 Camera management ===================== */
// videoId -> MediaStream
const activeStreams = {};

async function startCamera(videoEl) {
  if (activeStreams[videoEl.id]) return activeStreams[videoEl.id];
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });
    videoEl.srcObject = stream;
    activeStreams[videoEl.id] = stream;
    return stream;
  } catch (err) {
    alert('无法开启相机 Camera error: ' + err.message);
    return null;
  }
}

function stopCamera(videoEl) {
  const stream = activeStreams[videoEl.id];
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    delete activeStreams[videoEl.id];
  }
  if (videoEl) videoEl.srcObject = null;
}

function stopCamerasExcept(keepTab) {
  const map = {
    distance: ['video-angle', 'video-ref'],
    level: ['video-level'],
    room: ['video-room']
  };
  Object.keys(map).forEach(tab => {
    if (tab === keepTab) return;
    map[tab].forEach(id => {
      const el = document.getElementById(id);
      if (el) stopCamera(el);
    });
  });
}

/* ===================== 方向感应 Device orientation ===================== */
let currentBeta = null;   // 前后倾斜 front-back tilt
let currentGamma = null;  // 左右滚动 roll
let currentAlpha = null;  // 罗盘 compass (relative is fine)
let currentAccel = null;  // {x,y,z} accelerationIncludingGravity, for gimbal-lock-free level readings
let motionEnabled = false;

async function ensureMotionPermission() {
  if (motionEnabled) return true;
  try {
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      const res = await DeviceOrientationEvent.requestPermission();
      if (res !== 'granted') {
        alert('需要方向感应权限才能使用此功能 Motion permission denied');
        return false;
      }
    }
    if (typeof DeviceMotionEvent !== 'undefined' &&
        typeof DeviceMotionEvent.requestPermission === 'function') {
      const resM = await DeviceMotionEvent.requestPermission();
      if (resM !== 'granted') {
        alert('需要运动感应权限才能使用水平仪 Motion permission denied');
        return false;
      }
    }
    window.addEventListener('deviceorientation', onOrientation);
    window.addEventListener('devicemotion', onDeviceMotion);
    motionEnabled = true;
    return true;
  } catch (err) {
    alert('方向感应不可用 Sensor unavailable: ' + err.message);
    return false;
  }
}

function onOrientation(e) {
  if (e.beta === null) return;
  currentBeta = e.beta;
  currentGamma = e.gamma;
  currentAlpha = e.alpha != null ? e.alpha : currentAlpha;
  updateAngleReadout();
  updateRoomAngleReadout();
  if (typeof renderAngleOverlay === 'function') renderAngleOverlay();
  if (typeof renderRoomOverlay === 'function') renderRoomOverlay();
}

/* ---- 通用校准弹窗 Shared calibrate modal (Distance + Room Scan) ---- */
const calibrateOverlay = document.getElementById('calibrate-overlay');
const btnDoCalibrate = document.getElementById('btn-do-calibrate');
let calibrateCallback = null;

function showCalibrateModal(onDone) {
  calibrateCallback = onDone;
  calibrateOverlay.hidden = false;
}
btnDoCalibrate.addEventListener('click', () => {
  calibrationBeta = currentBeta;
  calibrateOverlay.hidden = true;
  const cb = calibrateCallback;
  calibrateCallback = null;
  if (cb) cb();
});

/* ---- 通用屏幕投影 Shared angular->screen projection (AR-style overlay) ---- */
const AR_HFOV = 55, AR_VFOV = 70;
function projectToScreen(tiltAtCapture, headingAtCapture) {
  const tilt = currentTiltFromHorizontal();
  const heading = currentAlpha || 0;
  if (tilt == null) return null;
  const deltaHeading = angleDiff(heading, headingAtCapture);
  const deltaTilt = tiltAtCapture - tilt;
  let x = 50 + (deltaHeading / AR_HFOV) * 100;
  let y = 50 - (deltaTilt / AR_VFOV) * 100;
  x = Math.max(4, Math.min(96, x));
  y = Math.max(4, Math.min(96, y));
  return { x, y };
}

function onDeviceMotion(e) {
  const g = e.accelerationIncludingGravity;
  if (!g || g.x == null || g.y == null || g.z == null) return;
  currentAccel = { x: g.x, y: g.y, z: g.z };
  updateLevelReadout();
}

/* ===================== 拍照测距: 模式切换 ===================== */
const modeButtons = document.querySelectorAll('.mode-btn[data-mode]');
const modePanels = { angle: document.getElementById('mode-angle'), ref: document.getElementById('mode-ref') };
modeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    modeButtons.forEach(b => b.classList.toggle('active', b === btn));
    Object.entries(modePanels).forEach(([k, el]) => el.classList.toggle('active', k === btn.dataset.mode));
    // stop the camera of the panel we're leaving
    const leaving = btn.dataset.mode === 'angle' ? 'video-ref' : 'video-angle';
    stopCamera(document.getElementById(leaving));
    if (btn.dataset.mode === 'angle') initAngleMode();
  });
});

/* ===================== 模式 A: 角度 + 高度法 (多点链式 + AR 实时叠加) ===================== */
const videoAngle = document.getElementById('video-angle');
const btnUndoAngle = document.getElementById('btn-undo-angle');
const btnCaptureAngle = document.getElementById('btn-capture-angle');
const btnResetAngle = document.getElementById('btn-reset-angle');
const angleReadout = document.getElementById('angle-readout');
const angleHeightReadout = document.getElementById('angle-height-readout');
const angleSegmentsList = document.getElementById('angle-segments-list');
const arSvgAngle = document.getElementById('ar-svg-angle');

let calibrationBeta = null;
let anglePoints = []; // [{label, tiltSigned, heading, dist}]

async function initAngleMode() {
  await ensureMotionPermission();
  angleHeightReadout.textContent = '相机高度 Height: ' + (appSettings.defaultCamHeight ? fmt(appSettings.defaultCamHeight, 2) + 'm' : '--');
  const alreadyRunning = !!activeStreams[videoAngle.id];
  await startCamera(videoAngle);
  if (!alreadyRunning) {
    showCalibrateModal(() => renderAngleOverlay());
  }
}

function currentTiltFromHorizontal() {
  if (calibrationBeta == null || currentBeta == null) return null;
  return currentBeta - calibrationBeta;
}

function updateAngleReadout() {
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    angleReadout.textContent = '俯仰角 tilt: --° (请先校准)';
  } else {
    angleReadout.textContent = '俯仰角 tilt: ' + fmt(Math.abs(tilt), 1) + '°';
  }
}

function distanceFromHeightAngle(height, tiltDeg) {
  const t = Math.abs(tiltDeg);
  if (t < 1) return null; // too small, unreliable
  return height / Math.tan(toRad(t));
}

function segmentDistance(p1, p2) {
  const theta = toRad(Math.abs(angleDiff(p1.heading, p2.heading)));
  return Math.sqrt(p1.dist * p1.dist + p2.dist * p2.dist - 2 * p1.dist * p2.dist * Math.cos(theta));
}

btnCaptureAngle.addEventListener('click', () => {
  const height = appSettings.defaultCamHeight;
  if (!height || height <= 0) {
    alert('请先在「设置」中设定相机高度 Please set camera height in Settings first');
    return;
  }
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    alert('请先校准 Please calibrate first');
    return;
  }
  const dist = distanceFromHeightAngle(height, tilt);
  if (dist == null) {
    alert('倾角太小，无法估算距离，请对准目标点再试 Angle too small');
    return;
  }
  const label = String.fromCharCode(65 + anglePoints.length);
  anglePoints.push({ label, tiltSigned: tilt, heading: currentAlpha || 0, dist });
  renderAngleSegmentsList();
  renderAngleOverlay();
});

btnUndoAngle.addEventListener('click', () => {
  anglePoints.pop();
  renderAngleSegmentsList();
  renderAngleOverlay();
});

btnResetAngle.addEventListener('click', () => {
  anglePoints = [];
  renderAngleSegmentsList();
  renderAngleOverlay();
});

function renderAngleSegmentsList() {
  if (anglePoints.length === 0) {
    angleSegmentsList.innerHTML = '<p class="hint">点击上方 ✛ 按钮开始添加点 A、B、C... <span class="en">Tap the ✛ button above to add points A, B, C...</span></p>';
    document.getElementById('res-total').textContent = '--';
    return;
  }
  let html = '';
  let total = 0;
  for (let i = 0; i < anglePoints.length - 1; i++) {
    const a = anglePoints[i], b = anglePoints[i + 1];
    const d = segmentDistance(a, b);
    total += d;
    html += `<div class="result-row"><span>${a.label} → ${b.label}</span><b>${fmtLen(d)}</b></div>`;
  }
  if (anglePoints.length === 1) {
    html += `<div class="result-row"><span>点 ${anglePoints[0].label} Point ${anglePoints[0].label}</span><b>${fmtLen(anglePoints[0].dist)} (距相机)</b></div>`;
  }
  angleSegmentsList.innerHTML = html;
  document.getElementById('res-total').textContent = anglePoints.length >= 2 ? fmtLen(total) : '--';
}

function renderAngleOverlay() {
  if (!arSvgAngle || !modePanels.angle.classList.contains('active')) return;
  const ns = 'http://www.w3.org/2000/svg';
  arSvgAngle.innerHTML = '';
  if (calibrationBeta == null) return;

  const projected = anglePoints.map(p => projectToScreen(p.tiltSigned, p.heading));

  // segment lines between captured points (fixed distance labels)
  for (let i = 0; i < anglePoints.length - 1; i++) {
    if (!projected[i] || !projected[i + 1]) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', projected[i].x); line.setAttribute('y1', projected[i].y);
    line.setAttribute('x2', projected[i + 1].x); line.setAttribute('y2', projected[i + 1].y);
    line.setAttribute('class', 'ar-line');
    arSvgAngle.appendChild(line);
    const mid = { x: (projected[i].x + projected[i + 1].x) / 2, y: (projected[i].y + projected[i + 1].y) / 2 };
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', mid.x); label.setAttribute('y', mid.y - 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'ar-label');
    label.textContent = fmt(segmentDistance(anglePoints[i], anglePoints[i + 1]), 2) + 'm';
    arSvgAngle.appendChild(label);
  }

  // live line from last captured point to current aim (center), with live distance
  if (anglePoints.length > 0) {
    const last = anglePoints[anglePoints.length - 1];
    const lastProj = projected[projected.length - 1];
    const height = appSettings.defaultCamHeight;
    const tilt = currentTiltFromHorizontal();
    const liveDist = height ? distanceFromHeightAngle(height, tilt) : null;
    if (lastProj) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', lastProj.x); line.setAttribute('y1', lastProj.y);
      line.setAttribute('x2', 50); line.setAttribute('y2', 50);
      line.setAttribute('class', 'ar-line-live');
      arSvgAngle.appendChild(line);
    }
    if (liveDist != null) {
      const liveSeg = segmentDistance(last, { heading: currentAlpha || 0, dist: liveDist });
      const label = document.createElementNS(ns, 'text');
      label.setAttribute('x', 50); label.setAttribute('y', 44);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('class', 'ar-label');
      label.textContent = fmt(liveSeg, 2) + 'm';
      arSvgAngle.appendChild(label);
    }
  }

  // dots + labels for captured points
  anglePoints.forEach((p, i) => {
    const s = projected[i];
    if (!s) return;
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); dot.setAttribute('r', 2.2);
    dot.setAttribute('class', 'ar-dot');
    arSvgAngle.appendChild(dot);
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', s.x); label.setAttribute('y', s.y - 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'ar-label');
    label.textContent = p.label;
    arSvgAngle.appendChild(label);
  });
}

/* ===================== 模式 B: 参考物校正法 ===================== */
const videoRef = document.getElementById('video-ref');
const canvasRef = document.getElementById('canvas-ref');
const ctxRef = canvasRef.getContext('2d');
const btnStartCamRef = document.getElementById('btn-start-cam-ref');
const btnSnapRef = document.getElementById('btn-snap-ref');
const btnUndoRef = document.getElementById('btn-undo-ref');
const btnResetRef = document.getElementById('btn-reset-ref');
const refLengthInput = document.getElementById('ref-length');
const refHint = document.getElementById('ref-hint');

let frameCanvas = null; // offscreen canvas holding the frozen photo
let refPoints = []; // up to 4 points {x,y}
let frozen = false;

btnStartCamRef.addEventListener('click', async () => {
  frozen = false;
  refPoints = [];
  frameCanvas = null;
  canvasRef.style.display = 'none';
  videoRef.style.display = 'block';
  await startCamera(videoRef);
});

function drawCover(ctx, video, cw, ch) {
  const vw = video.videoWidth, vh = video.videoHeight;
  if (!vw || !vh) return;
  const vAspect = vw / vh, cAspect = cw / ch;
  let sx, sy, sw, sh;
  if (vAspect > cAspect) {
    sh = vh; sw = vh * cAspect; sx = (vw - sw) / 2; sy = 0;
  } else {
    sw = vw; sh = vw / cAspect; sx = 0; sy = (vh - sh) / 2;
  }
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cw, ch);
}

btnSnapRef.addEventListener('click', () => {
  if (!activeStreams[videoRef.id]) {
    alert('请先开启相机 Please start camera first');
    return;
  }
  const wrap = document.getElementById('camwrap-ref');
  const rect = wrap.getBoundingClientRect();
  const cw = Math.round(rect.width), ch = Math.round(rect.height);

  frameCanvas = document.createElement('canvas');
  frameCanvas.width = cw; frameCanvas.height = ch;
  drawCover(frameCanvas.getContext('2d'), videoRef, cw, ch);

  canvasRef.width = cw; canvasRef.height = ch;
  videoRef.style.display = 'none';
  canvasRef.style.display = 'block';
  frozen = true;
  refPoints = [];
  redrawRefCanvas();
  stopCamera(videoRef);
  refHint.textContent = '先点参考物两端 (2点)，再点目标两端 (2点)。';
});

function redrawRefCanvas() {
  if (!frameCanvas) return;
  ctxRef.drawImage(frameCanvas, 0, 0);
  refPoints.forEach((p, i) => {
    ctxRef.fillStyle = i < 2 ? '#33c17a' : '#ffb020';
    ctxRef.beginPath();
    ctxRef.arc(p.x, p.y, 7, 0, Math.PI * 2);
    ctxRef.fill();
  });
  if (refPoints.length >= 2) drawLine(refPoints[0], refPoints[1], '#33c17a');
  if (refPoints.length >= 4) drawLine(refPoints[2], refPoints[3], '#ffb020');
}

function drawLine(p1, p2, color) {
  ctxRef.strokeStyle = color;
  ctxRef.lineWidth = 3;
  ctxRef.beginPath();
  ctxRef.moveTo(p1.x, p1.y);
  ctxRef.lineTo(p2.x, p2.y);
  ctxRef.stroke();
}

function pixelDist(p1, p2) {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

canvasRef.addEventListener('click', (e) => {
  if (!frozen || refPoints.length >= 4) return;
  const rect = canvasRef.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvasRef.width / rect.width);
  const y = (e.clientY - rect.top) * (canvasRef.height / rect.height);
  refPoints.push({ x, y });
  redrawRefCanvas();
  evaluateRefPoints();
});

function evaluateRefPoints() {
  if (refPoints.length === 2) {
    const px = pixelDist(refPoints[0], refPoints[1]);
    document.getElementById('res-ref-px').textContent = fmt(px, 1) + ' px';
  }
  if (refPoints.length === 4) {
    const refLenCm = parseFloat(refLengthInput.value);
    if (!refLenCm || refLenCm <= 0) {
      alert('请输入参考物实际长度 Please enter reference length');
      return;
    }
    const refPx = pixelDist(refPoints[0], refPoints[1]);
    const targetPx = pixelDist(refPoints[2], refPoints[3]);
    const scale = (refLenCm / 100) / refPx; // meters per pixel
    const targetM = targetPx * scale;
    document.getElementById('res-ref-dist').textContent = fmtLen(targetM, 3);
  }
}

btnUndoRef.addEventListener('click', () => {
  refPoints.pop();
  redrawRefCanvas();
});

btnResetRef.addEventListener('click', () => {
  refPoints = [];
  document.getElementById('res-ref-px').textContent = '--';
  document.getElementById('res-ref-dist').textContent = '--';
  if (frameCanvas) redrawRefCanvasBlank();
});

function redrawRefCanvasBlank() {
  ctxRef.clearRect(0, 0, canvasRef.width, canvasRef.height);
  if (frameCanvas) ctxRef.drawImage(frameCanvas, 0, 0);
}

/* ===================== 水平仪 Level ===================== */
const videoLevel = document.getElementById('video-level');
const btnStartCamLevel = document.getElementById('btn-start-cam-level');
const btnSnapLevel = document.getElementById('btn-snap-level');
const levelReadout = document.getElementById('level-readout');
const lineH = document.getElementById('line-h');
const lineV = document.getElementById('line-v');

btnStartCamLevel.addEventListener('click', async () => {
  await ensureMotionPermission();
  await startCamera(videoLevel);
});

btnSnapLevel.addEventListener('click', () => {
  if (!activeStreams[videoLevel.id]) {
    alert('请先开启相机 Please start the camera first');
    return;
  }
  const wrap = document.getElementById('camwrap-level');
  const rect = wrap.getBoundingClientRect();
  const cw = Math.round(rect.width), ch = Math.round(rect.height);
  const canvas = document.createElement('canvas');
  canvas.width = cw; canvas.height = ch;
  const ctx = canvas.getContext('2d');
  drawCover(ctx, videoLevel, cw, ch);

  const roll = currentAccel ? toDeg(Math.atan2(currentAccel.x, currentAccel.y)) : 0;
  const pitch = currentAccel ? toDeg(Math.atan2(-currentAccel.z, Math.sqrt(currentAccel.x ** 2 + currentAccel.y ** 2))) : 0;
  const level = Math.abs(roll) < 0.7;
  ctx.strokeStyle = level ? '#33c17a' : '#e14b4b';
  ctx.lineWidth = 2;
  ctx.save();
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate(toRad(-roll));
  ctx.beginPath();
  ctx.moveTo(-cw, 0); ctx.lineTo(cw, 0);
  ctx.moveTo(0, -ch); ctx.lineTo(0, ch);
  ctx.stroke();
  ctx.restore();

  ctx.font = '600 15px sans-serif';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, ch - 34, 230, 26);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('roll: ' + fmt(roll, 1) + '°  pitch: ' + fmt(pitch, 1) + '°', 14, ch - 21);

  canvas.toBlob(blob => downloadBlob(blob, 'level-screenshot.jpg'), 'image/jpeg', 0.92);
});

function updateLevelReadout() {
  if (!currentAccel) return;
  // Roll/pitch computed from the raw gravity vector (not beta/gamma Euler angles),
  // so the reading stays correct even when the phone is tilted steeply — Euler angles
  // degenerate ("gimbal lock") near pitch ±90°, which is exactly when a level reading
  // is most needed (e.g. aiming the camera up at a window frame).
  const { x, y, z } = currentAccel;
  const roll = toDeg(Math.atan2(x, y));
  const pitch = toDeg(Math.atan2(-z, Math.sqrt(x * x + y * y)));
  levelReadout.textContent = '左右 roll: ' + fmt(roll, 1) + '°  |  前后 pitch: ' + fmt(pitch, 1) + '°';

  const rot = -roll;
  lineH.style.transform = `rotate(${rot}deg)`;
  lineV.style.transform = `rotate(${rot}deg)`;
  const level = Math.abs(roll) < 0.7;
  lineH.classList.toggle('level', level);
  lineV.classList.toggle('level', level);
  if (level && appSettings.levelVibrate && navigator.vibrate && !updateLevelReadout._vibrated) {
    navigator.vibrate(15);
    updateLevelReadout._vibrated = true;
  } else if (!level) {
    updateLevelReadout._vibrated = false;
  }
}

/* ===================== 三角计算 Triangle (图形化 interactive) ===================== */
const tmodeButtons = document.querySelectorAll('.mode-btn[data-tmode]');
const whOnly = document.querySelectorAll('.tri-wh-only');
const waOnly = document.querySelectorAll('.tri-wa-only');
const triHeightWrap = document.getElementById('tri-input-height-wrap');
const triAngleWrap = document.getElementById('tri-input-angle-wrap');
const triWidthInput = document.getElementById('tri-width');
const triHeightInput = document.getElementById('tri-height');
const triAngleInput = document.getElementById('tri-angle');
let triMode = 'wh';

tmodeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    tmodeButtons.forEach(b => b.classList.toggle('active', b === btn));
    triMode = btn.dataset.tmode;
    whOnly.forEach(el => el.hidden = triMode !== 'wh');
    waOnly.forEach(el => el.hidden = triMode !== 'wa');
    triHeightWrap.hidden = triMode !== 'wh';
    triAngleWrap.hidden = triMode !== 'wa';
    renderTriangle();
  });
});

function triGetWidth() {
  const v = parseFloat(triWidthInput.value);
  return (v > 0) ? v : 3;
}
function triGetHeight() {
  const v = parseFloat(triHeightInput.value);
  return (v > 0) ? v : 4;
}
function triGetAngle() {
  const v = parseFloat(triAngleInput.value);
  return (v > 0 && v < 90) ? v : 53.13;
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function renderTriangle() {
  const width = triGetWidth();
  let height, angle;
  if (triMode === 'wh') {
    height = triGetHeight();
    angle = toDeg(Math.atan(height / width));
  } else {
    angle = triGetAngle();
    height = width * Math.tan(toRad(angle));
  }
  const slope = Math.sqrt(width * width + height * height);

  const originX = 78, originY = 250;
  const maxDrawW = 320 - originX - 40;
  const maxDrawH = originY - 40;
  const scale = Math.min(maxDrawW / width, maxDrawH / height);

  const O = { x: originX, y: originY };
  const W = { x: originX + width * scale, y: originY };
  const H = { x: originX, y: originY - height * scale };

  document.getElementById('tri-shape').setAttribute('points', `${O.x},${O.y} ${W.x},${W.y} ${H.x},${H.y}`);

  const rm = 14;
  document.getElementById('tri-right-angle-mark').setAttribute('d',
    `M ${O.x} ${O.y - rm} L ${O.x + rm} ${O.y - rm} L ${O.x + rm} ${O.y}`);

  // angle arc at W between edge-to-O and edge-to-H
  const r = 30;
  const dirToO = normalize({ x: O.x - W.x, y: O.y - W.y });
  const dirToH = normalize({ x: H.x - W.x, y: H.y - W.y });
  const p1 = { x: W.x + dirToO.x * r, y: W.y + dirToO.y * r };
  const p2 = { x: W.x + dirToH.x * r, y: W.y + dirToH.y * r };
  document.getElementById('tri-arc').setAttribute('d', `M ${p1.x} ${p1.y} A ${r} ${r} 0 0 1 ${p2.x} ${p2.y}`);

  const bisector = normalize({ x: dirToO.x + dirToH.x, y: dirToO.y + dirToH.y });
  const angleLabelPos = { x: W.x + bisector.x * (r + 20), y: W.y + bisector.y * (r + 20) };
  const angleLabel = document.getElementById('tri-label-angle');
  angleLabel.setAttribute('x', angleLabelPos.x);
  angleLabel.setAttribute('y', angleLabelPos.y);
  angleLabel.setAttribute('text-anchor', 'middle');
  angleLabel.textContent = fmt(angle, 1) + '°';

  const midHW = { x: (H.x + W.x) / 2, y: (H.y + W.y) / 2 };
  const edge = { x: W.x - H.x, y: W.y - H.y };
  let normal = normalize({ x: edge.y, y: -edge.x });
  const towardO = { x: O.x - midHW.x, y: O.y - midHW.y };
  if (normal.x * towardO.x + normal.y * towardO.y > 0) { normal.x *= -1; normal.y *= -1; }
  const slopeLabelPos = { x: midHW.x + normal.x * 18, y: midHW.y + normal.y * 18 };
  const slopeLabel = document.getElementById('tri-label-slope');
  slopeLabel.setAttribute('x', slopeLabelPos.x);
  slopeLabel.setAttribute('y', slopeLabelPos.y);
  slopeLabel.setAttribute('text-anchor', 'middle');
  slopeLabel.textContent = fmt(slope, 2) + 'm';

  document.getElementById('tri-res-angle').textContent = fmt(angle, 2) + '°';
  document.getElementById('tri-res-height').textContent = fmtLen(height, 3);
  document.getElementById('tri-res-slope').textContent = fmtLen(slope, 3);
}

[triWidthInput, triHeightInput, triAngleInput].forEach(el => el.addEventListener('input', renderTriangle));
renderTriangle();

/* ===================== 房间测绘 Room Scan ===================== */
const videoRoom = document.getElementById('video-room');
const roomAngleReadout = document.getElementById('room-angle-readout');
const roomHeightReadout = document.getElementById('room-height-readout');
const btnUndoRoom = document.getElementById('btn-undo-room');
const btnCaptureRoom = document.getElementById('btn-capture-room');
const roomHeightTargetCard = document.getElementById('room-height-target-card');
const roomHeightTargetLabel = document.getElementById('room-height-target-label');
const btnConfirmHeight = document.getElementById('btn-confirm-height');
const roomPointsListEl = document.getElementById('room-points-list');
const btnResetRoom = document.getElementById('btn-reset-room');
const roomPlanSvg = document.getElementById('room-plan-svg');
const arSvgRoom = document.getElementById('ar-svg-room');
const roomRemarksInput = document.getElementById('room-remarks');
const btnExportJpg = document.getElementById('btn-export-jpg');
const btnExportPdf = document.getElementById('btn-export-pdf');
const planPagerLabel = document.getElementById('plan-pager-label');
const planPageContent = document.getElementById('plan-page-content');
const btnPlanPrev = document.getElementById('btn-plan-prev');
const btnPlanNext = document.getElementById('btn-plan-next');

const ROOM_STORAGE_KEY = 'site-measure-room-scan-v3';
const WALL_LABEL_COLOR = '#ffb020';

let roomRefHeading = null;
let roomFloorPoints = []; // {d, heading, x, y, height, tiltAtCapture, tiltSigned, label, num}
let roomWallOverrides = {}; // key "labelA|labelB" (sorted) -> ceiling width override (m)
let roomPendingHeightTarget = null; // {pIndex, label}
let roomPointCounter = 0;
let roomPlanPage = 0; // 0 = floor, 1..n = wall i, n+1 = ceiling

async function initRoomMode() {
  await ensureMotionPermission();
  roomHeightReadout.textContent = '相机高度 Height: ' + (appSettings.defaultCamHeight ? fmt(appSettings.defaultCamHeight, 2) + 'm' : '--');
  const alreadyRunning = !!activeStreams[videoRoom.id];
  await startCamera(videoRoom);
  if (!alreadyRunning) {
    showCalibrateModal(() => renderRoomOverlay());
  }
}

function updateRoomAngleReadout() {
  if (!roomAngleReadout) return;
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    roomAngleReadout.textContent = '俯仰角 tilt: --° (请先校准)';
  } else {
    roomAngleReadout.textContent = '俯仰角 tilt: ' + fmt(tilt, 1) + '°';
  }
}

function roomRelHeadingXY(d, heading) {
  if (roomRefHeading == null) roomRefHeading = heading;
  const rel = toRad(angleDiff(roomRefHeading, heading));
  return { x: d * Math.cos(rel), y: d * Math.sin(rel) };
}

function captureGroundPoint(label) {
  const height = appSettings.defaultCamHeight;
  if (!height || height <= 0) {
    alert('请先在「设置」中设定相机高度 Please set camera height in Settings first');
    return null;
  }
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    alert('请先校准 Please calibrate first');
    return null;
  }
  if (tilt >= -1) {
    alert('请把手机往下倾斜，瞄准地板角落 Please tilt down to aim at the floor corner');
    return null;
  }
  const d = distanceFromHeightAngle(height, tilt);
  if (d == null) {
    alert('倾角太小，无法估算距离 Angle too small');
    return null;
  }
  const heading = currentAlpha || 0;
  const xy = roomRelHeadingXY(d, heading);
  return { d, heading, x: xy.x, y: xy.y, height: null, tiltAtCapture: null, tiltSigned: tilt, label };
}

btnCaptureRoom.addEventListener('click', () => {
  roomPointCounter++;
  const label = '点' + roomPointCounter;
  const p = captureGroundPoint(label);
  if (!p) { roomPointCounter--; return; }
  p.num = roomPointCounter;
  roomFloorPoints.push(p);
  renderRoomPointsList();
  renderRoomPlan();
  renderRoomOverlay();
  saveRoomState();
});

function requestHeightFor(target) {
  roomPendingHeightTarget = target;
  roomHeightTargetLabel.textContent = target.label;
  roomHeightTargetCard.hidden = false;
}

btnConfirmHeight.addEventListener('click', () => {
  if (!roomPendingHeightTarget) return;
  const tilt = currentTiltFromHorizontal();
  const height = appSettings.defaultCamHeight;
  if (tilt == null || !height) {
    alert('请先校准 Please calibrate first');
    return;
  }
  const base = roomFloorPoints[roomPendingHeightTarget.pIndex];
  base.tiltAtCapture = tilt;
  base.height = height + base.d * Math.tan(toRad(tilt));
  roomPendingHeightTarget = null;
  roomHeightTargetCard.hidden = true;
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
});

function renderRoomPointsList() {
  if (roomFloorPoints.length === 0) {
    roomPointsListEl.innerHTML = '<p class="hint">尚未记录任何点。</p>';
    return;
  }
  roomPointsListEl.innerHTML = '';
  roomFloorPoints.forEach((p, i) => {
    const target = { pIndex: i, label: p.label };
    const row = document.createElement('div');
    row.className = 'room-point-item';
    const heightText = p.height != null ? (' → 高度 ' + fmt(p.height, 2) + 'm') : '';
    const { poly, idx } = getPolygonAndIndex(target);
    const angle = cornerInteriorAngle(poly, idx);
    const angleText = angle != null ? (' · 转角≈' + fmt(angle, 1) + '°') : '';
    const span = document.createElement('span');
    span.innerHTML = `${p.label} <span class="en">Point ${p.num}</span> (d=${fmt(p.d, 2)}m)${heightText}${angleText}`;
    row.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'rp-actions';

    const btnHeight = document.createElement('button');
    btnHeight.textContent = p.height != null ? '重测顶部' : '+顶部高度';
    btnHeight.addEventListener('click', () => requestHeightFor(target));
    actions.appendChild(btnHeight);

    if (angle != null) {
      const btnAngle = document.createElement('button');
      btnAngle.className = 'rp-btn-edit';
      btnAngle.textContent = '∠';
      btnAngle.title = '编辑转角角度 Edit turning angle';
      btnAngle.addEventListener('click', () => editRoomCornerAngle(target));
      actions.appendChild(btnAngle);
    }

    const btnEdit = document.createElement('button');
    btnEdit.className = 'rp-btn-edit';
    btnEdit.textContent = '✎';
    btnEdit.title = '编辑 Edit';
    btnEdit.addEventListener('click', () => editRoomPoint(target));
    actions.appendChild(btnEdit);

    const btnDelete = document.createElement('button');
    btnDelete.className = 'rp-btn-delete';
    btnDelete.textContent = '✕';
    btnDelete.title = '删除 Delete';
    btnDelete.addEventListener('click', () => deleteRoomPoint(target));
    actions.appendChild(btnDelete);

    row.appendChild(actions);
    roomPointsListEl.appendChild(row);
  });
}

function getPolygonAndIndex(target) {
  const p = getRoomPoint(target);
  const poly = orderedFloorPoints();
  return { poly, idx: poly.indexOf(p) };
}

function cornerInteriorAngle(poly, idx) {
  const n = poly.length;
  if (n < 3 || idx < 0) return null;
  const prev = poly[(idx - 1 + n) % n];
  const curr = poly[idx];
  const next = poly[(idx + 1) % n];
  const v1 = normalize({ x: prev.x - curr.x, y: prev.y - curr.y });
  const v2 = normalize({ x: next.x - curr.x, y: next.y - curr.y });
  let dot = v1.x * v2.x + v1.y * v2.y;
  dot = Math.max(-1, Math.min(1, dot));
  return toDeg(Math.acos(dot));
}

function shortestAngleDiffRad(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function editRoomCornerAngle(target) {
  const { poly, idx } = getPolygonAndIndex(target);
  const n = poly.length;
  if (n < 3 || idx < 0) return;
  const curr = poly[idx];
  const prev = poly[(idx - 1 + n) % n];
  const next = poly[(idx + 1) % n];
  const currentAngle = cornerInteriorAngle(poly, idx);

  const input = prompt('修改 ' + target.label + ' 的转角角度（度），默认为估计值：\nEdit turning angle in degrees (default is the estimated value):', fmt(currentAngle, 1));
  if (input == null) return;
  const targetAngle = parseFloat(input);
  if (!targetAngle || targetAngle <= 0 || targetAngle >= 360) {
    alert('请输入 0~360 之间的有效角度 Please enter a valid angle between 0 and 360');
    return;
  }

  const L1 = Math.hypot(curr.x - prev.x, curr.y - prev.y);
  function angleAtTheta(theta) {
    const cx = prev.x + L1 * Math.cos(theta);
    const cy = prev.y + L1 * Math.sin(theta);
    const v1 = normalize({ x: prev.x - cx, y: prev.y - cy });
    const v2 = normalize({ x: next.x - cx, y: next.y - cy });
    let dot = v1.x * v2.x + v1.y * v2.y;
    dot = Math.max(-1, Math.min(1, dot));
    return toDeg(Math.acos(dot));
  }

  const baseTheta = Math.atan2(curr.y - prev.y, curr.x - prev.x);
  const steps = 720;
  const roots = [];
  let prevVal = angleAtTheta(0) - targetAngle;
  for (let i = 1; i <= steps; i++) {
    const theta = (i / steps) * Math.PI * 2;
    const val = angleAtTheta(theta) - targetAngle;
    if ((prevVal <= 0 && val > 0) || (prevVal >= 0 && val < 0)) {
      let lo = ((i - 1) / steps) * Math.PI * 2, hi = theta, flo = prevVal;
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2;
        const fmid = angleAtTheta(mid) - targetAngle;
        if ((flo <= 0 && fmid > 0) || (flo >= 0 && fmid < 0)) { hi = mid; } else { lo = mid; flo = fmid; }
      }
      roots.push((lo + hi) / 2);
    }
    prevVal = val;
  }
  if (roots.length === 0) {
    alert('找不到符合此角度的位置，请尝试其他角度 Could not find a position matching that angle');
    return;
  }
  let bestRoot = roots[0], bestDist = Infinity;
  roots.forEach(r => {
    const d = Math.abs(shortestAngleDiffRad(baseTheta, r));
    if (d < bestDist) { bestDist = d; bestRoot = r; }
  });

  const newX = prev.x + L1 * Math.cos(bestRoot);
  const newY = prev.y + L1 * Math.sin(bestRoot);
  curr.x = newX; curr.y = newY;
  curr.d = Math.hypot(newX, newY);
  curr.heading = roomRefHeading + toDeg(Math.atan2(newY, newX));
  if (curr.tiltAtCapture != null) {
    const camHeight = appSettings.defaultCamHeight || 0;
    curr.height = camHeight + curr.d * Math.tan(toRad(curr.tiltAtCapture));
  }

  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
}

function getRoomPoint(target) {
  return roomFloorPoints[target.pIndex];
}

function deleteRoomPoint(target) {
  if (!confirm('确定要删除 ' + target.label + ' 吗？ Delete this point?')) return;
  roomFloorPoints.splice(target.pIndex, 1);
  if (roomPendingHeightTarget && roomPendingHeightTarget.pIndex === target.pIndex) {
    roomPendingHeightTarget = null;
    roomHeightTargetCard.hidden = true;
  }
  renderRoomPointsList();
  renderRoomPlan();
  renderRoomOverlay();
  saveRoomState();
}

function editRoomPoint(target) {
  const p = getRoomPoint(target);
  const input = prompt('修改 ' + target.label + ' 与相机的水平距离 (m)：\nEdit horizontal distance from camera (m):', fmt(p.d, 2));
  if (input == null) return;
  const newD = parseFloat(input);
  if (!newD || newD <= 0) {
    alert('请输入有效的数字 Please enter a valid number');
    return;
  }
  p.d = newD;
  const xy = roomRelHeadingXY(p.d, p.heading);
  p.x = xy.x; p.y = xy.y;
  if (p.tiltAtCapture != null) {
    const camHeight = appSettings.defaultCamHeight || 0;
    p.height = camHeight + p.d * Math.tan(toRad(p.tiltAtCapture));
  }
  if (p.height != null) {
    const hInput = prompt('修改 ' + target.label + ' 的顶部高度 (m)，留空则按距离自动重新计算：\nEdit top height (m), leave blank to auto-recalculate:', fmt(p.height, 2));
    if (hInput != null && hInput.trim() !== '') {
      const newH = parseFloat(hInput);
      if (newH) p.height = newH;
    }
  }
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
}

btnUndoRoom.addEventListener('click', () => {
  roomFloorPoints.pop();
  renderRoomPointsList();
  renderRoomPlan();
  renderRoomOverlay();
  saveRoomState();
});

btnResetRoom.addEventListener('click', () => {
  if (!confirm('确定要清空所有已记录的点吗？ Reset all captured points?')) return;
  roomFloorPoints = [];
  roomRefHeading = null;
  roomPointCounter = 0;
  roomPendingHeightTarget = null;
  roomHeightTargetCard.hidden = true;
  roomRemarksInput.value = '';
  roomWallOverrides = {};
  roomPlanPage = 0;
  renderRoomPointsList();
  renderRoomPlan();
  renderRoomOverlay();
  saveRoomState();
});

roomRemarksInput.addEventListener('input', saveRoomState);

function renderRoomOverlay() {
  if (!arSvgRoom) return;
  const roomTab = document.getElementById('tab-room');
  if (roomTab.hidden) return;
  const ns = 'http://www.w3.org/2000/svg';
  arSvgRoom.innerHTML = '';
  if (calibrationBeta == null) return;

  const projected = roomFloorPoints.map(p => projectToScreen(p.tiltSigned, p.heading));

  for (let i = 0; i < roomFloorPoints.length - 1; i++) {
    if (!projected[i] || !projected[i + 1]) continue;
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', projected[i].x); line.setAttribute('y1', projected[i].y);
    line.setAttribute('x2', projected[i + 1].x); line.setAttribute('y2', projected[i + 1].y);
    line.setAttribute('class', 'ar-line');
    arSvgRoom.appendChild(line);
    const dist = Math.hypot(roomFloorPoints[i + 1].x - roomFloorPoints[i].x, roomFloorPoints[i + 1].y - roomFloorPoints[i].y);
    const mid = { x: (projected[i].x + projected[i + 1].x) / 2, y: (projected[i].y + projected[i + 1].y) / 2 };
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', mid.x); label.setAttribute('y', mid.y - 2);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'ar-label');
    label.textContent = fmt(dist, 2) + 'm';
    arSvgRoom.appendChild(label);
  }

  if (roomFloorPoints.length > 0) {
    const last = roomFloorPoints[roomFloorPoints.length - 1];
    const lastProj = projected[projected.length - 1];
    const height = appSettings.defaultCamHeight;
    const tilt = currentTiltFromHorizontal();
    if (lastProj) {
      const line = document.createElementNS(ns, 'line');
      line.setAttribute('x1', lastProj.x); line.setAttribute('y1', lastProj.y);
      line.setAttribute('x2', 50); line.setAttribute('y2', 50);
      line.setAttribute('class', 'ar-line-live');
      arSvgRoom.appendChild(line);
    }
    if (height && tilt != null && tilt < -1) {
      const liveDist = distanceFromHeightAngle(height, tilt);
      if (liveDist != null) {
        const theta = toRad(Math.abs(angleDiff(last.heading, currentAlpha || 0)));
        const liveSeg = Math.sqrt(last.d * last.d + liveDist * liveDist - 2 * last.d * liveDist * Math.cos(theta));
        const label = document.createElementNS(ns, 'text');
        label.setAttribute('x', 50); label.setAttribute('y', 44);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('class', 'ar-label');
        label.textContent = fmt(liveSeg, 2) + 'm';
        arSvgRoom.appendChild(label);
      }
    }
  }

  roomFloorPoints.forEach((p, i) => {
    const s = projected[i];
    if (!s) return;
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); dot.setAttribute('r', 2.2);
    dot.setAttribute('class', 'ar-dot');
    arSvgRoom.appendChild(dot);
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', s.x); label.setAttribute('y', s.y - 4);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'ar-label');
    label.textContent = String(p.num);
    arSvgRoom.appendChild(label);
  });
}

function orderedFloorPoints() {
  // Connect floor corners by angle around their centroid so deleting/re-adding
  // points out of walking order never produces a self-intersecting shape.
  if (roomFloorPoints.length < 3) return roomFloorPoints.slice();
  const cx = roomFloorPoints.reduce((s, p) => s + p.x, 0) / roomFloorPoints.length;
  const cy = roomFloorPoints.reduce((s, p) => s + p.y, 0) / roomFloorPoints.length;
  return roomFloorPoints.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

function wallLetter(i) {
  let s = '';
  i = i + 1;
  while (i > 0) {
    const rem = (i - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function wallKey(labelA, labelB) {
  return [labelA, labelB].sort().join('|');
}

function getWallCeilingWidth(labelA, labelB, groundWidth) {
  const key = wallKey(labelA, labelB);
  return roomWallOverrides[key] != null ? roomWallOverrides[key] : groundWidth;
}

// Approximate visual tapering for sloped/leaning walls: each ceiling corner is
// pulled toward/away from the room centroid by the average of the scale factors
// (ceilingWidth/groundWidth) implied by its two adjacent walls. This always yields
// a valid, non-self-intersecting ceiling outline and exactly reproduces the
// untapered case (scale 1) when no wall has a ceiling-width override. The precise
// numeric width/area for each wall stays authoritative in the walls list/report;
// this only drives the 3D sketch's shape.
function computeCeilingXY(floorOrdered) {
  const n = floorOrdered.length;
  if (n < 3) return floorOrdered.map(p => ({ x: p.x, y: p.y }));
  const cx = floorOrdered.reduce((s, p) => s + p.x, 0) / n;
  const cy = floorOrdered.reduce((s, p) => s + p.y, 0) / n;
  const wallScale = [];
  for (let i = 0; i < n; i++) {
    const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
    const groundWidth = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ceilingWidth = getWallCeilingWidth(a.label, b.label, groundWidth);
    wallScale.push(ceilingWidth / groundWidth);
  }
  return floorOrdered.map((p, i) => {
    const prevScale = wallScale[(i - 1 + n) % n];
    const nextScale = wallScale[i];
    const s = (prevScale + nextScale) / 2;
    return { x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s };
  });
}

// Shared isometric (2:1 dimetric-ish) projection math, used by both the live 3D
// wireframe plan and the exported report so the two views stay visually consistent.
const ISO_COS30 = Math.cos(Math.PI / 6), ISO_SIN30 = Math.sin(Math.PI / 6);
function isoRawXY(x, y, z) {
  return { x: (x - y) * ISO_COS30, y: (x + y) * ISO_SIN30 - z };
}

// Builds a project(x,y,z) -> {x,y} function fit to a boxSize x boxSize area
// (with padding), centered, based on a sample of raw world points that should
// be visible (typically floor + ceiling corners at their respective heights).
function makeIsoProjector(worldPoints, boxSize, padding, originX, originY) {
  const raw = worldPoints.map(p => isoRawXY(p.x, p.y, p.z));
  const minX = Math.min(...raw.map(p => p.x)), maxX = Math.max(...raw.map(p => p.x));
  const minY = Math.min(...raw.map(p => p.y)), maxY = Math.max(...raw.map(p => p.y));
  const spanX = (maxX - minX) || 1, spanY = (maxY - minY) || 1;
  const scale = Math.min((boxSize - 2 * padding) / spanX, (boxSize - 2 * padding) / spanY);
  const centerX = originX + boxSize / 2, centerY = originY + boxSize / 2;
  const offX = -(minX + maxX) / 2, offY = -(minY + maxY) / 2;
  return function project(x, y, z) {
    const r = isoRawXY(x, y, z);
    return { x: centerX + (r.x + offX) * scale, y: centerY + (r.y + offY) * scale };
  };
}

function rescaleRoom(scaleFactor) {
  const camHeight = appSettings.defaultCamHeight || 0;
  function rescalePoint(p) {
    p.d *= scaleFactor;
    const xy = roomRelHeadingXY(p.d, p.heading);
    p.x = xy.x; p.y = xy.y;
    if (p.tiltAtCapture != null) {
      p.height = camHeight + p.d * Math.tan(toRad(p.tiltAtCapture));
    }
  }
  roomFloorPoints.forEach(rescalePoint);
  Object.keys(roomWallOverrides).forEach(key => { roomWallOverrides[key] *= scaleFactor; });
}

function planTotalPages() {
  const n = orderedFloorPoints().length;
  return n >= 3 ? n + 2 : 1; // 0=floor, 1..n=walls, n+1=ceiling
}

function clampPlanPage() {
  const total = planTotalPages();
  if (roomPlanPage >= total) roomPlanPage = total - 1;
  if (roomPlanPage < 0) roomPlanPage = 0;
}

btnPlanPrev.addEventListener('click', () => {
  const total = planTotalPages();
  roomPlanPage = (roomPlanPage - 1 + total) % total;
  renderRoomPlan();
});
btnPlanNext.addEventListener('click', () => {
  const total = planTotalPages();
  roomPlanPage = (roomPlanPage + 1) % total;
  renderRoomPlan();
});

function renderRoomPlan() {
  clampPlanPage();
  const svg = roomPlanSvg;
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;

  if (roomFloorPoints.length === 0) {
    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', 160); txt.setAttribute('y', 160);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('class', 'plan-text');
    txt.textContent = '尚无数据';
    svg.appendChild(txt);
    renderPlanPageContent();
    return;
  }

  const measuredHeights = floorOrdered.map(p => p.height).filter(h => h != null);
  const avgHeight = measuredHeights.length ? measuredHeights.reduce((a, b) => a + b, 0) / measuredHeights.length : 2.8;
  const usedHeights = floorOrdered.map(p => p.height != null ? p.height : avgHeight);
  const ceilingXY = computeCeilingXY(floorOrdered);

  const worldPoints = [];
  floorOrdered.forEach((p, i) => {
    worldPoints.push({ x: p.x, y: p.y, z: 0 });
    worldPoints.push({ x: ceilingXY[i].x, y: ceilingXY[i].y, z: usedHeights[i] });
  });
  const project = makeIsoProjector(worldPoints, 320, 26, 0, 0);

  function svgPoly(pts, fillColor, strokeColor, strokeWidth) {
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', pts.map(p => p.x + ',' + p.y).join(' '));
    poly.style.fill = fillColor;
    poly.style.stroke = strokeColor;
    poly.style.strokeWidth = strokeWidth;
    svg.appendChild(poly);
    return poly;
  }
  function wireLine(p1, p2, cssClass) {
    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
    line.setAttribute('class', cssClass);
    svg.appendChild(line);
    return line;
  }

  const numEdges = n >= 3 ? n : n - 1;
  const DIM_FILL = 'rgba(255,255,255,0.04)', DIM_STROKE = 'rgba(255,255,255,0.25)';
  const SEL_FILL = 'rgba(255,176,32,0.30)', SEL_STROKE = 'var(--accent, #ffb020)';

  // floor face
  if (n >= 3) {
    const selected = roomPlanPage === 0;
    svgPoly(floorOrdered.map(p => project(p.x, p.y, 0)), selected ? SEL_FILL : DIM_FILL, selected ? SEL_STROKE : DIM_STROKE, selected ? 2.5 : 1.2);
  }

  // vertical wall edges (floor corner -> its ceiling corner)
  for (let i = 0; i < n; i++) {
    const base = project(floorOrdered[i].x, floorOrdered[i].y, 0);
    const top = project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i]);
    wireLine(base, top, 'wire-vertical');
  }

  // wall faces (filled quads, highlighted per current page)
  for (let i = 0; i < numEdges; i++) {
    const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
    const ca = ceilingXY[i], cb = ceilingXY[(i + 1) % n];
    const quad = [project(a.x, a.y, 0), project(b.x, b.y, 0), project(cb.x, cb.y, usedHeights[(i + 1) % n]), project(ca.x, ca.y, usedHeights[i])];
    const selected = roomPlanPage === i + 1;
    svgPoly(quad, selected ? SEL_FILL : DIM_FILL, selected ? SEL_STROKE : DIM_STROKE, selected ? 2.5 : 1.2);
  }

  // ceiling: outline only, no fill color, ever (brighter outline when its page is selected)
  if (n >= 3) {
    const ceilingSelected = roomPlanPage === n + 1;
    svgPoly(floorOrdered.map((p, i) => project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i])), 'none', ceilingSelected ? SEL_STROKE : 'rgba(255,255,255,0.35)', ceilingSelected ? 2.5 : 1.5);
  }

  // ground edges: the primary clickable/labelled measurements
  for (let i = 0; i < numEdges; i++) {
    const a = floorOrdered[i];
    const b = floorOrdered[(i + 1) % n];
    const sa = project(a.x, a.y, 0), sb = project(b.x, b.y, 0);
    const line = wireLine(sa, sb, 'floor-edge');
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    line.addEventListener('click', () => onEdgeClick(dist));

    const mid = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
    const label = document.createElementNS(ns, 'text');
    label.setAttribute('x', mid.x); label.setAttribute('y', mid.y + 12);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('class', 'plan-text');
    label.style.fill = WALL_LABEL_COLOR;
    label.style.fontWeight = 'bold';
    label.textContent = '墙' + wallLetter(i) + ' ' + fmt(dist, 2) + 'm';
    svg.appendChild(label);
  }

  floorOrdered.forEach((p, i) => {
    const s = project(p.x, p.y, 0);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); dot.setAttribute('r', 3.5);
    dot.setAttribute('class', 'plan-dot');
    svg.appendChild(dot);
    const numLabel = document.createElementNS(ns, 'text');
    numLabel.setAttribute('x', s.x); numLabel.setAttribute('y', s.y - 6);
    numLabel.setAttribute('text-anchor', 'middle');
    numLabel.setAttribute('class', 'plan-text');
    numLabel.textContent = String(p.num);
    svg.appendChild(numLabel);
    if (p.height != null) {
      const top = project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i]);
      const t = document.createElementNS(ns, 'text');
      t.setAttribute('x', top.x); t.setAttribute('y', top.y - 8);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('class', 'plan-text');
      t.textContent = 'H:' + fmt(p.height, 2) + 'm';
      svg.appendChild(t);
    }
  });

  updateRoomSummary();
  renderPlanPageContent();
}

function renderPlanPageContent() {
  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;

  if (n < 3) {
    planPagerLabel.textContent = '地板 Floor';
    planPageContent.innerHTML =
      '<div class="result-row highlight"><span>地板面积 Floor area</span><b id="room-res-area">--</b></div>' +
      '<div class="result-row"><span>地板周长 Perimeter</span><b id="room-res-perimeter">--</b></div>';
    updateRoomSummary();
    return;
  }

  if (roomPlanPage === 0) {
    planPagerLabel.textContent = '地板 Floor';
    planPageContent.innerHTML =
      '<div class="result-row highlight"><span>地板面积 Floor area</span><b id="room-res-area">--</b></div>' +
      '<div class="result-row"><span>地板周长 Perimeter</span><b id="room-res-perimeter">--</b></div>';
    updateRoomSummary();
  } else if (roomPlanPage <= n) {
    const i = roomPlanPage - 1;
    const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
    const groundWidth = Math.hypot(b.x - a.x, b.y - a.y);
    const key = wallKey(a.label, b.label);
    const ceilingWidth = getWallCeilingWidth(a.label, b.label, groundWidth);
    const hasOverride = roomWallOverrides[key] != null;
    let wallH = null;
    if (a.height != null && b.height != null) wallH = (a.height + b.height) / 2;
    else if (a.height != null) wallH = a.height;
    else if (b.height != null) wallH = b.height;
    const area = wallH != null ? ((groundWidth + ceilingWidth) / 2) * wallH : null;

    planPagerLabel.textContent = '墙' + wallLetter(i) + ' Wall ' + wallLetter(i);
    planPageContent.innerHTML =
      `<div class="result-row"><span>连接点 Points</span><b>${a.label} → ${b.label}</b></div>` +
      `<div class="result-row"><span>地面宽 Ground width</span><b>${fmt(groundWidth, 2)}m</b></div>` +
      `<div class="result-row"><span>天花宽 Ceiling width</span><b>${fmt(ceilingWidth, 2)}m${hasOverride ? ' (已修改)' : ''}</b></div>` +
      `<div class="result-row"><span>高度 ${a.label}</span><b>${a.height != null ? fmt(a.height, 2) + 'm' : '--'}</b></div>` +
      `<div class="result-row"><span>高度 ${b.label}</span><b>${b.height != null ? fmt(b.height, 2) + 'm' : '--'}</b></div>` +
      `<div class="result-row highlight"><span>估计面积 Area</span><b>${area != null ? fmt(area, 2) + ' sqm' : '--'}</b></div>` +
      `<div class="btn-row" style="margin-top:8px;">` +
      `<button class="btn-secondary" id="btn-edit-ceiling-width">✎ 修改天花宽 Edit ceiling width</button>` +
      (hasOverride ? `<button class="btn-secondary" id="btn-reset-ceiling-width">↺ 恢复默认 Reset</button>` : '') +
      `</div>`;
    document.getElementById('btn-edit-ceiling-width').addEventListener('click', () => {
      const input = prompt('修改墙' + wallLetter(i) + ' (' + a.label + '↔' + b.label + ') 的天花宽度 (m)，默认与地面宽度相同：\nEdit ceiling width (m), defaults to same as ground width:', fmt(ceilingWidth, 2));
      if (input == null) return;
      const val = parseFloat(input);
      if (!val || val <= 0) { alert('请输入有效的数字 Please enter a valid number'); return; }
      roomWallOverrides[key] = val;
      renderRoomPlan();
      saveRoomState();
    });
    const resetBtn = document.getElementById('btn-reset-ceiling-width');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      delete roomWallOverrides[key];
      renderRoomPlan();
      saveRoomState();
    });
  } else {
    const ceilingXY = computeCeilingXY(floorOrdered);
    let area = 0;
    for (let i = 0; i < n; i++) {
      const p1 = ceilingXY[i], p2 = ceilingXY[(i + 1) % n];
      area += p1.x * p2.y - p2.x * p1.y;
    }
    area = Math.abs(area) / 2;
    planPagerLabel.textContent = '天花板 Ceiling';
    planPageContent.innerHTML =
      `<div class="result-row highlight"><span>天花板面积 Ceiling area</span><b>${fmtArea(area)}</b></div>` +
      `<p class="hint">天花板面积按各墙天花宽度估算得出，若有斜墙可能与地板面积不同。<span class="en">Ceiling area is estimated from each wall's ceiling width, and may differ from the floor area if any walls lean.</span></p>`;
  }
}

function onEdgeClick(currentDist) {
  const input = prompt('请输入这段边的实际长度 (m)，用于校正整体比例：', fmt(currentDist, 2));
  if (input == null) return;
  const actual = parseFloat(input);
  if (!actual || actual <= 0) {
    alert('请输入有效的数字 Please enter a valid number');
    return;
  }
  const scaleFactor = actual / currentDist;
  rescaleRoom(scaleFactor);
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
}

/* ---- 面积/周长 Area & perimeter (shoelace formula) ---- */
function updateRoomSummary() {
  const areaEl = document.getElementById('room-res-area');
  const perimeterEl = document.getElementById('room-res-perimeter');
  if (!areaEl || !perimeterEl) return;
  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;
  if (n < 3) {
    areaEl.textContent = '--';
    perimeterEl.textContent = '--';
    return;
  }
  let area = 0, perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = floorOrdered[i];
    const b = floorOrdered[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
    perimeter += Math.hypot(b.x - a.x, b.y - a.y);
  }
  area = Math.abs(area) / 2;
  areaEl.textContent = fmtArea(area);
  perimeterEl.textContent = fmtLen(perimeter);
}

/* ---- 本地保存 Local persistence (survive page reload) ---- */
function saveRoomState() {
  try {
    const state = {
      roomRefHeading, roomFloorPoints, roomPointCounter, roomWallOverrides,
      remarks: roomRemarksInput.value
    };
    localStorage.setItem(ROOM_STORAGE_KEY, JSON.stringify(state));
  } catch (err) { /* storage unavailable, ignore */ }
}

function loadRoomState() {
  try {
    const raw = localStorage.getItem(ROOM_STORAGE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    roomRefHeading = state.roomRefHeading;
    roomFloorPoints = state.roomFloorPoints || [];
    roomPointCounter = state.roomPointCounter || 0;
    roomWallOverrides = state.roomWallOverrides || {};
    if (state.remarks) roomRemarksInput.value = state.remarks;
  } catch (err) { /* corrupt data, ignore */ }
}

/* ---- 导出报告 Export report (JPG / PDF, fully offline) ---- */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function wrapTextLines(ctx, text, maxWidth) {
  const paragraphs = String(text).split('\n');
  const lines = [];
  paragraphs.forEach(para => {
    if (para === '') { lines.push(''); return; }
    let line = '';
    for (const ch of para) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line !== '') {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  });
  return lines;
}

function rectsOverlap(a, b) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function drawLabel(ctx, x, y, text, fontPx, placedBoxes, options) {
  options = options || {};
  const color = options.color || '#1c1c1c';
  const bold = !!options.bold;
  ctx.font = (bold ? 'bold ' : '600 ') + fontPx + 'px sans-serif';
  const padX = 4, padY = 2;
  const w = ctx.measureText(text).width + padX * 2;
  const h = fontPx + padY * 2;
  const candidates = [[0, 0], [0, -h], [0, h], [w * 0.65, 0], [-w * 0.65, 0],
    [0, -h * 2], [0, h * 2], [w * 0.65, -h], [-w * 0.65, -h], [w * 0.65, h], [-w * 0.65, h]];
  let chosen = null;
  for (const [dx, dy] of candidates) {
    const box = { x: x + dx - w / 2, y: y + dy - h / 2, w, h };
    if (!placedBoxes.some(b => rectsOverlap(b, box))) { chosen = { cx: x + dx, cy: y + dy, box }; break; }
  }
  if (!chosen) chosen = { cx: x, cy: y, box: { x: x - w / 2, y: y - h / 2, w, h } };
  placedBoxes.push(chosen.box);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillRect(chosen.box.x, chosen.box.y, chosen.box.w, chosen.box.h);
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, chosen.cx, chosen.cy);
}

async function buildReportCanvas() {
  const W = 900;
  const drawSize = 640;

  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;
  const measuredHeights = floorOrdered.map(p => p.height).filter(h => h != null);
  const avgHeight = measuredHeights.length ? measuredHeights.reduce((a, b) => a + b, 0) / measuredHeights.length : 2.8;
  const usedHeights = floorOrdered.map(p => p.height != null ? p.height : avgHeight);
  const anyEstimatedHeight = n > 0 && floorOrdered.some(p => p.height == null);

  // per-wall breakdown: ground width, ceiling width (if overridden), each corner's own height, area
  const wallInfo = [];
  if (n >= 2) {
    const numEdges = n >= 3 ? n : 1;
    for (let i = 0; i < numEdges; i++) {
      const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
      const groundWidth = Math.hypot(b.x - a.x, b.y - a.y);
      const ceilingWidth = getWallCeilingWidth(a.label, b.label, groundWidth);
      let wallH = null;
      if (a.height != null && b.height != null) wallH = (a.height + b.height) / 2;
      else if (a.height != null) wallH = a.height;
      else if (b.height != null) wallH = b.height;
      const area = wallH != null ? ((groundWidth + ceilingWidth) / 2) * wallH : null;
      wallInfo.push({
        letter: wallLetter(i), aLabel: a.label, bLabel: b.label, aHeight: a.height, bHeight: b.height,
        groundWidth, ceilingWidth, hasCeilingOverride: roomWallOverrides[wallKey(a.label, b.label)] != null,
        area
      });
    }
  }

  const ctxMeasure = document.createElement('canvas').getContext('2d');
  ctxMeasure.font = '15px sans-serif';
  const remarksText = roomRemarksInput.value.trim() || '(无备注 no remarks)';
  const remarksLines = wrapTextLines(ctxMeasure, remarksText, W - 80);

  const headerH = 130;
  const drawH = drawSize + 40;
  const wallRowH = 60;
  const wallTableH = 36 + Math.max(wallInfo.length, 1) * wallRowH;
  const remarksH = 50 + remarksLines.length * 22;
  const totalH = headerH + drawH + wallTableH + remarksH + 50;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d');

  // white background as requested
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, totalH);

  let y = 34;
  ctx.fillStyle = '#161616';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('房间测绘报告 Room Scan Report', 40, y);
  y += 30;
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#666';
  const now = new Date();
  ctx.fillText('日期 Date: ' + now.toLocaleString(), 40, y);
  y += 20;
  const camHeight = appSettings.defaultCamHeight;
  const areaText = document.getElementById('room-res-area') ? document.getElementById('room-res-area').textContent : '--';
  const perimText = document.getElementById('room-res-perimeter') ? document.getElementById('room-res-perimeter').textContent : '--';
  ctx.fillText('相机高度 Camera height: ' + (camHeight ? fmt(camHeight, 2) + ' m' : '--') +
    '    地板面积 Area: ' + areaText + '    周长 Perimeter: ' + perimText, 40, y);
  y += 26;

  // ---- 3D isometric drawing (no obstacles; ceiling is outline-only, no fill color) ----
  const drawTop = y;
  if (n >= 3) {
    const hue = Math.floor(Math.random() * 360);
    const floorFill = `hsla(${hue},65%,55%,0.25)`;
    const floorStroke = `hsla(${hue},65%,32%,0.9)`;
    const wallFill = `hsla(${(hue + 120) % 360},50%,55%,0.25)`;
    const wallStroke = `hsla(${(hue + 120) % 360},50%,30%,0.9)`;
    const ceilStroke = '#555';

    const ceilingXY = computeCeilingXY(floorOrdered);

    const worldPts = [];
    floorOrdered.forEach((p, i) => {
      worldPts.push({ x: p.x, y: p.y, z: 0 });
      worldPts.push({ x: ceilingXY[i].x, y: ceilingXY[i].y, z: usedHeights[i] });
    });
    const pad = 40;
    const project = makeIsoProjector(worldPts, drawSize, pad, (W - drawSize) / 2, drawTop);

    function fillPoly(pts, fill, stroke) {
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // floor
    fillPoly(floorOrdered.map(p => project(p.x, p.y, 0)), floorFill, floorStroke);

    // walls (tapered per ceiling-width overrides), sorted back-to-front by a simple depth key
    const wallFaces = [];
    for (let i = 0; i < n; i++) {
      const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
      const ca = ceilingXY[i], cb = ceilingXY[(i + 1) % n];
      wallFaces.push({ a, b, ca, cb, ha: usedHeights[i], hb: usedHeights[(i + 1) % n], depth: a.x + a.y + b.x + b.y });
    }
    wallFaces.sort((f1, f2) => f2.depth - f1.depth);
    wallFaces.forEach(f => {
      const quad = [project(f.a.x, f.a.y, 0), project(f.b.x, f.b.y, 0), project(f.cb.x, f.cb.y, f.hb), project(f.ca.x, f.ca.y, f.ha)];
      fillPoly(quad, wallFill, wallStroke);
    });

    // ceiling: outline only, no fill color
    fillPoly(floorOrdered.map((p, i) => project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i])), null, ceilStroke);

    // labels: dynamic font size (fewer labels = bigger text, minimum enforced) + overlap avoidance
    const heightLabelCount = floorOrdered.filter(p => p.height != null).length;
    const totalLabels = n + heightLabelCount;
    const fontPx = Math.max(11, Math.min(22, Math.round(22 - totalLabels * 0.5)));
    const placedBoxes = [];

    for (let i = 0; i < n; i++) {
      const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const pa = project(a.x, a.y, 0), pb = project(b.x, b.y, 0);
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      drawLabel(ctx, mid.x, mid.y, '墙' + wallLetter(i) + ' ' + fmt(dist, 2) + 'm', fontPx, placedBoxes,
        { color: WALL_LABEL_COLOR, bold: true });
    }
    floorOrdered.forEach((p, i) => {
      const base = project(p.x, p.y, 0);
      drawLabel(ctx, base.x, base.y + 10, String(p.num), fontPx, placedBoxes, { color: '#161616', bold: true });
      if (p.height == null) return;
      const top = project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i]);
      drawLabel(ctx, top.x, top.y - 6, 'H:' + fmt(p.height, 2) + 'm', fontPx, placedBoxes);
    });
  } else {
    ctx.fillStyle = '#888';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('地板角点不足 3 个，无法绘制 3D 图 (need >=3 floor points)', W / 2, drawTop + drawSize / 2);
  }
  y = drawTop + drawSize + 30;

  ctx.textAlign = 'left';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#161616';
  ctx.fillText('各墙壁 Walls' + (anyEstimatedHeight ? '  (* 部分高度为估计值 estimated)' : ''), 40, y);
  y += 24;
  if (wallInfo.length === 0) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#999';
    ctx.fillText('(尚无墙壁数据 no wall data yet)', 40, y);
    y += wallRowH;
  } else {
    wallInfo.forEach(w => {
      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#161616';
      ctx.fillText('墙' + w.letter + ' Wall ' + w.letter + '  (' + w.aLabel + ' → ' + w.bLabel + ')', 40, y);
      y += 19;
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#333';
      ctx.fillText('地面宽 ' + fmt(w.groundWidth, 2) + 'm ｜ 天花宽 ' + fmt(w.ceilingWidth, 2) + 'm' + (w.hasCeilingOverride ? ' (已修改)' : ''), 40, y);
      y += 18;
      const heightsStr = '高度 ' + w.aLabel + '=' + (w.aHeight != null ? fmt(w.aHeight, 2) + 'm' : '--') +
        ' ｜ ' + w.bLabel + '=' + (w.bHeight != null ? fmt(w.bHeight, 2) + 'm' : '--') +
        (w.area != null ? ('  ｜ 面积≈' + fmt(w.area, 2) + ' sqm') : '');
      ctx.fillText(heightsStr, 40, y);
      y += 23;
    });
  }
  y += 10;

  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#161616';
  ctx.fillText('备注 Remarks', 40, y);
  y += 24;
  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#333';
  remarksLines.forEach(line => {
    ctx.fillText(line, 40, y);
    y += 22;
  });

  return canvas;
}

function buildMinimalPdf(jpegBytes, w, h) {
  const enc = new TextEncoder();
  const chunks = [];
  let offset = 0;
  const offsets = [];
  function push(strOrBytes) {
    const bytes = (typeof strOrBytes === 'string') ? enc.encode(strOrBytes) : strOrBytes;
    chunks.push(bytes);
    offset += bytes.length;
  }

  push('%PDF-1.4\n');

  offsets[1] = offset;
  push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = offset;
  push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = offset;
  push(`3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /XObject << /Im0 4 0 R >> >> /MediaBox [0 0 ${w} ${h}] /Contents 5 0 R >>\nendobj\n`);

  offsets[4] = offset;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
  push(jpegBytes);
  push('\nendstream\nendobj\n');

  const contentStr = `q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ`;
  offsets[5] = offset;
  push(`5 0 obj\n<< /Length ${contentStr.length} >>\nstream\n${contentStr}\nendstream\nendobj\n`);

  const xrefOffset = offset;
  let xref = 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  push(xref);
  push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const total = chunks.reduce((s, c) => s + c.length, 0);
  const result = new Uint8Array(total);
  let pos = 0;
  for (const c of chunks) { result.set(c, pos); pos += c.length; }
  return result;
}

function dataUrlToBytes(dataUrl) {
  const base64 = dataUrl.split(',')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

btnExportJpg.addEventListener('click', async () => {
  if (roomFloorPoints.length === 0) {
    alert('请先记录至少一些地板角点 Please capture some floor points first');
    return;
  }
  const canvas = await buildReportCanvas();
  canvas.toBlob(blob => downloadBlob(blob, 'room-scan-report.jpg'), 'image/jpeg', 0.92);
});

btnExportPdf.addEventListener('click', async () => {
  if (roomFloorPoints.length === 0) {
    alert('请先记录至少一些地板角点 Please capture some floor points first');
    return;
  }
  const canvas = await buildReportCanvas();
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const jpegBytes = dataUrlToBytes(dataUrl);
  const pdfBytes = buildMinimalPdf(jpegBytes, canvas.width, canvas.height);
  downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), 'room-scan-report.pdf');
});

loadRoomState();
renderRoomPointsList();
renderRoomPlan();
updateRoomSummary();

/* ===================== Service worker (offline) ===================== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
