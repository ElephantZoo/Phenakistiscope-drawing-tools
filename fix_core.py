from pathlib import Path
p = Path('assets/app.js')
s = p.read_text(encoding='utf-8')
def change(old,new):
    global s
    if old not in s: raise RuntimeError('Missing: '+old[:90])
    s = s.replace(old,new)
change('initGlobalAutoBlur();', '// Keep native keyboard focus for accessible controls.')
change('addLayer("图层 1");', 'addLayer("图层 1", "#26354a");')
change('        saveHistory();\n        requestAnimationFrame(loop);', '        saveHistory();\n        setUnsaved(false);\n        requestAnimationFrame(loop);')
change('          resizeCanvas();\n          render();\n        }).observe(DOM.viewport);', '''          const oldW = DOM.mainCanvas.width / state.dpr;
          const oldH = DOM.mainCanvas.height / state.dpr;
          resizeCanvas();
          state.panX += (DOM.viewport.clientWidth - oldW) / 2;
          state.panY += (DOM.viewport.clientHeight - oldH) / 2;
          render();
        }).observe(DOM.viewport);''')
change('return state.activeLayerIndex > -1\n          ? state.layers[state.activeLayerIndex]\n          : null;', 'return state.layers[state.activeLayerIndex] || null;')
change('          Date.now(),\n          name ||', '          Date.now() + Math.random(),\n          name ||')
change('newLayer.id = Date.now();', 'newLayer.id = Date.now() + Math.random();')
change('      function setActiveLayer(index) {\n        state.activeLayerIndex', '      function setActiveLayer(index) {\n        cancelSelection();\n        state.activeLayerIndex')
change('          state.layers.splice(state.activeLayerIndex, 1);', '          cancelSelection();\n          state.layers.splice(state.activeLayerIndex, 1);')
change('          layer.paths = [];', '          cancelSelection();\n          layer.paths = [];')
start=s.index('      function saveHistory() {')
end=s.index('      function handleDragStart(e)',start)
s=s[:start]+'''      // Persist only project data; gestures, selection and playback are transient.
      function projectData() {
        const keys = ["projectName", "layers", "activeLayerIndex", "sliceCount", "fps",
          "rotDirection", "playbackMode", "backgroundColor", "onionSkins", "onionOnTop", "snapToMidline"];
        return Object.fromEntries(keys.map(key => [key, state[key]]));
      }
      function contentSnapshot() {
        const data = projectData();
        delete data.activeLayerIndex;
        return JSON.stringify(data);
      }
      let savedSnapshot = null;
      let savedLabel = "尚未导出";
      function saveHistory() {
        const snapshot = JSON.stringify(projectData());
        if (undoStack[undoStack.length - 1] === snapshot) return;
        undoStack.push(snapshot);
        if (undoStack.length > CONFIG.maxHistory) undoStack.shift();
        redoStack = [];
        if (undoStack.length > 1) setUnsaved(true);
        updateUI();
      }
      function loadHistory(snapshot) {
        resetSelection();
        resetInteractionState();
        Object.assign(state, JSON.parse(snapshot));
        setUnsaved(true);
        updateUI();
        render();
      }
      function undo() {
        cancelSelection();
        if (undoStack.length <= 1) return;
        redoStack.push(undoStack.pop());
        loadHistory(undoStack[undoStack.length - 1]);
        showToast("已撤销");
      }
      function redo() {
        cancelSelection();
        if (redoStack.length === 0) return;
        const snapshot = redoStack.pop();
        undoStack.push(snapshot);
        loadHistory(snapshot);
        showToast("已重做");
      }
      function setUnsaved(val) {
        if (!val) savedSnapshot = contentSnapshot();
        state.hasUnsavedChanges = contentSnapshot() !== savedSnapshot;
        DOM.statusDot.className = `dot ${state.hasUnsavedChanges ? "unsaved" : "saved"}`;
        DOM.statusText.innerText = state.hasUnsavedChanges ? "有更改 · 未导出" : savedLabel;
      }
''' + s[end:]
start=s.index('      function loadProjectData(')
end=s.index('      function rotateView(',start)
s=s[:start]+'''      function loadProjectData(jsonString, filename) {
        try {
          // Validate completely before replacing the current artwork.
          const imported = normalizeProject(JSON.parse(jsonString), filename);
          if (state.hasUnsavedChanges && !confirm("当前项目有未导出的更改。打开文件将替换画布，是否继续？")) return false;
          cancelSelection();
          state.isPlaying = false;
          state.animRotation = 0;
          state.isPanning = false;
          resetInteractionState();
          Object.assign(state, imported);
          state.currentTool = "brush";
          DOM.viewport.classList.remove("erasing", "panning", "rotating");
          DOM.viewport.style.cursor = "";
          undoStack = [];
          redoStack = [];
          centerView();
          saveHistory();
          savedLabel = "已载入项目";
          setUnsaved(false);
          updateUI();
          showToast("项目已打开");
          return true;
        } catch (err) {
          alert("无法打开项目，当前画布未更改。\\n" + err.message);
          return false;
        }
      }

''' + s[end:]
change('if (e.target.matches("input") && e.target.type === "text") return;', '''if (e.target.closest("input, select, textarea, button, [contenteditable=true]")) return;
          if ([...document.querySelectorAll(".modal-overlay")].some(el => el.style.display !== "none")) return;''')
