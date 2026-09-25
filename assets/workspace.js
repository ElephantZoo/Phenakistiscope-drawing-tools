/* Project validation and workspace behavior, independent from the drawing engine. */
function normalizeProject(data, filename = "") {
  if (!data || typeof data.state !== "object" || !data.state) throw new Error("文件缺少项目数据。");
  const source = data.state;
  if (!Array.isArray(source.layers) || source.layers.length === 0 || source.layers.length > 500) throw new Error("项目应包含 1–500 个有效图层。");
  const number = (value, fallback, min, max) => {
    if (value === undefined) return fallback;
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error("项目包含超出范围的数值。");
    return n;
  };
  const color = (value, fallback) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^#[a-f\d]{6}$/i.test(value)) throw new Error("项目包含无效颜色。");
    return value;
  };
  const bool = (value, fallback) => typeof value === "boolean" ? value : fallback;
  let totalPoints = 0;
  const layers = source.layers.map((layer, i) => {
    if (!layer || !Array.isArray(layer.paths)) throw new Error("图层笔画数据不完整。");
    return {
      id: i + 1,
      name: typeof layer.name === "string" ? layer.name.slice(0, 100) : `图层 ${i + 1}`,
      visible: bool(layer.visible, true), noRotate: bool(layer.noRotate, false),
      type: layer.type === "draft" ? "draft" : "normal",
      mode: layer.mode === "fill" ? "fill" : "stroke",
      color: color(layer.color, "#26354a"), opacity: number(layer.opacity, 1, 0, 1),
      strokeWidth: number(layer.strokeWidth, 5, 1, 100),
      paths: layer.paths.map((path, index) => {
        if (!path || !Array.isArray(path.points)) throw new Error("笔画数据不完整。");
        totalPoints += path.points.length;
        if (totalPoints > 2000000) throw new Error("项目笔画过多，请使用较小的项目文件。");
        return { id: index + 1, points: path.points.map(point => {
          if (!point || typeof point.x !== "number" || typeof point.y !== "number") throw new Error("笔画坐标无效。");
          return { x: number(point.x, 0, -1e7, 1e7), y: number(point.y, 0, -1e7, 1e7) };
        }) };
      })
    };
  });
  const onion = source.onionSkins || {};
  return {
    projectName: (typeof source.projectName === "string" && source.projectName.trim() ? source.projectName : filename.replace(/\.(json|zip)$/i, "") || "导入的项目").slice(0, 100),
    layers, activeLayerIndex: Math.min(layers.length - 1, Math.max(0, Math.trunc(Number(source.activeLayerIndex) || 0))),
    sliceCount: Math.round(number(source.sliceCount, 12, 4, 24)), fps: Math.round(number(source.fps, 12, 1, 60)),
    rotDirection: source.rotDirection === -1 ? -1 : 1,
    playbackMode: source.playbackMode === "uniform" ? "uniform" : "slice",
    backgroundColor: color(source.backgroundColor, "#ffffff"),
    onionSkins: { enabled: bool(onion.enabled, bool(source.onionEnabled, true)), showBefore: bool(onion.showBefore, true), showAfter: bool(onion.showAfter, true), opacity: number(onion.opacity ?? source.onionOpacity, 0.2, 0, 1) },
    onionOnTop: bool(source.onionOnTop, false), snapToMidline: bool(source.snapToMidline, true),
    ...(source.zoom === undefined ? {} : {
      zoom: number(source.zoom, 1, 0.1, 10),
      panX: number(source.panX, 0, -1e7, 1e7),
      panY: number(source.panY, 0, -1e7, 1e7),
      viewRotation: number(source.viewRotation, 0, -1e7, 1e7)
    })
  };
}

function supportedVideoType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"].find(type => MediaRecorder.isTypeSupported(type)) || "";
}

function animationRotationAtTime(seconds, fps, slices, direction, mode) {
  const frames = seconds * fps;
  return -(mode === "slice" ? Math.floor(frames + 1e-8) : frames) * (360 / slices) * direction;
}

async function recordAnimationVideo({ loops, fps, size }) {
  const mimeType = supportedVideoType();
  if (!mimeType) throw new Error("浏览器不支持 WebM 编码。");
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const captureFps = Math.max(30, fps);
  const previous = { playing: state.isPlaying, rotation: state.animRotation, transparent: DOM.transparentBgToggle.checked };
  const slices = state.sliceCount, direction = state.rotDirection, mode = state.playbackMode;
  const duration = slices / fps * loops;
  let stream, recorder, interval;
  state.isPlaying = false;
  DOM.transparentBgToggle.checked = false;
  try {
    state.animRotation = 0;
    render(ctx, size, size, true);
    stream = canvas.captureStream(captureFps);
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8000000 });
    return await new Promise((resolve, reject) => {
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onerror = e => reject(e.error || new Error("视频编码失败"));
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.start();
      const started = performance.now();
      interval = setInterval(() => {
        try {
          const seconds = (performance.now() - started) / 1000;
          if (seconds >= duration) { clearInterval(interval); recorder.stop(); return; }
          state.animRotation = animationRotationAtTime(seconds, fps, slices, direction, mode);
          render(ctx, size, size, true);
        } catch (error) { reject(error); }
      }, 1000 / captureFps);
    });
  } finally {
    clearInterval(interval);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (stream) stream.getTracks().forEach(track => track.stop());
    state.isPlaying = previous.playing;
    state.animRotation = previous.rotation;
    DOM.transparentBgToggle.checked = previous.transparent;
    window._lastTime = 0;
    window._sliceTime = 0;
    updateUI();
    render();
  }
}

