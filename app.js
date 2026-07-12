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
  defaultCamHeight: null,
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
  const camHeightEl = document.getElementById('cam-height');
  const roomHeightEl = document.getElementById('room-height');
  if (camHeightEl && !camHeightEl.value) camHeightEl.value = appSettings.defaultCamHeight;
  if (roomHeightEl && !roomHeightEl.value) roomHeightEl.value = appSettings.defaultCamHeight;
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
  if (typeof computeAB === 'function') computeAB();
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
    window.addEventListener('deviceorientation', onOrientation);
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
  updateLevelReadout();
  updateRoomAngleReadout();
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
  });
});

/* ===================== 模式 A: 角度 + 高度法 ===================== */
const videoAngle = document.getElementById('video-angle');
const btnStartCamAngle = document.getElementById('btn-start-cam-angle');
const btnCalibrate = document.getElementById('btn-calibrate');
const btnLockA = document.getElementById('btn-lock-a');
const btnLockB = document.getElementById('btn-lock-b');
const btnResetAngle = document.getElementById('btn-reset-angle');
const camHeightInput = document.getElementById('cam-height');
const angleReadout = document.getElementById('angle-readout');
const calibrateHint = document.getElementById('calibrate-hint');

let calibrationBeta = null;
let pointA = null; // { tilt, heading }
let pointB = null;

btnStartCamAngle.addEventListener('click', async () => {
  await ensureMotionPermission();
  const stream = await startCamera(videoAngle);
  if (stream) {
    btnLockA.disabled = false;
  }
});

btnCalibrate.addEventListener('click', async () => {
  const ok = await ensureMotionPermission();
  if (!ok || currentBeta == null) {
    alert('请先开启相机并保持手机静止片刻 Please start camera and hold still');
    return;
  }
  calibrationBeta = currentBeta;
  calibrateHint.textContent = '已校准！现在把手机往下倾斜瞄准点位。 Calibrated.';
});

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

function lockPoint(label) {
  const height = parseFloat(camHeightInput.value);
  if (!height || height <= 0) {
    alert('请先输入相机高度 Please enter camera height');
    return null;
  }
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    alert('请先校准水平线 Please calibrate first');
    return null;
  }
  const dist = distanceFromHeightAngle(height, tilt);
  if (dist == null) {
    alert('倾角太小，无法估算距离，请对准目标点再试 Angle too small');
    return null;
  }
  return { tilt: Math.abs(tilt), heading: currentAlpha || 0, dist };
}

btnLockA.addEventListener('click', () => {
  const p = lockPoint('A');
  if (!p) return;
  pointA = p;
  document.getElementById('res-da').textContent = fmtLen(p.dist);
  btnLockB.disabled = false;
  computeAB();
});

btnLockB.addEventListener('click', () => {
  const p = lockPoint('B');
  if (!p) return;
  pointB = p;
  document.getElementById('res-db').textContent = fmtLen(p.dist);
  computeAB();
});

function computeAB() {
  if (!pointA || !pointB) return;
  const theta = toRad(Math.abs(angleDiff(pointA.heading, pointB.heading)));
  const d1 = pointA.dist, d2 = pointB.dist;
  const ab = Math.sqrt(d1 * d1 + d2 * d2 - 2 * d1 * d2 * Math.cos(theta));
  document.getElementById('res-ab').textContent = fmtLen(ab);
}

btnResetAngle.addEventListener('click', () => {
  pointA = null; pointB = null;
  document.getElementById('res-da').textContent = '--';
  document.getElementById('res-db').textContent = '--';
  document.getElementById('res-ab').textContent = '--';
  btnLockB.disabled = true;
});

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
const btnEnableMotion = document.getElementById('btn-enable-motion');
const levelReadout = document.getElementById('level-readout');
const lineH = document.getElementById('line-h');
const lineV = document.getElementById('line-v');

btnStartCamLevel.addEventListener('click', () => startCamera(videoLevel));
btnEnableMotion.addEventListener('click', () => ensureMotionPermission());