change('          setUnsaved(true);\n        };\n        DOM.currentLayerInput.oninput', '          setUnsaved(true);\n        };\n        DOM.projectNameInput.onchange = () => saveHistory();\n        DOM.currentLayerInput.oninput')
change('            layer.name = e.target.value;\n            renderLayerList();', '            layer.name = e.target.value;\n            setUnsaved(true);\n            renderLayerList();')
change('layer.strokeWidth = e.target.value;', 'layer.strokeWidth = Number(e.target.value);')
change('              DOM.bgColorSwatch.style.backgroundColor = hex;\n              render();', '              DOM.bgColorSwatch.style.backgroundColor = hex;\n              saveHistory();\n              render();')
change('        DOM.sliceCountRange.oninput = (e) => {', '        DOM.sliceCountRange.onchange = () => saveHistory();\n        DOM.sliceCountRange.oninput = (e) => {')
change('          DOM.sliceValDisplay.textContent = state.sliceCount;\n          render();', '          DOM.sliceValDisplay.textContent = state.sliceCount;\n          setUnsaved(true);\n          updateUI();\n          render();')
start=s.index('        DOM.resetAllBtn.onclick =')
end=s.index('        DOM.fpsRange.oninput',start)
s=s[:start]+'''        DOM.resetAllBtn.onclick = () => {
          if (!confirm("重置为新的空白项目？此操作可以撤销。")) return;
          cancelSelection();
          state.isPlaying = false;
          state.animRotation = 0;
          Object.assign(state, {
            layers: [new Layer(Date.now() + Math.random(), "图层 1", "#26354a")],
            activeLayerIndex: 0, projectName: "未命名项目", backgroundColor: "#ffffff",
            sliceCount: 12, fps: 12, rotDirection: 1, playbackMode: "slice",
            onionSkins: { enabled: true, showBefore: true, showAfter: true, opacity: 0.2 },
            onionOnTop: false, snapToMidline: true
          });
          resetInteractionState();
          centerView();
          saveHistory();
          updateUI();
        };
        DOM.fpsRange.onchange = () => saveHistory();
''' + s[end:]
change('          DOM.fpsVal.textContent = state.fps;\n        };', '          DOM.fpsVal.textContent = state.fps;\n          setUnsaved(true);\n        };')
change('          this.classList.toggle("active", state.rotDirection === -1);', '          this.classList.toggle("active", state.rotDirection === -1);\n          saveHistory();')
change('state.playbackMode === "slice" ? "逐格模式" : "匀速模式";\n        };', 'state.playbackMode === "slice" ? "逐格预览" : "连续预览";\n          saveHistory();\n        };')
change('        DOM.playBtn.onclick = () => {\n          state.isPlaying', '        DOM.playBtn.onclick = () => {\n          confirmSelection();\n          state.isPlaying')
change('        DOM.exportJsonBtn.onclick = async () => {', '        DOM.exportJsonBtn.onclick = async () => {\n          confirmSelection();')
change('            const dataToExport = { version: "12.0", state: state };', '            const exportedSnapshot = contentSnapshot();\n            const dataToExport = { version: "13.0", state: projectData() };')
change('            const pngDataUrl = DOM.mainCanvas.toDataURL("image/png");', '''            const preview = document.createElement("canvas");
            preview.width = preview.height = 1024;
            render(preview.getContext("2d"), 1024, 1024, true);
            const pngDataUrl = preview.toDataURL("image/png");''')
change('            setUnsaved(false);\n          } catch (error)', '            savedSnapshot = exportedSnapshot;\n            savedLabel = "已导出项目";\n            setUnsaved(true);\n            showToast("项目下载已开始");\n          } catch (error)')
change('alert("导出失败，请打开开发者控制台查看错误信息。");', 'alert("项目导出失败。请重试；如果仍失败，可先导出 PNG 保留画面。\\n" + error.message);')
change('        DOM.exportPngBtn.onclick = () => {', '        DOM.exportPngBtn.onclick = () => {\n          confirmSelection();')
change('        DOM.exportVideoBtn.onclick = () => {\n          DOM.videoSettingsModal.style.display = "flex";', '''        DOM.exportVideoBtn.onclick = () => {
          confirmSelection();
          if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream || !supportedVideoType()) {
            showToast("当前浏览器不支持 WebM 导出，请使用新版 Chrome 或 Edge");
            return;
          }
          DOM.videoSettingsModal.style.display = "flex";''')
start=s.index('        async function recordVideo(options) {')
end=s.index('        DOM.importJsonInput.onchange',start)
s=s[:start]+'''        async function recordVideo(options) {
          return recordAnimationVideo(options);
        }

''' + s[end:]
change('file.name.endsWith(".zip")', '/\\.zip$/i.test(file.name)')
change('file.name.endsWith(".json")', '/\\.json$/i.test(file.name)')
change('name.endsWith(".json")', '/\\.json$/i.test(name)')
change('const degreesPerSecond = state.fps * 6;', 'const degreesPerSecond = state.fps * (360 / state.sliceCount);')
change('''              state.animRotation =
                state.animRotation - step * state.rotDirection;
              window._sliceTime = 0;''', '''              const steps = Math.floor(window._sliceTime / (1000 / state.fps));
              state.animRotation -= steps * step * state.rotDirection;
              window._sliceTime %= 1000 / state.fps;''')