const engineUpdateUI = updateUI;
updateUI = function () {
  engineUpdateUI();
  const layer = getActiveLayer();
  const byId = id => document.getElementById(id);
  DOM.fpsRange.value = state.fps;
  DOM.fpsVal.textContent = state.fps;
  DOM.snapToggle.checked = state.snapToMidline;
  DOM.playbackModeBtn.textContent = state.playbackMode === "slice" ? "逐格预览" : "连续预览";
  DOM.rotateDirBtn.textContent = state.rotDirection === 1 ? "↺ 逆时针" : "↻ 顺时针";
  DOM.playBtn.textContent = state.isPlaying ? "■ 停止" : "▶ 播放";
  DOM.playBtn.classList.toggle("active", state.isPlaying);
  DOM.playBtn.setAttribute("aria-pressed", String(state.isPlaying));
  DOM.playbackModeBtn.setAttribute("aria-label", `当前${DOM.playbackModeBtn.textContent}，点击切换`);
  DOM.rotateDirBtn.setAttribute("aria-label", `当前${state.rotDirection === 1 ? "逆时针" : "顺时针"}，点击切换方向`);
  DOM.onionLayerBtn.textContent = state.onionOnTop ? "参考显示在上方 ↑" : "参考显示在下方 ↓";
  DOM.touchDrawToggleBtn.textContent = state.allowTouchDraw ? "手指绘画：开启" : "手指绘画：关闭";
  DOM.touchDrawToggleBtn.setAttribute("aria-pressed", String(state.allowTouchDraw));
  DOM.layerOpacityVal.textContent = layer ? `${Math.round(layer.opacity * 100)}%` : "—";
  DOM.onionOpacityVal.textContent = `${Math.round(state.onionSkins.opacity * 100)}%`;
  [DOM.onionOpacity, DOM.onionBeforeToggle, DOM.onionAfterToggle, DOM.onionLayerBtn].forEach(el => el.disabled = !state.onionSkins.enabled);
  byId("canvasMeta").textContent = `${state.sliceCount} 个扇区`;
  byId("layerCount").textContent = state.layers.length;
  byId("colorHex").textContent = layer?.color.toUpperCase() || "—";
  byId("activeModeLabel").textContent = layer?.type === "draft" ? "草稿" : layer?.mode === "fill" ? "闭合填色" : "线条";
  const tool = state.currentTool;
  byId("toolHint").textContent = tool === "eraser" ? "整笔擦除 · 删除触及的整条笔画" : tool === "select" ? "套索选择 · 圈选后拖动、缩放或旋转" : layer?.mode === "fill" ? "闭合填色 · 松开后闭合形状" : "线条画笔 · 拖动绘制";
  byId("layerHint").textContent = layer ? layer.name + (layer.visible ? "" : " · 已隐藏") : "";
  byId("propertyHint").textContent = layer?.type === "draft" ? "草稿在每个扇区重复显示；导出前可隐藏图层。" : "颜色、粗细与填色模式作用于整个图层。";
  DOM.brushSize.disabled = !layer || layer.mode === "fill";
  DOM.brushSizeLabel.textContent = layer?.mode === "fill" ? "线条粗细（填色时不适用）" : "线条粗细";
  [DOM.modeStrokeBtn, DOM.modeFillBtn, DOM.toolEraserBtn, DOM.toolSelectBtn].forEach(el => el.setAttribute("aria-pressed", String(el.classList.contains("active"))));
  DOM.layoutToggleBtn.textContent = document.body.classList.contains("layout-left") ? "将属性面板移到右侧" : "将属性面板移到左侧";
};

const engineRender = render;
render = function (...args) {
  engineRender(...args);
  if (args[0]?.canvas || !DOM.viewport) return;
  const angle = ((state.viewRotation % 360) + 360) % 360;
  document.getElementById("zoomReadout").textContent = `${Math.round(state.zoom * 100)}%`;
  document.getElementById("rotationReadout").textContent = `${Math.round(angle)}°`;
  document.getElementById("viewAngle").textContent = `${Math.round(angle)}°`;
  DOM.rotationSlider.value = angle;
  DOM.rotControl.setAttribute("aria-valuenow", String(Math.round(angle)));
  document.getElementById("canvasHint").hidden = state.layers.some(layer => layer.paths.length) || state.isPlaying || state.isDrawing;
};