function updateLevelReadout() {
  if (currentGamma == null || currentBeta == null) return;
  const roll = currentGamma;
  levelReadout.textContent = '左右 roll: ' + fmt(roll, 1) + '°  |  前后 pitch: ' + fmt(currentBeta - 90, 1) + '°';

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
const btnStartCamRoom = document.getElementById('btn-start-cam-room');
const btnRoomCalibrate = document.getElementById('btn-room-calibrate');
const roomHeightInput = document.getElementById('room-height');
const roomAngleReadout = document.getElementById('room-angle-readout');
const roomCalibrateHint = document.getElementById('room-calibrate-hint');
const btnAddFloor = document.getElementById('btn-add-floor');
const btnNewObstacle = document.getElementById('btn-new-obstacle');
const btnAddObstacleCorner = document.getElementById('btn-add-obstacle-corner');
const roomHeightTargetCard = document.getElementById('room-height-target-card');
const roomHeightTargetLabel = document.getElementById('room-height-target-label');
const btnConfirmHeight = document.getElementById('btn-confirm-height');
const roomPointsListEl = document.getElementById('room-points-list');
const btnUndoRoom = document.getElementById('btn-undo-room');
const btnResetRoom = document.getElementById('btn-reset-room');
const chkHideObstacles = document.getElementById('chk-hide-obstacles');
const roomPlanSvg = document.getElementById('room-plan-svg');
const roomResArea = document.getElementById('room-res-area');
const roomResPerimeter = document.getElementById('room-res-perimeter');
const roomRemarksInput = document.getElementById('room-remarks');
const btnExportJpg = document.getElementById('btn-export-jpg');
const btnExportPdf = document.getElementById('btn-export-pdf');
const roomResClosure = document.getElementById('room-res-closure');
const btnCaptureClosure = document.getElementById('btn-capture-closure');
const roomWallsListEl = document.getElementById('room-walls-list');

const ROOM_STORAGE_KEY = 'site-measure-room-scan-v2';
const EDGE_MATCH_COLOR = '#33c17a';
const EDGE_MISMATCH_COLOR = '#a9682e';

let roomRefHeading = null;
let roomFloorPoints = []; // {d, heading, x, y, height, tiltAtCapture, label}
let roomObstacles = []; // [{label, points:[{d,heading,x,y,height,tiltAtCapture,label}]}]
let roomCurrentObstacleIndex = -1;
let roomWallOverrides = {}; // key "labelA|labelB" (sorted) -> ceiling width override (m)
let roomPendingClosure = null; // { x, y, misclosure } from a "re-sight point 1" capture, awaiting apply/discard
let roomLastClosureEdgeKeys = {}; // wallKey -> true for edges altered by the last applied closure adjustment
let roomPendingHeightTarget = null; // {group:'floor'|'obstacle', gIndex, pIndex, label}
let roomPointCounter = 0;
let roomObstacleCounter = 0;

btnStartCamRoom.addEventListener('click', async () => {
  await ensureMotionPermission();
  await startCamera(videoRoom);
});

btnRoomCalibrate.addEventListener('click', async () => {
  const ok = await ensureMotionPermission();
  if (!ok || currentBeta == null) {
    alert('请先开启相机并保持手机静止片刻 Please start camera and hold still');
    return;
  }
  calibrationBeta = currentBeta;
  roomCalibrateHint.textContent = '已校准！保持站在原地，转动手机逐一瞄准各角落。 Calibrated.';
});

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
  const height = parseFloat(roomHeightInput.value);
  if (!height || height <= 0) {
    alert('请先输入相机高度 Please enter camera height');
    return null;
  }
  const tilt = currentTiltFromHorizontal();
  if (tilt == null) {
    alert('请先校准水平线 Please calibrate first');
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
  return { d, heading, x: xy.x, y: xy.y, height: null, tiltAtCapture: null, label };
}

btnAddFloor.addEventListener('click', () => {
  roomPointCounter++;
  const label = '角' + roomPointCounter;
  const p = captureGroundPoint(label);
  if (!p) { roomPointCounter--; return; }
  roomFloorPoints.push(p);
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
});

btnNewObstacle.addEventListener('click', () => {
  roomObstacleCounter++;
  roomObstacles.push({ label: '障碍物' + roomObstacleCounter, points: [] });
  roomCurrentObstacleIndex = roomObstacles.length - 1;
  alert('已开始新障碍物：' + roomObstacles[roomCurrentObstacleIndex].label + '，现在点击"障碍物角"添加它的角点。');
});

btnAddObstacleCorner.addEventListener('click', () => {
  if (roomCurrentObstacleIndex < 0) {
    alert('请先点击"新障碍物" Please start a new obstacle first');
    return;
  }
  const group = roomObstacles[roomCurrentObstacleIndex];
  const label = group.label + '-角' + (group.points.length + 1);
  const p = captureGroundPoint(label);
  if (!p) return;
  group.points.push(p);
  renderRoomPointsList();
  renderRoomPlan();
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
  const height = parseFloat(roomHeightInput.value);
  if (tilt == null || !height) {
    alert('请先校准并输入相机高度 Please calibrate and enter camera height');
    return;
  }
  const target = roomPendingHeightTarget;
  const base = target.group === 'floor' ? roomFloorPoints[target.pIndex] : roomObstacles[target.gIndex].points[target.pIndex];
  base.tiltAtCapture = tilt;
  base.height = height + base.d * Math.tan(toRad(tilt));
  roomPendingHeightTarget = null;
  roomHeightTargetCard.hidden = true;
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
});

function renderRoomPointsList() {
  const items = [];
  roomFloorPoints.forEach((p, i) => {
    items.push({ p, group: 'floor', gIndex: -1, pIndex: i, tag: '地板', obstacle: false });
  });
  roomObstacles.forEach((g, gi) => {
    g.points.forEach((p, pi) => {
      items.push({ p, group: 'obstacle', gIndex: gi, pIndex: pi, tag: '障碍物', obstacle: true });
    });
  });

  if (items.length === 0) {
    roomPointsListEl.innerHTML = '<p class="hint">尚未记录任何点。</p>';
    return;
  }

  roomPointsListEl.innerHTML = '';
  items.forEach(item => {
    const row = document.createElement('div');
    row.className = 'room-point-item';
    const target = { group: item.group, gIndex: item.gIndex, pIndex: item.pIndex, label: item.p.label };
    const heightText = item.p.height != null ? (' → 高度 ' + fmt(item.p.height, 2) + 'm') : '';
    const angle = cornerInteriorAngle(getPolygonAndIndex(target).poly, getPolygonAndIndex(target).idx);
    const angleText = angle != null ? (' · 转角≈' + fmt(angle, 1) + '°') : '';
    const span = document.createElement('span');
    span.innerHTML = `<span class="rp-tag ${item.obstacle ? 'obstacle' : ''}">${item.tag}</span>${item.p.label} (d=${fmt(item.p.d, 2)}m)${heightText}${angleText}`;
    row.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'rp-actions';

    const btnHeight = document.createElement('button');
    btnHeight.textContent = item.p.height != null ? '重测顶部' : '+顶部高度';
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
  const poly = target.group === 'floor' ? orderedFloorPoints() : roomObstacles[target.gIndex].points;
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
    const camHeight = parseFloat(roomHeightInput.value) || 0;
    curr.height = camHeight + curr.d * Math.tan(toRad(curr.tiltAtCapture));
  }

  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
}

function getRoomPoint(target) {
  return target.group === 'floor' ? roomFloorPoints[target.pIndex] : roomObstacles[target.gIndex].points[target.pIndex];
}

function deleteRoomPoint(target) {
  if (!confirm('确定要删除 ' + target.label + ' 吗？ Delete this point?')) return;
  if (target.group === 'floor') {
    roomFloorPoints.splice(target.pIndex, 1);
  } else {
    roomObstacles[target.gIndex].points.splice(target.pIndex, 1);
  }
  if (roomPendingHeightTarget && roomPendingHeightTarget.group === target.group &&
      roomPendingHeightTarget.gIndex === target.gIndex && roomPendingHeightTarget.pIndex === target.pIndex) {
    roomPendingHeightTarget = null;
    roomHeightTargetCard.hidden = true;
  }
  renderRoomPointsList();
  renderRoomPlan();
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
    const camHeight = parseFloat(roomHeightInput.value) || 0;
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
  if (roomCurrentObstacleIndex >= 0 && roomObstacles[roomCurrentObstacleIndex] && roomObstacles[roomCurrentObstacleIndex].points.length > 0) {
    roomObstacles[roomCurrentObstacleIndex].points.pop();
  } else if (roomFloorPoints.length > 0) {
    roomFloorPoints.pop();
  }
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
});

btnResetRoom.addEventListener('click', () => {
  if (!confirm('确定要清空所有已记录的点吗？ Reset all captured points?')) return;
  roomFloorPoints = [];
  roomObstacles = [];
  roomCurrentObstacleIndex = -1;
  roomRefHeading = null;
  roomPointCounter = 0;
  roomObstacleCounter = 0;
  roomPendingHeightTarget = null;
  roomHeightTargetCard.hidden = true;
  roomRemarksInput.value = '';
  roomWallOverrides = {};
  roomPendingClosure = null;
  roomLastClosureEdgeKeys = {};
  document.getElementById('room-closure-pending').hidden = true;
  renderRoomPointsList();
  renderRoomPlan();
  saveRoomState();
});

chkHideObstacles.addEventListener('change', renderRoomPlan);
roomRemarksInput.addEventListener('input', saveRoomState);

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

// NOTE: points are each measured independently from one fixed camera origin, so a
// polygon built purely from their (x,y) always "closes" mathematically by definition
// (the edge vectors of any closed loop of absolute coordinates sum to zero) — that is
// NOT a real error signal. A meaningful closure error only exists if the user actually
// re-sights an existing corner (typically point 1) a second time as an independent
// check; the gap between that fresh reading and the original point is real measurement
// discrepancy. That's what "闭合点 / Re-sight point 1" below captures.

function edgeChangedByKey(labelA, labelB) {
  return !!roomLastClosureEdgeKeys[wallKey(labelA, labelB)];
}

// Closure uses the raw capture-order array (roomFloorPoints), not the angularly
// re-sorted orderedFloorPoints() used for rendering — "re-sighting point 1" only
// makes sense relative to the actual order the user walked/aimed around the room,
// with point 0 = the very first floor corner captured.
btnCaptureClosure.addEventListener('click', () => {
  if (roomFloorPoints.length < 3) {
    alert('至少需要 3 个地板角点才能检查闭合 Need at least 3 floor points first');
    return;
  }
  const p = captureGroundPoint('闭合点');
  if (!p) return;
  const anchor = roomFloorPoints[0];
  const misclosure = Math.hypot(p.x - anchor.x, p.y - anchor.y);
  roomPendingClosure = { x: p.x, y: p.y, misclosure };
  document.getElementById('room-closure-pending').hidden = false;
  roomResClosure.textContent = fmt(misclosure, 3) + ' m';
});

document.getElementById('btn-discard-closure').addEventListener('click', () => {
  roomPendingClosure = null;
  document.getElementById('room-closure-pending').hidden = true;
});

document.getElementById('btn-apply-closure').addEventListener('click', () => {
  if (!roomPendingClosure) return;
  const poly = roomFloorPoints;
  const n = poly.length;
  if (n < 3) return;

  const beforeLens = [];
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    beforeLens.push(Math.hypot(b.x - a.x, b.y - a.y));
  }

  const misVec = { x: roomPendingClosure.x - poly[0].x, y: roomPendingClosure.y - poly[0].y };
  const edgeLens = [];
  for (let i = 0; i < n - 1; i++) {
    edgeLens.push(Math.hypot(poly[i + 1].x - poly[i].x, poly[i + 1].y - poly[i].y));
  }
  edgeLens.push(Math.hypot(roomPendingClosure.x - poly[n - 1].x, roomPendingClosure.y - poly[n - 1].y));
  const total = edgeLens.reduce((s, l) => s + l, 0) || 1;

  const camHeight = parseFloat(roomHeightInput.value) || 0;
  let cum = 0;
  for (let i = 1; i < n; i++) {
    cum += edgeLens[i - 1];
    const frac = cum / total;
    const p = poly[i];
    p.x -= misVec.x * frac;
    p.y -= misVec.y * frac;
    p.d = Math.hypot(p.x, p.y);
    p.heading = roomRefHeading + toDeg(Math.atan2(p.y, p.x));
    if (p.tiltAtCapture != null) p.height = camHeight + p.d * Math.tan(toRad(p.tiltAtCapture));
  }

  roomLastClosureEdgeKeys = {};
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const afterLen = Math.hypot(b.x - a.x, b.y - a.y);
    const tolerance = Math.max(0.02, beforeLens[i] * 0.02);
    if (Math.abs(afterLen - beforeLens[i]) > tolerance) {
      roomLastClosureEdgeKeys[wallKey(a.label, b.label)] = true;
    }
  }

  roomPendingClosure = null;
  document.getElementById('room-closure-pending').hidden = true;
  renderRoomPointsList();
  renderRoomPlan();
  renderRoomWallsList();
  saveRoomState();
});