change('state.zoom = (Math.min(w, h) / CONFIG.baseSize) * 0.9;', 'state.zoom = (Math.min(w, h) / CONFIG.baseSize) * 0.79;')
change('          if (state.isGesturing) return;\n          if (e.pointerType === "touch" && !e.isPrimary) return;', '''          if (state.isGesturing) return;
          if (e.pointerType === "touch" && !e.isPrimary) return;''')
# Preserve navigation regardless of active tool, and reject non-drawing targets.
change('''        DOM.viewport.addEventListener("pointerdown", (e) => {
          if''', '''        DOM.viewport.addEventListener("pointerdown", (e) => {
          if (e.target !== DOM.mainCanvas && e.target !== DOM.viewport) return;
          if (e.button === 2) return;
          if (e.pointerType === "touch" && !state.allowTouchDraw) return;
          if (e.button === 1 || state.isPanning) {
            e.preventDefault();
            DOM.viewport.setPointerCapture(e.pointerId);
            startDrag(e);
            return;
          }
          if (state.isRotating) {
            e.preventDefault();
            DOM.viewport.setPointerCapture(e.pointerId);
            state.dragStartAngle = getMouseAngle(e.clientX, e.clientY);
            state.dragStartViewRot = state.viewRotation;
            return;
          }
          if (!getActiveLayer()?.visible) {
            showToast("当前图层已隐藏，请先显示图层再绘制");
            return;
          }
          if''')
change('''          // === SELECTION SYSTEM START ===
          if (state.currentTool === "select") {
            handleSelectionPointerMove(e);''', '''          if (state.drag.isActive) { doDrag(e); return; }
          if (state.isRotating && (e.buttons & 1)) {
            state.viewRotation = state.dragStartViewRot + getMouseAngle(e.clientX, e.clientY) - state.dragStartAngle;
            if (state.snapToMidline) snapRotation();
            render();
            return;
          }
          // === SELECTION SYSTEM START ===
          if (state.currentTool === "select") {
            handleSelectionPointerMove(e);''')
change('          DOM.viewport.releasePointerCapture(e.pointerId);', '          if (DOM.viewport.hasPointerCapture(e.pointerId)) DOM.viewport.releasePointerCapture(e.pointerId);')
change('''          if (state.currentTool === "select") {
            handleSelectionPointerUp(e);''', '''          if (state.drag.isActive) { state.drag.isActive = false; return; }
          if (state.currentTool === "select") {
            handleSelectionPointerUp(e);''')
change('const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];', 'const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];\n            const events = coalesced.length ? coalesced : [e];')
# Buttons in the layer list are keyboard-operable and their state is explicit.
change('const vis = document.createElement("span");','const vis = document.createElement("button");')
change('vis.innerHTML = layer.visible ? "👁️" : "🚫";', 'vis.textContent = layer.visible ? "◉" : "○";\n          vis.setAttribute("aria-label", layer.visible ? "隐藏图层" : "显示图层");\n          vis.setAttribute("aria-pressed", String(layer.visible));')
change('const pin = document.createElement("span");','const pin = document.createElement("button");')
change('pin.innerHTML = "📌";', 'pin.textContent = layer.noRotate ? "▪" : "↻";\n          pin.setAttribute("aria-label", layer.noRotate ? "固定图层，点击跟随旋转" : "跟随旋转，点击固定图层");\n          pin.setAttribute("aria-pressed", String(layer.noRotate));')
change('          div.draggable = true;', '''          div.draggable = true;
          div.tabIndex = 0;
          div.setAttribute("role", "group");
          div.setAttribute("aria-label", layer.name + (layer.id === getActiveLayer()?.id ? "，当前图层" : ""));
          div.onkeydown = e => { if (e.target === div && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActiveLayer(i); } };''')
change('          upBtn.innerHTML = "↑";', '          upBtn.innerHTML = "↑";\n          upBtn.title = "上移图层";\n          upBtn.disabled = i === state.layers.length - 1;')
change('          downBtn.innerHTML = "↓";', '          downBtn.innerHTML = "↓";\n          downBtn.title = "下移图层";\n          downBtn.disabled = i === 0;')
change('          DOM.touchDrawToggleBtn.style.background = "var(--danger-color)";', '          DOM.touchDrawToggleBtn.style.background = "";')
# Prevent a pending transform from being left attached to the wrong layer.
change('      function addLayer(name, color, type = "normal") {', '      function addLayer(name, color, type = "normal") {\n        cancelSelection();')
change('      function duplicateLayer() {', '      function duplicateLayer() {\n        confirmSelection();')
change('      function handleDragStart(e) {', '      function handleDragStart(e) {\n        cancelSelection();')
p.write_text(s,encoding='utf-8')