const engineSaveHistory = saveHistory;
saveHistory = function () {
  // A color drag is one undo operation, committed when the picker closes.
  if (DOM.colorPickerOverlay?.style.display === "block") { setUnsaved(true); updateUI(); return; }
  engineSaveHistory();
};
const engineCloseColorPicker = closeColorPicker;
closeColorPicker = function () {
  const wasOpen = DOM.colorPickerOverlay.style.display === "block";
  engineCloseColorPicker();
  if (wasOpen) saveHistory();
};
const engineOpenColorPicker = openColorPicker;
openColorPicker = function (...args) {
  engineOpenColorPicker(...args);
  const box = DOM.colorPickerBox;
  const rect = box.getBoundingClientRect();
  box.style.right = "auto";
  box.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
};

document.addEventListener("DOMContentLoaded", () => {
  const byId = id => document.getElementById(id);
  const themeButton = byId("themeToggleBtn");
  function syncThemeButton() {
    const dark = document.documentElement.dataset.theme !== "light";
    themeButton.querySelector(".theme-icon").textContent = dark ? "☀" : "☾";
    themeButton.querySelector(".theme-label").textContent = dark ? "浅色" : "深色";
    const nextLabel = dark ? "切换浅色外观" : "切换深色外观";
    themeButton.setAttribute("aria-label", nextLabel);
    themeButton.title = nextLabel;
  }
  themeButton.onclick = () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("phenaki-theme", next); } catch (_) {}
    syncThemeButton();
  };
  syncThemeButton();
  const exportPanel = byId("exportPanel"), exportButton = byId("exportMenuBtn");
  function closeExport() { exportPanel.hidden = true; exportButton.setAttribute("aria-expanded", "false"); }
  exportButton.onclick = () => { exportPanel.hidden = !exportPanel.hidden; exportButton.setAttribute("aria-expanded", String(!exportPanel.hidden)); };
  byId("closeExportBtn").onclick = () => { closeExport(); exportButton.focus(); };
  byId("importProjectBtn").onclick = () => DOM.importJsonInput.click();
  document.addEventListener("pointerdown", e => { if (!exportPanel.contains(e.target) && !exportButton.contains(e.target)) closeExport(); });
  byId("inspectorToggle").onclick = () => {
    const open = byId("inspector").classList.toggle("is-open");
    byId("inspectorToggle").setAttribute("aria-expanded", String(open));
  };
  DOM.layoutToggleBtn.addEventListener("click", () => { updateUI(); requestAnimationFrame(centerView); });
  DOM.playBtn.addEventListener("click", updateUI);
  DOM.shortcutToggleBtn.addEventListener("click", () => DOM.shortcutToggleBtn.setAttribute("aria-expanded", String(DOM.shortcutPanel.classList.contains("expanded"))));
  for (const id of ["onionToggle", "onionBeforeToggle", "onionAfterToggle", "onionOpacity", "snapToggle"]) byId(id).addEventListener("change", saveHistory);
  DOM.onionLayerBtn.addEventListener("click", saveHistory);
  DOM.rotControl.onkeydown = e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); rotateView(e.key === "ArrowLeft" ? 1 : -1); }
  };
  DOM.viewport.addEventListener("pointercancel", () => { state.isPanning = false; resetInteractionState(); if (state.selection.status === "selecting") resetSelection(); render(); });
  DOM.viewport.addEventListener("contextmenu", e => e.preventDefault());
  DOM.viewport.appendChild(DOM.selectionActions);
  DOM.selectionCancelBtn.title = "取消变换（Esc）";
  DOM.selectionConfirmBtn.title = "应用变换（Enter）";
  DOM.cpHexInput.setAttribute("aria-label", "十六进制颜色");
  DOM.colorPickerBox.setAttribute("role", "dialog");
  DOM.colorPickerBox.setAttribute("aria-label", "颜色选择器");
  const overlays = [...document.querySelectorAll(".modal-overlay")];
  let lastFocus = null;
  overlays.forEach(overlay => {
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", overlay.querySelector(".modal-header")?.textContent.trim() || "导出进度");
    const closeButton = overlay.querySelector(".close-modal");
    if (closeButton) closeButton.setAttribute("aria-label", "关闭对话框");
    new MutationObserver(() => {
      if (overlay.style.display !== "none") { lastFocus = document.activeElement; (overlay.querySelector("select, button") || overlay).focus(); }
      else if (lastFocus?.isConnected) lastFocus.focus();
    }).observe(overlay, { attributes: true, attributeFilter: ["style"] });
  });
  document.addEventListener("keydown", e => {
    const modal = overlays.find(el => el.style.display !== "none");
    if (e.key === "Escape") {
      if (modal) { if (modal.id !== "exportLoadingModal") modal.style.display = "none"; }
      else if (DOM.colorPickerOverlay.style.display === "block") closeColorPicker();
      else if (!exportPanel.hidden) { closeExport(); exportButton.focus(); }
      else { byId("inspector").classList.remove("is-open"); byId("inspectorToggle").setAttribute("aria-expanded", "false"); }
    }
    if (modal && e.key === "Tab") {
      const items = [...modal.querySelectorAll("button, a, input, select, [tabindex]")].filter(el => !el.disabled && el.getClientRects().length);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  updateUI();
});