function rescaleRoom(scaleFactor) {
  const camHeight = parseFloat(roomHeightInput.value) || 0;
  function rescalePoint(p) {
    p.d *= scaleFactor;
    const xy = roomRelHeadingXY(p.d, p.heading);
    p.x = xy.x; p.y = xy.y;
    if (p.tiltAtCapture != null) {
      p.height = camHeight + p.d * Math.tan(toRad(p.tiltAtCapture));
    }
  }
  roomFloorPoints.forEach(rescalePoint);
  roomObstacles.forEach(g => g.points.forEach(rescalePoint));
  Object.keys(roomWallOverrides).forEach(key => { roomWallOverrides[key] *= scaleFactor; });
}

function renderRoomPlan() {
  const svg = roomPlanSvg;
  svg.innerHTML = '';
  const ns = 'http://www.w3.org/2000/svg';

  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;
  const showObstacles = !chkHideObstacles.checked && roomObstacles.length > 0;
  const allPoints = roomFloorPoints.concat(...roomObstacles.map(g => g.points));

  if (allPoints.length === 0) {
    const txt = document.createElementNS(ns, 'text');
    txt.setAttribute('x', 160); txt.setAttribute('y', 160);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('class', 'plan-text');
    txt.textContent = '尚无数据';
    svg.appendChild(txt);
    updateRoomSummary();
    renderRoomWallsList();
    return;
  }

  const measuredHeights = floorOrdered.map(p => p.height).filter(h => h != null);
  const avgHeight = measuredHeights.length ? measuredHeights.reduce((a, b) => a + b, 0) / measuredHeights.length : 2.8;
  const usedHeights = floorOrdered.map(p => p.height != null ? p.height : avgHeight);
  const ceilingXY = computeCeilingXY(floorOrdered);

  const obstacleHeights = roomObstacles.map(g => {
    const hs = g.points.map(p => p.height).filter(h => h != null);
    return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : Math.min(avgHeight, 1.2);
  });

  const worldPoints = [];
  floorOrdered.forEach((p, i) => {
    worldPoints.push({ x: p.x, y: p.y, z: 0 });
    worldPoints.push({ x: ceilingXY[i].x, y: ceilingXY[i].y, z: usedHeights[i] });
  });
  if (showObstacles) {
    roomObstacles.forEach((g, gi) => {
      g.points.forEach(p => {
        worldPoints.push({ x: p.x, y: p.y, z: 0 });
        worldPoints.push({ x: p.x, y: p.y, z: obstacleHeights[gi] });
      });
    });
  }
  const project = makeIsoProjector(worldPoints, 320, 26, 0, 0);

  // floor face: a very light fill just to ground the wireframe, not a solid surface
  if (n >= 3) {
    const poly = document.createElementNS(ns, 'polygon');
    poly.setAttribute('points', floorOrdered.map(p => { const s = project(p.x, p.y, 0); return s.x + ',' + s.y; }).join(' '));
    poly.setAttribute('class', 'floor-fill');
    svg.appendChild(poly);
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

  // vertical wall edges (floor corner -> its ceiling corner)
  for (let i = 0; i < n; i++) {
    const base = project(floorOrdered[i].x, floorOrdered[i].y, 0);
    const top = project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i]);
    wireLine(base, top, 'wire-vertical');
  }

  // ceiling outline
  for (let i = 0; i < numEdges; i++) {
    const a = project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i]);
    const b = project(ceilingXY[(i + 1) % n].x, ceilingXY[(i + 1) % n].y, usedHeights[(i + 1) % n]);
    wireLine(a, b, 'wire-ceiling');
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
    const changed = n >= 3 && edgeChangedByKey(a.label, b.label);
    label.style.fill = changed ? EDGE_MISMATCH_COLOR : EDGE_MATCH_COLOR;
    label.style.fontWeight = changed ? 'normal' : 'bold';
    label.textContent = '墙' + wallLetter(i) + ' ' + fmt(dist, 2) + 'm';
    svg.appendChild(label);
  }

  floorOrdered.forEach((p, i) => {
    const s = project(p.x, p.y, 0);
    const dot = document.createElementNS(ns, 'circle');
    dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); dot.setAttribute('r', 3.5);
    dot.setAttribute('class', 'plan-dot');
    svg.appendChild(dot);
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

  if (showObstacles) {
    roomObstacles.forEach((g, gi) => {
      const gh = obstacleHeights[gi];
      const gn = g.points.length;
      const edges = gn >= 3 ? gn : gn - 1;
      for (let i = 0; i < gn; i++) {
        const base = project(g.points[i].x, g.points[i].y, 0);
        const top = project(g.points[i].x, g.points[i].y, gh);
        wireLine(base, top, 'obstacle-shape');
      }
      for (let i = 0; i < edges; i++) {
        const a = g.points[i], b = g.points[(i + 1) % gn];
        wireLine(project(a.x, a.y, 0), project(b.x, b.y, 0), 'obstacle-shape');
        wireLine(project(a.x, a.y, gh), project(b.x, b.y, gh), 'obstacle-shape');
      }
      g.points.forEach(p => {
        const s = project(p.x, p.y, 0);
        const dot = document.createElementNS(ns, 'circle');
        dot.setAttribute('cx', s.x); dot.setAttribute('cy', s.y); dot.setAttribute('r', 3);
        dot.setAttribute('class', 'obstacle-shape');
        svg.appendChild(dot);
      });
    });
  }

  updateRoomSummary();
  renderRoomWallsList();
}

function renderRoomWallsList() {
  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;
  if (n < 2) {
    roomWallsListEl.innerHTML = '<p class="hint">至少需要 2 个地板角点。</p>';
    return;
  }
  const numEdges = n >= 3 ? n : 1;
  roomWallsListEl.innerHTML = '';
  for (let i = 0; i < numEdges; i++) {
    const a = floorOrdered[i], b = floorOrdered[(i + 1) % n];
    const groundWidth = Math.hypot(b.x - a.x, b.y - a.y);
    const key = wallKey(a.label, b.label);
    const ceilingWidth = getWallCeilingWidth(a.label, b.label, groundWidth);
    const hasOverride = roomWallOverrides[key] != null;
    const changed = n >= 3 && edgeChangedByKey(a.label, b.label);
    const matches = !changed;

    let wallH = null;
    if (a.height != null && b.height != null) wallH = (a.height + b.height) / 2;
    else if (a.height != null) wallH = a.height;
    else if (b.height != null) wallH = b.height;
    const area = wallH != null ? ((groundWidth + ceilingWidth) / 2) * wallH : null;

    const row = document.createElement('div');
    row.className = 'room-point-item';
    const heightsText = '高度 H: ' + a.label + '=' + (a.height != null ? fmt(a.height, 2) + 'm' : '--') +
      ' ｜ ' + b.label + '=' + (b.height != null ? fmt(b.height, 2) + 'm' : '--');
    const areaText = area != null ? (' ｜ 面积≈' + fmt(area, 2) + ' sqm') : '';
    const span = document.createElement('span');
    span.innerHTML = `<span class="rp-tag" style="color:${matches ? EDGE_MATCH_COLOR : EDGE_MISMATCH_COLOR}">墙${wallLetter(i)}</span>` +
      `${a.label}↔${b.label}<br>地面宽 ${fmt(groundWidth, 2)}m ｜ 天花宽 ${fmt(ceilingWidth, 2)}m${hasOverride ? ' (已修改)' : ''}<br>${heightsText}${areaText}`;
    row.appendChild(span);

    const actions = document.createElement('div');
    actions.className = 'rp-actions';

    const btnEditCeil = document.createElement('button');
    btnEditCeil.className = 'rp-btn-edit';
    btnEditCeil.textContent = '✎天花宽';
    btnEditCeil.title = '修改天花宽度 Edit ceiling width';
    btnEditCeil.addEventListener('click', () => {
      const input = prompt('修改墙' + wallLetter(i) + ' (' + a.label + '↔' + b.label + ') 的天花宽度 (m)，默认与地面宽度相同：\nEdit ceiling width (m), defaults to same as ground width:', fmt(ceilingWidth, 2));
      if (input == null) return;
      const val = parseFloat(input);
      if (!val || val <= 0) { alert('请输入有效的数字 Please enter a valid number'); return; }
      roomWallOverrides[key] = val;
      renderRoomWallsList();
      saveRoomState();
    });
    actions.appendChild(btnEditCeil);

    if (hasOverride) {
      const btnReset = document.createElement('button');
      btnReset.className = 'rp-btn-delete';
      btnReset.textContent = '↺';
      btnReset.title = '恢复与地面相同 Reset to same as ground';
      btnReset.addEventListener('click', () => {
        delete roomWallOverrides[key];
        renderRoomWallsList();
        saveRoomState();
      });
      actions.appendChild(btnReset);
    }

    row.appendChild(actions);
    roomWallsListEl.appendChild(row);
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
  const floorOrdered = orderedFloorPoints();
  const n = floorOrdered.length;
  if (n < 3) {
    roomResArea.textContent = '--';
    roomResPerimeter.textContent = '--';
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
  roomResArea.textContent = fmtArea(area);
  roomResPerimeter.textContent = fmtLen(perimeter);
}

/* ---- 本地保存 Local persistence (survive page reload) ---- */
function saveRoomState() {
  try {
    const state = {
      roomRefHeading, roomFloorPoints, roomObstacles, roomCurrentObstacleIndex,
      roomPointCounter, roomObstacleCounter, roomWallOverrides, roomLastClosureEdgeKeys,
      camHeight: roomHeightInput.value, remarks: roomRemarksInput.value
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
    roomObstacles = state.roomObstacles || [];
    roomCurrentObstacleIndex = state.roomCurrentObstacleIndex != null ? state.roomCurrentObstacleIndex : -1;
    roomPointCounter = state.roomPointCounter || 0;
    roomObstacleCounter = state.roomObstacleCounter || 0;
    roomWallOverrides = state.roomWallOverrides || {};
    roomLastClosureEdgeKeys = state.roomLastClosureEdgeKeys || {};
    if (state.camHeight) roomHeightInput.value = state.camHeight;
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
      const matches = n < 3 ? true : !edgeChangedByKey(a.label, b.label);
      wallInfo.push({
        letter: wallLetter(i), aLabel: a.label, bLabel: b.label, aHeight: a.height, bHeight: b.height,
        groundWidth, ceilingWidth, hasCeilingOverride: roomWallOverrides[wallKey(a.label, b.label)] != null,
        area, matches
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
  const camHeight = parseFloat(roomHeightInput.value);
  ctx.fillText('相机高度 Camera height: ' + (camHeight ? fmt(camHeight, 2) + ' m' : '--') +
    '    地板面积 Area: ' + roomResArea.textContent + '    周长 Perimeter: ' + roomResPerimeter.textContent, 40, y);
  y += 26;

  // ---- 3D isometric drawing ----
  const drawTop = y;
  if (n >= 3) {
    const hue = Math.floor(Math.random() * 360);
    const floorFill = `hsla(${hue},65%,55%,0.25)`;
    const floorStroke = `hsla(${hue},65%,32%,0.9)`;
    const wallFill = `hsla(${(hue + 120) % 360},50%,55%,0.25)`;
    const wallStroke = `hsla(${(hue + 120) % 360},50%,30%,0.9)`;
    const ceilFill = `hsla(${(hue + 240) % 360},50%,60%,0.25)`;
    const ceilStroke = `hsla(${(hue + 240) % 360},50%,32%,0.9)`;
    const obstacleFill = 'rgba(225,75,75,0.28)';
    const obstacleStroke = 'rgba(180,40,40,0.9)';

    const ceilingXY = computeCeilingXY(floorOrdered);
    const showObstacles = !chkHideObstacles.checked && roomObstacles.length > 0;
    const obstacleHeights = roomObstacles.map(g => {
      const hs = g.points.map(p => p.height).filter(h => h != null);
      return hs.length ? hs.reduce((a, b) => a + b, 0) / hs.length : Math.min(avgHeight, 1.2);
    });

    const worldPts = [];
    floorOrdered.forEach((p, i) => {
      worldPts.push({ x: p.x, y: p.y, z: 0 });
      worldPts.push({ x: ceilingXY[i].x, y: ceilingXY[i].y, z: usedHeights[i] });
    });
    if (showObstacles) {
      roomObstacles.forEach((g, gi) => {
        g.points.forEach(p => { worldPts.push({ x: p.x, y: p.y, z: 0 }); worldPts.push({ x: p.x, y: p.y, z: obstacleHeights[gi] }); });
      });
    }
    const pad = 40;
    const project = makeIsoProjector(worldPts, drawSize, pad, (W - drawSize) / 2, drawTop);

    function fillPoly(pts, fill, stroke) {
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
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

    // ceiling
    fillPoly(floorOrdered.map((p, i) => project(ceilingXY[i].x, ceilingXY[i].y, usedHeights[i])), ceilFill, ceilStroke);

    // obstacles
    if (showObstacles) {
      roomObstacles.forEach((g, gi) => {
        const gh = obstacleHeights[gi];
        const gn = g.points.length;
        if (gn >= 3) fillPoly(g.points.map(p => project(p.x, p.y, 0)), obstacleFill, obstacleStroke);
        for (let i = 0; i < (gn >= 3 ? gn : gn - 1); i++) {
          const a = g.points[i], b = g.points[(i + 1) % gn];
          const quad = [project(a.x, a.y, 0), project(b.x, b.y, 0), project(b.x, b.y, gh), project(a.x, a.y, gh)];
          fillPoly(quad, obstacleFill, obstacleStroke);
        }
        if (gn >= 3) fillPoly(g.points.map(p => project(p.x, p.y, gh)), obstacleFill, obstacleStroke);
      });
    }

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
      const matches = !edgeChangedByKey(a.label, b.label);
      drawLabel(ctx, mid.x, mid.y, '墙' + wallLetter(i) + ' ' + fmt(dist, 2) + 'm', fontPx, placedBoxes,
        { color: matches ? EDGE_MATCH_COLOR : EDGE_MISMATCH_COLOR, bold: matches });
    }
    floorOrdered.forEach((p, i) => {
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
      ctx.fillStyle = w.matches ? EDGE_MATCH_COLOR : EDGE_MISMATCH_COLOR;
      ctx.fillText('墙' + w.letter + '  ' + w.aLabel + '↔' + w.bLabel, 40, y);
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
