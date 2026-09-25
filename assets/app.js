
      const CONFIG = {
        baseSize: 500,
        maxHistory: 50,
        pathSimplificationThreshold: 5.5,
      };

      class Path {
        constructor(points) {
          this.id = Date.now() + Math.random();
          this.points = points;
        }
      }
      class Layer {
        constructor(id, name, color, type = "normal") {
          this.id = id;
          this.name = name;
          this.visible = true;
          this.noRotate = false; //
          this.paths = [];
          this.mode = "stroke";
          this.type = type; // normal or draft
          if (this.type === "draft") {
            this.color = "#000000";
            this.opacity = 0.2;
          } else {
            this.color =
              color ||
              `#${Math.floor(Math.random() * 16777215)
                .toString(16)
                .padStart(6, "0")}`;
            this.opacity = 1;
          }
          this.strokeWidth = 5;
        }
      }

      const state = {
        projectName: "未命名项目",
        layers: [],
        activeLayerIndex: -1,
        isPlaying: false,
        sliceCount: 12,
        animRotation: 0,
        rotDirection: 1,
        playbackMode: "slice",
        backgroundColor: "#ffffff",
        zoom: 1,
        panX: 0,
        panY: 0,
        viewRotation: 0,
        isDrawing: false,
        isPanning: false,
        isRotating: false,
        isErasing: false,
        currentTool: "brush",
        currentBrushPath: [],
        pathsToErase: new Set(),
        drag: {
          isActive: false,
          startX: 0,
          startY: 0,
          startPanX: 0,
          startPanY: 0,
        },
        draggedLayerId: null,
        dragStartAngle: 0,
        dragStartViewRot: 0,
        cursorWorldX: 0,
        cursorWorldY: 0,
        cursorScreenX: 0,
        cursorScreenY: 0,
        isCursorInCanvas: false,
        onionSkins: {
          enabled: true,
          showBefore: true,
          showAfter: true,
          opacity: 0.2,
        },
        onionOnTop: false,
        snapToMidline: true,
        hasUnsavedChanges: false,
        dpr: 1,
        fps: 12,
        isGesturing: false,
        allowTouchDraw: true,
        // === SELECTION SYSTEM START ===
        selection: {
          status: "none", // 'none', 'selecting', 'transforming'
          lassoPath: [],
          selectedPathIds: new Set(),
          originalPaths: new Map(),
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          isUniform: false,
          bbox: null, // { minX, minY, width, height, cx, cy }
          activeControl: null, // 'move', 'rotate', 'tl', 'tr', 'bl', 'br'
          dragStart: { x: 0, y: 0, transform: null },
        },
        // === SELECTION SYSTEM END ===
      };

      const DOM = {};
      let undoStack = [],
        redoStack = [];

      const cpState = {
        h: 0,
        s: 0,
        v: 100,
        isDraggingSV: false,
        isDraggingHue: false,
        targetCallback: null,
      };

      function setHeaderCollapsed(collapsed) {
        if (!DOM.headerToggleBtn) return;
        document.body.classList.toggle("header-collapsed", collapsed);
        const label = collapsed ? "展开顶部栏" : "收起顶部栏";
        DOM.headerToggleBtn.textContent = collapsed ? "⌄" : "⌃";
        DOM.headerToggleBtn.title = label;
        DOM.headerToggleBtn.setAttribute("aria-label", label);
      }

      function setTransportCollapsed(collapsed) {
        const stage = DOM.viewport ? DOM.viewport.closest(".stage") : null;
        if (!stage || !DOM.transportToggleBtn) return;
        stage.classList.toggle("transport-collapsed", collapsed);
        const label = collapsed ? "展开播放控制" : "收起播放控制";
        DOM.transportToggleBtn.textContent = collapsed ? "⌃" : "⌄";
        DOM.transportToggleBtn.title = label;
        DOM.transportToggleBtn.setAttribute("aria-label", label);
      }

      function init() {
        const ids = [
          "viewport",
          "mainCanvas",
          "importJsonInput",
          "onionToggle",
          "onionOpacity",
          "onionOpacityVal",
          "fpsRange",
          "fpsVal",
          "rotationSlider",
          "currentLayerInput",
          "layerList",
          "brushSizeLabel",
          "brushSize",
          "brushSizeVal",
          "statusDot",
          "statusText",
          "playBtn",
          "headerToggleBtn",
          "transportToggleBtn",
          "playbackModeBtn",
          "snapToggle",
          "layerOpacity",
          "layerOpacityVal",
          "modeFillBtn",
          "modeStrokeBtn",
          "toolEraserBtn",
          "toolSelectBtn",
          "undoBtn",
          "redoBtn",
          "addLayerBtn",
          "addDraftLayerBtn",
          "delLayerBtn",
          "clearLayerBtn",
          "resetViewBtn",
          "exportJsonBtn",
          "resetAllBtn",
          "rotateDirBtn",
          "onionLayerBtn",
          "projectNameInput",
          "copyLayerBtn",
          "onionBeforeToggle",
          "onionAfterToggle",
          "welcomeModal",
          "closeModalBtn",
          "layoutToggleBtn",
          "rotLeftBtn",
          "rotRightBtn",
          "sliceCountRange",
          "sliceValDisplay",
          "shortcutPanel",
          "shortcutContent",
          "shortcutToggleBtn",
          "shortcutTitle",
          "touchDrawToggleBtn",
          "rotControl",
          "toastMsg",
          "layerColorTrigger",
          "layerColorSwatch",
          "backgroundColorTrigger",
          "bgColorSwatch",
          "colorPickerOverlay",
          "colorPickerBox",
          "cpSatValCanvas",
          "cpHueCanvas",
          "cpSVPointer",
          "cpHueSlider",
          "cpPreview",
          "cpHexInput",
          "cpSVWrap",
          "cpHueWrap",
          "exportPngBtn",
          "transparentBgToggle",
          "showAboutBtn",
          "openDonateBtn",
          "donateModal",
          "closeDonateBtn",
          "exportVideoBtn",
          "videoSettingsModal",
          "closeVideoModalBtn",
          "confirmVideoExportBtn",
          "videoLoopsSelect",
          "videoSizeSelect",
          "videoSuccessModal",
          "closeVideoSuccessBtn",
          "exportLoadingModal",
          // === SELECTION SYSTEM START ===
          "selectionActions",
          "selectionUniformBtn",
          "selectionCopyBtn",
          "selectionCancelBtn",
          "selectionConfirmBtn",
          // === SELECTION SYSTEM END ===
        ];
        ids.forEach((id) => {
          const el = document.getElementById(id);
          if (el) DOM[id] = el;
        });
        DOM.ctx = DOM.mainCanvas.getContext("2d");
        state.dpr = window.devicePixelRatio || 1;
        try {
          setHeaderCollapsed(
            localStorage.getItem("phenaki-header-collapsed") === "1",
          );
        } catch (_) {
          setHeaderCollapsed(false);
        }
        try {
          setTransportCollapsed(
            localStorage.getItem("phenaki-transport-collapsed") === "1",
          );
        } catch (_) {
          setTransportCollapsed(false);
        }

        // Keep native keyboard focus for accessible controls.
        window.lastPencilTime = 0;

        const isTouch =
          "ontouchstart" in window || navigator.maxTouchPoints > 0;
        if (isTouch) document.body.classList.add("layout-left");

        initShortcutPanel();
        initRotationKnob();
        initColorPicker();

        resizeCanvas();
        centerView();
        addLayer("图层 1", "#26354a");
        new ResizeObserver(() => {
          const oldW = DOM.mainCanvas.width / state.dpr;
          const oldH = DOM.mainCanvas.height / state.dpr;
          const wasFitted = Math.abs(state.zoom - Math.min(oldW, oldH) / CONFIG.baseSize * 0.84) < 0.015;
          resizeCanvas();
          if (wasFitted) {
            state.zoom = Math.min(DOM.viewport.clientWidth, DOM.viewport.clientHeight) / CONFIG.baseSize * 0.84;
            state.panX = (DOM.viewport.clientWidth - CONFIG.baseSize * state.zoom) / 2;
            state.panY = (DOM.viewport.clientHeight - CONFIG.baseSize * state.zoom) / 2;
          } else {
            state.panX += (DOM.viewport.clientWidth - oldW) / 2;
            state.panY += (DOM.viewport.clientHeight - oldH) / 2;
          }
          render();
        }).observe(DOM.viewport);
        bindEvents();
        updateUI();
        saveHistory();
        setUnsaved(false);
        requestAnimationFrame(loop);
      }

      function initGlobalAutoBlur() {
        const handleBlur = (e) => {
          const t = e.target;
          if (t.tagName === "SELECT" || t.closest("select")) return;
          if (
            t.tagName === "INPUT" &&
            (t.type === "text" || t.type === "number")
          )
            return;
          if (t && t.blur) setTimeout(() => t.blur(), 0);
        };
        window.addEventListener("mouseup", handleBlur);
        window.addEventListener("touchend", handleBlur);
        window.addEventListener("change", handleBlur);
        window.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && e.target.tagName === "INPUT")
            e.target.blur();
        });
        document.body.addEventListener("focusout", (e) => {
          if (e.target.tagName === "INPUT") {
            setTimeout(() => {
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
              document.documentElement.scrollTop = 0;
            }, 200);
          }
        });
      }

      function hsvToRgb(h, s, v) {
        s /= 100;
        v /= 100;
        let c = v * s,
          x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
          m = v - c,
          r = 0,
          g = 0,
          b = 0;
        if (0 <= h && h < 60) {
          r = c;
          g = x;
          b = 0;
        } else if (60 <= h && h < 120) {
          r = x;
          g = c;
          b = 0;
        } else if (120 <= h && h < 180) {
          r = 0;
          g = c;
          b = x;
        } else if (180 <= h && h < 240) {
          r = 0;
          g = x;
          b = c;
        } else if (240 <= h && h < 300) {
          r = x;
          g = 0;
          b = c;
        } else if (300 <= h && h < 360) {
          r = c;
          g = 0;
          b = x;
        }
        return {
          r: Math.round((r + m) * 255),
          g: Math.round((g + m) * 255),
          b: Math.round((b + m) * 255),
        };
      }
      function rgbToHsv(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
        let max = Math.max(r, g, b),
          min = Math.min(r, g, b),
          d = max - min,
          h = 0,
          s = max === 0 ? 0 : d / max,
          v = max;
        if (max !== min) {
          switch (max) {
            case r:
              h = (g - b) / d + (g < b ? 6 : 0);
              break;
            case g:
              h = (b - r) / d + 2;
              break;
            case b:
              h = (r - g) / d + 4;
              break;
          }
          h /= 6;
        }
        return { h: h * 360, s: s * 100, v: v * 100 };
      }
      function rgbToHex(r, g, b) {
        return (
          "#" +
          ((1 << 24) + (r << 16) + (g << 8) + b)
            .toString(16)
            .slice(1)
            .toUpperCase()
        );
      }
      function hexToRgb(hex) {
        let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? {
              r: parseInt(result[1], 16),
              g: parseInt(result[2], 16),
              b: parseInt(result[3], 16),
            }
          : null;
      }

      function initColorPicker() {
        const hueCtx = DOM.cpHueCanvas.getContext("2d");
        const hueGrad = hueCtx.createLinearGradient(0, 0, 0, 200);
        hueGrad.addColorStop(0, "red");
        hueGrad.addColorStop(0.17, "#ff0");
        hueGrad.addColorStop(0.33, "lime");
        hueGrad.addColorStop(0.5, "cyan");
        hueGrad.addColorStop(0.67, "blue");
        hueGrad.addColorStop(0.83, "#f0f");
        hueGrad.addColorStop(1, "red");
        hueCtx.fillStyle = hueGrad;
        hueCtx.fillRect(0, 0, 30, 200);

        DOM.cpSVWrap.addEventListener("pointerdown", startDragSV);
        DOM.cpSVWrap.addEventListener("pointermove", dragSV);
        DOM.cpSVWrap.addEventListener("pointerup", endDrag);

        DOM.cpHueWrap.addEventListener("pointerdown", startDragHue);
        DOM.cpHueWrap.addEventListener("pointermove", dragHue);
        DOM.cpHueWrap.addEventListener("pointerup", endDrag);

        DOM.cpHexInput.addEventListener("change", (e) => {
          let hex = e.target.value;
          if (!hex.startsWith("#")) hex = "#" + hex;
          const rgb = hexToRgb(hex);
          if (rgb) {
            const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
            cpState.h = hsv.h;
            cpState.s = hsv.s;
            cpState.v = hsv.v;
            updateColorPickerUI();
            applyColor();
          }
        });
      }

      function handleOutsideClick(e) {
        if (DOM.colorPickerBox.contains(e.target)) return;
        if (e.target.closest(".color-swatch-wrapper")) return;
        closeColorPicker();
      }

      function renderSVCanvas() {
        const ctx = DOM.cpSatValCanvas.getContext("2d");
        const w = ctx.canvas.width;
        const h = ctx.canvas.height;
        ctx.clearRect(0, 0, w, h);
        const svBaseColor = hsvToRgb(cpState.h, 100, 100);
        ctx.fillStyle = `rgb(${svBaseColor.r},${svBaseColor.g},${svBaseColor.b})`;
        ctx.fillRect(0, 0, w, h);
        const grH = ctx.createLinearGradient(0, 0, w, 0);
        grH.addColorStop(0, "#fff");
        grH.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = grH;
        ctx.fillRect(0, 0, w, h);
        const grV = ctx.createLinearGradient(0, 0, 0, h);
        grV.addColorStop(0, "rgba(0,0,0,0)");
        grV.addColorStop(1, "#000");
        ctx.fillStyle = grV;
        ctx.fillRect(0, 0, w, h);
      }

      function updateColorPickerUI() {
        renderSVCanvas();
        const svW = DOM.cpSatValCanvas.width;
        const svH = DOM.cpSatValCanvas.height;
        DOM.cpSVPointer.style.left = (cpState.s / 100) * svW + "px";
        DOM.cpSVPointer.style.top = ((100 - cpState.v) / 100) * svH + "px";
        DOM.cpHueSlider.style.top =
          (cpState.h / 360) * DOM.cpHueCanvas.height + "px";
        const rgb = hsvToRgb(cpState.h, cpState.s, cpState.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        DOM.cpPreview.style.background = hex;
        DOM.cpHexInput.value = hex;
      }

      function openColorPicker(initialHex, callback, triggerEl) {
        cpState.targetCallback = callback;
        const rgb = hexToRgb(initialHex) || { r: 255, g: 0, b: 0 };
        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        cpState.h = hsv.h;
        cpState.s = hsv.s;
        cpState.v = hsv.v;
        updateColorPickerUI();
        DOM.colorPickerOverlay.style.display = "block";
        if (triggerEl) {
          const rect = triggerEl.getBoundingClientRect();
          const box = DOM.colorPickerBox;
          const isLeftLayout = document.body.classList.contains("layout-left");
          let topPos = rect.top - 10;
          if (topPos + 290 > window.innerHeight) {
            topPos = window.innerHeight - 310;
          }
          if (topPos < 10) topPos = 10;
          box.style.top = topPos + "px";
          if (isLeftLayout) {
            box.style.left = rect.right + 12 + "px";
            box.style.right = "auto";
          } else {
            box.style.left = "auto";
            box.style.right = window.innerWidth - rect.left + 12 + "px";
          }
        }
        setTimeout(() => {
          document.addEventListener("pointerdown", handleOutsideClick);
        }, 0);
      }

      function closeColorPicker() {
        DOM.colorPickerOverlay.style.display = "none";
        cpState.targetCallback = null;
        document.removeEventListener("pointerdown", handleOutsideClick);
      }

      function applyColor() {
        const rgb = hsvToRgb(cpState.h, cpState.s, cpState.v);
        const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
        if (cpState.targetCallback) cpState.targetCallback(hex);
      }

      function startDragSV(e) {
        cpState.isDraggingSV = true;
        DOM.cpSVWrap.setPointerCapture(e.pointerId);
        updateSVFromEvent(e);
      }
      function dragSV(e) {
        if (!cpState.isDraggingSV) return;
        updateSVFromEvent(e);
      }
      function updateSVFromEvent(e) {
        const rect = DOM.cpSVWrap.getBoundingClientRect();
        let x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        cpState.s = (x / rect.width) * 100;
        cpState.v = 100 - (y / rect.height) * 100;
        updateColorPickerUI();
        applyColor();
      }

      function startDragHue(e) {
        cpState.isDraggingHue = true;
        DOM.cpHueWrap.setPointerCapture(e.pointerId);
        updateHueFromEvent(e);
      }
      function dragHue(e) {
        if (!cpState.isDraggingHue) return;
        updateHueFromEvent(e);
      }
      function updateHueFromEvent(e) {
        const rect = DOM.cpHueWrap.getBoundingClientRect();
        let y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        cpState.h = (y / rect.height) * 360;
        updateColorPickerUI();
        applyColor();
      }
      function endDrag(e) {
        cpState.isDraggingSV = false;
        cpState.isDraggingHue = false;
        e.target.releasePointerCapture(e.pointerId);
      }
      function showToast(msg) {
        DOM.toastMsg.innerText = msg;
        DOM.toastMsg.classList.add("show");
        clearTimeout(window.toastTimer);
        window.toastTimer = setTimeout(() => {
          DOM.toastMsg.classList.remove("show");
        }, 1000);
      }

      function initRotationKnob() {
        const knob = DOM.rotControl;
        let isKnobRotating = false,
          knobStartAngle = 0,
          viewStartRot = 0;
        const getKnobAngle = (clientX, clientY) => {
          const rect = knob.getBoundingClientRect();
          return (
            (Math.atan2(
              clientY - (rect.top + rect.height / 2),
              clientX - (rect.left + rect.width / 2),
            ) *
              180) /
            Math.PI
          );
        };
        knob.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          isKnobRotating = true;
          knob.setPointerCapture(e.pointerId);
          knobStartAngle = getKnobAngle(e.clientX, e.clientY);
          viewStartRot = state.viewRotation;
        });
        knob.addEventListener("pointermove", (e) => {
          if (!isKnobRotating) return;
          e.preventDefault();
          e.stopPropagation();
          let delta = getKnobAngle(e.clientX, e.clientY) - knobStartAngle;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          state.viewRotation = viewStartRot + delta;
          if (state.snapToMidline) snapRotation();
          DOM.rotationSlider.value = state.viewRotation;
          render();
        });
        const endKnob = (e) => {
          if (isKnobRotating) {
            isKnobRotating = false;
            knob.releasePointerCapture(e.pointerId);
          }
        };
        knob.addEventListener("pointerup", endKnob);
        knob.addEventListener("pointercancel", endKnob);
      }

      function initShortcutPanel() {
        const isTouch =
          "ontouchstart" in window || navigator.maxTouchPoints > 0;
        const pcShortcuts = `<span><strong>空格</strong> 拖拽 | <strong>R</strong> 旋转 | <strong>V</strong> 选择 | <strong>B</strong> 画笔 | <strong>E</strong> 橡皮擦</span><span><strong>滚轮</strong> 缩放 | <strong>←/→</strong> 逐格旋转</span><span><strong>Ctrl+Z</strong> 撤销 | <strong>Ctrl+Y</strong> 重做</span>`;
        const touchShortcuts = `<span><strong>单指/Pencil</strong> 绘画</span><span><strong>双指按住</strong> 平移/缩放</span><span><strong>旋钮</strong> 旋转画布</span><span><strong>双指点击</strong> 撤销 | <strong>三指点击</strong> 重做</span><span style="color:#aaa; font-size:11px; display:block; width:100%; margin-top:4px;">* 关闭手指绘画时，单指快速下滑/上滑可切帧</span>`;
        DOM.shortcutContent.innerHTML = isTouch ? touchShortcuts : pcShortcuts;
        DOM.shortcutTitle.innerText = isTouch
          ? "手势指南 / Gestures"
          : "快捷键 / Shortcuts";
        DOM.shortcutToggleBtn.onclick = () => {
          DOM.shortcutPanel.classList.toggle("expanded");
          DOM.shortcutToggleBtn.innerText =
            DOM.shortcutPanel.classList.contains("expanded") ? "▲" : "▼";
        };
        DOM.shortcutPanel.addEventListener("pointerdown", (e) =>
          e.stopPropagation(),
        );
        DOM.shortcutPanel.addEventListener("touchstart", (e) =>
          e.stopPropagation(),
        );
      }

      function render(targetCtx, targetW, targetH, isExporting = false) {
        let ctx, width, height, exporting;
        if (targetCtx && targetCtx.canvas) {
          ctx = targetCtx;
          width = targetW;
          height = targetH;
          exporting = isExporting;
        } else {
          ctx = DOM.ctx;
          width = DOM.mainCanvas.width;
          height = DOM.mainCanvas.height;
          if (typeof targetCtx === "boolean") exporting = targetCtx;
          else exporting = false;
        }
        if (!width || !height) return;

        ctx.save();
        ctx.clearRect(0, 0, width, height);
        const renderDpr = exporting ? 1 : state.dpr;
        ctx.scale(renderDpr, renderDpr);
        ctx.save();

        if (exporting) {
          const size = width;
          const scale = size / CONFIG.baseSize;
          ctx.translate(size / 2, size / 2);
          ctx.scale(scale, scale);
          ctx.rotate(((state.viewRotation - 90) * Math.PI) / 180);
          // ctx.rotate((state.animRotation * Math.PI) / 180); // <--- 已移除：导出时的全局旋转
          ctx.translate(-CONFIG.baseSize / 2, -CONFIG.baseSize / 2);
        } else {
          setupTransform(ctx); // 这里面我们刚才已经去掉了 animRotation
        }

        const radius = CONFIG.baseSize / 2 - 2;
        ctx.beginPath();
        ctx.arc(
          CONFIG.baseSize / 2,
          CONFIG.baseSize / 2,
          radius,
          0,
          Math.PI * 2,
        );

        const isTransparent = exporting && DOM.transparentBgToggle.checked;
        if (!isTransparent) {
          ctx.fillStyle = state.backgroundColor;
          ctx.fill();
        }
        ctx.clip();

        const activeLayer = getActiveLayer();

        // 洋葱皮 (底层)
        if (
          state.onionSkins.enabled &&
          !state.isPlaying &&
          activeLayer &&
          !state.onionOnTop &&
          !exporting
        )
          renderOnionSkins(ctx);

        // --- 修改后的图层渲染循环 START ---
        const cx = CONFIG.baseSize / 2;
        const cy = CONFIG.baseSize / 2;
        const animRad = (state.animRotation * Math.PI) / 180;

        state.layers.forEach((layer) => {
          if (layer.visible) {
            ctx.save();
            // 如果正在播放(或导出)，且图层没有被标记为"不旋转"，则应用旋转
            if ((state.isPlaying || exporting) && !layer.noRotate) {
              ctx.translate(cx, cy);
              ctx.rotate(animRad);
              ctx.translate(-cx, -cy);
            }
            renderLayer(ctx, layer, exporting);
            ctx.restore();
          }
        });
        // --- 修改后的图层渲染循环 END ---

        // === SELECTION SYSTEM START ===
        if (state.selection.status === "transforming" && !exporting) {
          // 选区变换框应该跟随当前选中图层的旋转状态吗？
          // 既然处于变换模式，通常动画是暂停的，animRotation=0，所以这里直接画没问题
          renderTransformedSelection(ctx);
        }
        // === SELECTION SYSTEM END ===

        // 正在绘制的笔刷路径 (跟随当前激活图层的设定)
        if (state.isDrawing && state.currentBrushPath.length > 0) {
          ctx.save();
          if (
            (state.isPlaying || exporting) &&
            activeLayer &&
            !activeLayer.noRotate
          ) {
            ctx.translate(cx, cy);
            ctx.rotate(animRad);
            ctx.translate(-cx, -cy);
          }
          renderLayer(
            ctx,
            { ...activeLayer, paths: [new Path(state.currentBrushPath)] },
            exporting,
          );
          ctx.restore();
        }

        // 洋葱皮 (顶层)
        if (
          state.onionSkins.enabled &&
          !state.isPlaying &&
          activeLayer &&
          state.onionOnTop &&
          !exporting
        )
          renderOnionSkins(ctx);

        ctx.restore();

        // 辅助线/网格 (只在非播放、非导出时显示)
        if (!state.isPlaying && !exporting) {
          ctx.save();
          setupTransform(ctx);
          drawGrid(ctx);
          ctx.restore();
        }

        // === SELECTION SYSTEM START ===
        if (!exporting) {
          ctx.save();
          setupTransform(ctx);
          if (state.selection.status === "selecting") {
            renderLassoPath(ctx);
          }
          if (state.selection.status === "transforming") {
            renderTransformHandles(ctx);
          }
          ctx.restore();
        }
        // === SELECTION SYSTEM END ===

        // 光标
        if (
          state.isCursorInCanvas &&
          !state.isPanning &&
          !state.isRotating &&
          !state.isGesturing &&
          !exporting &&
          state.currentTool !== "select"
        ) {
          const activeLayer = getActiveLayer();
          if (activeLayer) {
            ctx.save();
            ctx.lineWidth = 1;
            ctx.strokeStyle =
              state.currentTool === "eraser"
                ? "rgba(231, 76, 60, 0.9)"
                : "rgba(100,100,100,0.8)";
            if (
              state.currentTool === "eraser" ||
              (state.currentTool === "brush" && activeLayer.mode === "fill")
            ) {
              const sz = 10;
              ctx.beginPath();
              ctx.moveTo(state.cursorScreenX - sz, state.cursorScreenY);
              ctx.lineTo(state.cursorScreenX + sz, state.cursorScreenY);
              ctx.moveTo(state.cursorScreenX, state.cursorScreenY - sz);
              ctx.lineTo(state.cursorScreenX, state.cursorScreenY + sz);
              ctx.stroke();
            } else {
              const r = (activeLayer.strokeWidth / 2) * state.zoom;
              ctx.beginPath();
              ctx.arc(
                state.cursorScreenX,
                state.cursorScreenY,
                r,
                0,
                2 * Math.PI,
              );
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        if (!exporting && DOM.rotControl)
          DOM.rotControl.style.transform = `rotate(${state.viewRotation}deg)`;
        ctx.restore();
      }

      function setupTransform(ctx) {
        ctx.translate(state.panX, state.panY);
        ctx.scale(state.zoom, state.zoom);
        const cx = CONFIG.baseSize / 2,
          cy = CONFIG.baseSize / 2;
        ctx.translate(cx, cy);
        ctx.rotate(((state.viewRotation - 90) * Math.PI) / 180);

        // --- 移除/注释掉这行 ---
        // if (state.isPlaying) ctx.rotate((state.animRotation * Math.PI) / 180);

        ctx.translate(-cx, -cy);
      }

      // === 终极修复版 renderLayer 函数 ===
      function renderLayer(ctx, layer, isExporting = false) {
        ctx.save();

        // 基础样式设置
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineWidth = layer.strokeWidth;

        // 内部绘制函数
        const drawPaths = () => {
          // --- 方案 A: 填充模式 (使用离屏缓冲解决破洞+透明度叠加问题) ---
          if (layer.mode === "fill") {
            // 1. 初始化或调整缓冲区大小
            // 我们挂载在 DOM 对象上以便复用，避免每一帧都创建 Canvas 导致卡顿
            if (!DOM.bufferCanvas) {
              DOM.bufferCanvas = document.createElement("canvas");
              DOM.bufferCtx = DOM.bufferCanvas.getContext("2d");
            }
            if (
              DOM.bufferCanvas.width !== ctx.canvas.width ||
              DOM.bufferCanvas.height !== ctx.canvas.height
            ) {
              DOM.bufferCanvas.width = ctx.canvas.width;
              DOM.bufferCanvas.height = ctx.canvas.height;
            }

            const bCtx = DOM.bufferCtx;

            // 2. 清空缓冲区
            bCtx.setTransform(1, 0, 0, 1, 0, 0);
            bCtx.clearRect(0, 0, bCtx.canvas.width, bCtx.canvas.height);

            // 3. 同步变换矩阵 (关键!)
            // 我们需要让缓冲区拥有和当前主画布一模一样的旋转/缩放/位移
            const transform = ctx.getTransform();
            bCtx.setTransform(transform);

            // 4. 在缓冲区上以 100% 不透明度绘制
            bCtx.fillStyle = layer.color;
            bCtx.globalAlpha = 1; // 强制不透明，解决叠加变深问题

            layer.paths.forEach((path) => {
              // 选区和橡皮擦逻辑
              const isSelected = layer.id === getActiveLayer()?.id && state.selection.selectedPathIds.has(path.id);
              if (
                state.selection.status === "transforming" &&
                isSelected &&
                !isExporting
              )
                return;
              if (
                state.isErasing &&
                state.pathsToErase.has(path.id) &&
                !isExporting
              )
                return;
              if (path.points.length < 1) return;

              // 独立绘制每个形状，解决破洞问题 (Painter's Algorithm)
              bCtx.beginPath();
              bCtx.moveTo(path.points[0].x, path.points[0].y);
              if (path.points.length === 1) {
                bCtx.lineTo(path.points[0].x, path.points[0].y);
              } else {
                for (let i = 1; i < path.points.length; i++) {
                  bCtx.lineTo(path.points[i].x, path.points[i].y);
                }
              }
              bCtx.closePath();
              bCtx.fill();
            });

            // 5. 将缓冲区内容绘制回主画布
            // 需要先重置主画布的变换，因为 drawImage 绘制的是整张图，而图里已经包含了变换
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = layer.opacity; // 在这里应用图层透明度
            ctx.drawImage(DOM.bufferCanvas, 0, 0);
            ctx.restore();
          }

          // --- 方案 B: 描边模式 (使用单路径合并解决节点叠加问题) ---
          else {
            ctx.strokeStyle = layer.color;
            ctx.globalAlpha = layer.opacity;
            ctx.beginPath(); // 开启一个大路径

            layer.paths.forEach((path) => {
              // 选区和橡皮擦逻辑
              const isSelected = layer.id === getActiveLayer()?.id && state.selection.selectedPathIds.has(path.id);
              if (
                state.selection.status === "transforming" &&
                isSelected &&
                !isExporting
              )
                return;
              if (
                state.isErasing &&
                state.pathsToErase.has(path.id) &&
                !isExporting
              )
                return;
              if (path.points.length < 1) return;

              // 只定义线条，不立即绘制
              ctx.moveTo(path.points[0].x, path.points[0].y);
              if (path.points.length === 1) {
                ctx.lineTo(path.points[0].x, path.points[0].y);
              } else {
                for (let i = 1; i < path.points.length; i++) {
                  ctx.lineTo(path.points[i].x, path.points[i].y);
                }
              }
            });
            // 一次性描边，接口处完美融合
            ctx.stroke();
          }
        };

        // 草稿图层与普通图层的渲染分发逻辑
        if (layer.type === "draft") {
          const count = state.sliceCount;
          const step = ((360 / count) * Math.PI) / 180;
          const cx = CONFIG.baseSize / 2;
          const cy = CONFIG.baseSize / 2;

          for (let i = 0; i < count; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(i * step);
            ctx.translate(-cx, -cy);
            drawPaths();
            ctx.restore();
          }
        } else {
          drawPaths();
        }

        ctx.restore();
      }

      // === 修复后的 renderOnionSkins 函数 ===
      // === 修复洋葱皮破洞问题的 renderOnionSkins 函数 ===
      function renderOnionSkins(ctx) {
        const activeLayer = getActiveLayer();
        if (!activeLayer || activeLayer.paths.length === 0) return;
        if (activeLayer.type === "draft") return;

        // 1. 初始化或调整缓冲区 (复用 renderLayer 创建的 buffer)
        if (!DOM.bufferCanvas) {
          DOM.bufferCanvas = document.createElement("canvas");
          DOM.bufferCtx = DOM.bufferCanvas.getContext("2d");
        }
        if (
          DOM.bufferCanvas.width !== ctx.canvas.width ||
          DOM.bufferCanvas.height !== ctx.canvas.height
        ) {
          DOM.bufferCanvas.width = ctx.canvas.width;
          DOM.bufferCanvas.height = ctx.canvas.height;
        }
        const bCtx = DOM.bufferCtx;

        const step = ((360 / state.sliceCount) * Math.PI) / 180;

        const drawVectorOnion = (offsetRotation, color) => {
          // --- 方案 A: 填充模式 (使用离屏缓冲) ---
          if (activeLayer.mode === "fill") {
            // A1. 清空缓冲区
            bCtx.setTransform(1, 0, 0, 1, 0, 0);
            bCtx.clearRect(0, 0, bCtx.canvas.width, bCtx.canvas.height);

            // A2. 同步变换矩阵
            // 我们需要让缓冲区拥有和当前主画布一模一样的 缩放/位移
            bCtx.save();
            const currentTransform = ctx.getTransform();
            bCtx.setTransform(currentTransform);

            // A3. 应用洋葱皮特有的旋转偏移
            bCtx.translate(CONFIG.baseSize / 2, CONFIG.baseSize / 2);
            bCtx.rotate(offsetRotation);
            bCtx.translate(-CONFIG.baseSize / 2, -CONFIG.baseSize / 2);

            // A4. 设置绘制样式 (强制不透明)
            bCtx.fillStyle = color;
            bCtx.globalAlpha = 1;

            // A5. 逐个绘制路径 (解决破洞)
            activeLayer.paths.forEach((path) => {
              // 处理选区变换
              let pointsToDraw = path.points;
              const isSelectedAndTransforming =
                state.selection.status === "transforming" &&
                state.selection.selectedPathIds.has(path.id);

              if (isSelectedAndTransforming) {
                const originalPath = state.selection.originalPaths.get(path.id);
                if (originalPath) {
                  pointsToDraw = originalPath.points.map((p) =>
                    transformPoint(
                      p,
                      state.selection.bbox,
                      state.selection.transform,
                    ),
                  );
                }
              }

              if (pointsToDraw.length < 1) return;

              bCtx.beginPath();
              bCtx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
              for (let i = 1; i < pointsToDraw.length; i++) {
                bCtx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
              }
              bCtx.closePath();
              bCtx.fill();
            });
            bCtx.restore(); // 恢复 buffer 的变换状态

            // A6. 将缓冲区绘制回主画布
            ctx.save();
            // 重置主画布变换，因为 buffer 已经是全屏图像了
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = state.onionSkins.opacity; // 应用洋葱皮透明度
            ctx.drawImage(DOM.bufferCanvas, 0, 0);
            ctx.restore();
          }
          // --- 方案 B: 描边模式 (使用合并路径) ---
          else {
            ctx.save();
            ctx.globalAlpha = state.onionSkins.opacity;

            // 应用洋葱皮旋转
            ctx.translate(CONFIG.baseSize / 2, CONFIG.baseSize / 2);
            ctx.rotate(offsetRotation);
            ctx.translate(-CONFIG.baseSize / 2, -CONFIG.baseSize / 2);

            ctx.strokeStyle = color;
            ctx.lineWidth = activeLayer.strokeWidth;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";

            // 开启大路径，一次性描边 (解决叠加变深，且无破洞问题)
            ctx.beginPath();
            activeLayer.paths.forEach((path) => {
              // 处理选区变换
              let pointsToDraw = path.points;
              const isSelectedAndTransforming =
                state.selection.status === "transforming" &&
                state.selection.selectedPathIds.has(path.id);

              if (isSelectedAndTransforming) {
                const originalPath = state.selection.originalPaths.get(path.id);
                if (originalPath) {
                  pointsToDraw = originalPath.points.map((p) =>
                    transformPoint(
                      p,
                      state.selection.bbox,
                      state.selection.transform,
                    ),
                  );
                }
              }

              if (pointsToDraw.length < 1) return;
              ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
              for (let i = 1; i < pointsToDraw.length; i++) {
                ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
              }
            });
            ctx.stroke();
            ctx.restore();
          }
        };

        if (state.onionSkins.showBefore)
          drawVectorOnion(-step * state.rotDirection, "#ff0000");
        if (state.onionSkins.showAfter)
          drawVectorOnion(step * state.rotDirection, "#0000ff");
      }

      function updateUI() {
        DOM.projectNameInput.value = state.projectName;
        const activeLayer = getActiveLayer();
        const hasLayers = activeLayer !== null;
        DOM.currentLayerInput.disabled = !hasLayers;
        DOM.modeFillBtn.disabled = !hasLayers;
        DOM.modeStrokeBtn.disabled = !hasLayers;
        DOM.toolEraserBtn.disabled = !hasLayers;
        DOM.brushSize.disabled = !hasLayers;
        DOM.layerOpacity.disabled = !hasLayers;
        DOM.delLayerBtn.disabled = state.layers.length <= 1;
        DOM.toolSelectBtn.disabled = !hasLayers;
        if (hasLayers) {
          DOM.currentLayerInput.value = activeLayer.name;
          DOM.layerColorSwatch.style.backgroundColor = activeLayer.color;
          DOM.modeFillBtn.classList.toggle(
            "active",
            state.currentTool === "brush" && activeLayer.mode === "fill",
          );
          DOM.modeStrokeBtn.classList.toggle(
            "active",
            state.currentTool === "brush" && activeLayer.mode === "stroke",
          );
          DOM.toolEraserBtn.classList.toggle(
            "active",
            state.currentTool === "eraser",
          );
          DOM.toolSelectBtn.classList.toggle(
            "active",
            state.currentTool === "select",
          );
          DOM.brushSize.value = activeLayer.strokeWidth;
          DOM.brushSizeVal.textContent = activeLayer.strokeWidth;
          DOM.layerOpacity.value = activeLayer.opacity;
          DOM.layerOpacityVal.textContent = activeLayer.opacity.toFixed(2);
        } else {
          DOM.currentLayerInput.value = "无图层";
        }
        DOM.undoBtn.disabled = undoStack.length <= 1;
        DOM.redoBtn.disabled = redoStack.length === 0;

        DOM.bgColorSwatch.style.backgroundColor = state.backgroundColor;

        DOM.onionLayerBtn.textContent = state.onionOnTop
          ? "洋葱皮 ▲ 置顶"
          : "洋葱皮 ▼ 置底";
        DOM.onionLayerBtn.classList.toggle("active", state.onionOnTop);
        DOM.onionToggle.checked = state.onionSkins.enabled;
        DOM.onionBeforeToggle.checked = state.onionSkins.showBefore;
        DOM.onionAfterToggle.checked = state.onionSkins.showAfter;
        document
          .querySelector('label[for="onionBeforeToggle"]')
          .classList.toggle(
            "active",
            state.onionSkins.showBefore && state.onionSkins.enabled,
          );
        document
          .querySelector('label[for="onionAfterToggle"]')
          .classList.toggle(
            "active",
            state.onionSkins.showAfter && state.onionSkins.enabled,
          );
        DOM.onionOpacityVal.textContent = state.onionSkins.opacity.toFixed(2);
        DOM.onionOpacity.value = state.onionSkins.opacity;

        DOM.sliceCountRange.value = state.sliceCount;
        DOM.sliceValDisplay.textContent = state.sliceCount;
        DOM.touchDrawToggleBtn.textContent = state.allowTouchDraw
          ? "🤚 手指绘画: 开"
          : "🚫 手指绘画: 关";
        DOM.touchDrawToggleBtn.classList.toggle("active", state.allowTouchDraw);
        if (!state.allowTouchDraw)
          DOM.touchDrawToggleBtn.style.background = "";
        else DOM.touchDrawToggleBtn.style.background = "";

        // === SELECTION SYSTEM START ===
        updateSelectionUI();
        // === SELECTION SYSTEM END ===

        renderLayerList();
      }

      function renderLayerList() {
        DOM.layerList.innerHTML = "";
        state.layers.forEach((layer, i) => {
          const div = document.createElement("div");
          div.className = `layer-item ${
            layer.id === getActiveLayer()?.id ? "active" : ""
          }`;
          div.dataset.layerId = layer.id;
          div.draggable = true;
          div.tabIndex = 0;
          div.setAttribute("role", "group");
          div.setAttribute("aria-label", layer.name + (layer.id === getActiveLayer()?.id ? "，当前图层" : ""));
          div.onkeydown = e => { if (e.target === div && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setActiveLayer(i); } };

          // 1. 可见性按钮 (原代码)
          const vis = document.createElement("button");
          vis.className = "layer-vis";
          vis.textContent = layer.visible ? "◉" : "○";
          vis.setAttribute("aria-label", layer.visible ? "隐藏图层" : "显示图层");
          vis.setAttribute("aria-pressed", String(layer.visible));
          vis.title = "切换可见性";
          vis.onclick = (e) => {
            e.stopPropagation();
            toggleLayerVisibility(layer.id);
          };

          // --- 2. 新增：不旋转(图钉)按钮 START ---
          const pin = document.createElement("button");
          pin.className = `layer-pin ${layer.noRotate ? "active" : ""}`;
          pin.textContent = layer.noRotate ? "▪" : "↻";
          pin.setAttribute("aria-label", layer.noRotate ? "固定图层，点击跟随旋转" : "跟随旋转，点击固定图层");
          pin.setAttribute("aria-pressed", String(layer.noRotate));
          pin.title = layer.noRotate ? "该图层不跟随旋转" : "该图层跟随旋转";
          pin.onclick = (e) => {
            e.stopPropagation();
            toggleLayerNoRotate(layer.id);
          };
          // --- 新增 END ---

          const nameBox = document.createElement("span");
          nameBox.className = "layer-name";
          nameBox.innerText =
            layer.name + (layer.type === "draft" ? " (草稿)" : "");

          const colorIndicator = document.createElement("div");
          colorIndicator.style.cssText = `width:12px; height:12px; background-color:${layer.color}; border-radius:3px; border:1px solid #222; flex-shrink:0; opacity:${layer.opacity};`;

          // ... 移动按钮逻辑 ...
          const upBtn = document.createElement("button");
          // ... (原代码不变)
          upBtn.className = "layer-move-btn";
          upBtn.innerHTML = "↑";
          upBtn.title = "上移图层";
          upBtn.disabled = i === state.layers.length - 1;
          upBtn.onclick = (e) => {
            e.stopPropagation();
            moveLayer(i, 1);
          };

          const downBtn = document.createElement("button");
          downBtn.className = "layer-move-btn";
          downBtn.innerHTML = "↓";
          downBtn.title = "下移图层";
          downBtn.disabled = i === 0;
          downBtn.onclick = (e) => {
            e.stopPropagation();
            moveLayer(i, -1);
          };

          // 注意：这里把 pin 加进去了
          div.append(vis, pin, colorIndicator, nameBox, upBtn, downBtn);

          div.onclick = () =>
            setActiveLayer(state.layers.findIndex((l) => l.id === layer.id));
          // ... 拖拽事件 ...
          div.addEventListener("dragstart", handleDragStart);
          div.addEventListener("dragover", handleDragOver);
          div.addEventListener("dragleave", (e) =>
            e.currentTarget.classList.remove("drag-over"),
          );
          div.addEventListener("drop", handleDrop);
          div.addEventListener("dragend", handleDragEnd);

          DOM.layerList.prepend(div);
        });
      }

      function toggleLayerNoRotate(layerId) {
        const layer = state.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.noRotate = !layer.noRotate;
          saveHistory();
          renderLayerList(); // 刷新列表以更新图标状态
          render(); // 刷新画布
        }
      }

      function getActiveLayer() {
        return state.layers[state.activeLayerIndex] || null;
      }
      function addLayer(name, color, type = "normal") {
        cancelSelection();
        const newLayer = new Layer(
          Date.now() + Math.random(),
          name ||
            (type === "draft"
              ? `草稿 ${state.layers.length + 1}`
              : `图层 ${state.layers.length + 1}`),
          color,
          type,
        );
        state.layers.push(newLayer);
        setActiveLayer(state.layers.length - 1);
        saveHistory();
      }
      function moveLayer(index, direction) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= state.layers.length) return;
        const temp = state.layers[index];
        state.layers[index] = state.layers[newIndex];
        state.layers[newIndex] = temp;
        if (state.activeLayerIndex === index) state.activeLayerIndex = newIndex;
        else if (state.activeLayerIndex === newIndex)
          state.activeLayerIndex = index;
        saveHistory();
        renderLayerList();
        render();
      }
      function deleteLayer() {
        if (state.layers.length <= 1) return;
        const layer = getActiveLayer();
        if (confirm(`确定要删除图层 "${layer.name}" 吗？`)) {
          cancelSelection();
          state.layers.splice(state.activeLayerIndex, 1);
          setActiveLayer(Math.max(0, state.activeLayerIndex - 1));
          saveHistory();
        }
      }
      function clearLayer() {
        const layer = getActiveLayer();
        if (layer && confirm(`确定要清空图层 "${layer.name}" 吗?`)) {
          cancelSelection();
          layer.paths = [];
          saveHistory();
          render();
        }
      }
      function duplicateLayer() {
        confirmSelection();
        const activeLayer = getActiveLayer();
        if (!activeLayer) return;
        const newLayer = JSON.parse(JSON.stringify(activeLayer));
        newLayer.id = Date.now() + Math.random();
        newLayer.name = `${activeLayer.name} (副本)`;
        state.layers.splice(state.activeLayerIndex + 1, 0, newLayer);
        setActiveLayer(state.activeLayerIndex + 1);
        saveHistory();
      }
      function setActiveLayer(index) {
        cancelSelection();
        state.activeLayerIndex = index;
        updateUI();
        render();
      }
      function toggleLayerVisibility(layerId) {
        const layer = state.layers.find((l) => l.id === layerId);
        if (layer) {
          layer.visible = !layer.visible;
          saveHistory();
          updateUI();
          render();
        }
      }
      function changeActiveLayerProperty(prop, value) {
        const layer = getActiveLayer();
        if (layer && layer[prop] !== value) {
          layer[prop] = value;
          saveHistory();
          updateUI();
          render();
        }
      }
      function simplifyPath(points, threshold) {
        if (points.length < 3) return points;
        const newPoints = [points[0]];
        let lastPoint = points[0];
        for (let i = 1; i < points.length - 1; i++) {
          const dist = Math.hypot(
            points[i].x - lastPoint.x,
            points[i].y - lastPoint.y,
          );
          if (dist > threshold) {
            newPoints.push(points[i]);
            lastPoint = points[i];
          }
        }
        newPoints.push(points[points.length - 1]);
        if (newPoints.length === 1 && points.length > 1)
          newPoints.push(points[1]);
        return newPoints;
      }

      function findClosestPath(pos) {
        const layer = getActiveLayer();
        if (!layer) return null;

        let closestPath = null,
          minDistance = Infinity;
        const isDraft = layer.type === "draft";
        const cx = CONFIG.baseSize / 2;
        const cy = CONFIG.baseSize / 2;
        const stepRad = ((360 / state.sliceCount) * Math.PI) / 180;

        for (const path of layer.paths) {
          if (state.pathsToErase.has(path.id)) continue;

          for (const point of path.points) {
            let dist;
            if (isDraft) {
              const pAngle = Math.atan2(point.y - cy, point.x - cx);
              const mAngle = Math.atan2(pos.y - cy, pos.x - cx);
              let angleDiff = mAngle - pAngle;
              while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
              while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
              const stepsOff = Math.round(angleDiff / stepRad);
              const angleCorrection = stepsOff * stepRad;
              const cosA = Math.cos(angleCorrection);
              const sinA = Math.sin(angleCorrection);
              const px = point.x - cx;
              const py = point.y - cy;
              const rotPx = px * cosA - py * sinA + cx;
              const rotPy = px * sinA + py * cosA + cy;
              dist = Math.hypot(pos.x - rotPx, pos.y - rotPy);
            } else {
              dist = Math.hypot(pos.x - point.x, pos.y - point.y);
            }

            if (dist < minDistance) {
              minDistance = dist;
              closestPath = path;
            }
          }
        }
        return minDistance < (layer.strokeWidth / 2 + 5) / state.zoom
          ? closestPath
          : null;
      }

      // Persist only project data; gestures, selection and playback are transient.
      function projectData() {
        const keys = ["projectName", "layers", "activeLayerIndex", "sliceCount", "fps",
          "rotDirection", "playbackMode", "backgroundColor", "onionSkins", "onionOnTop", "snapToMidline",
          "zoom", "panX", "panY", "viewRotation"];
        return Object.fromEntries(keys.map(key => [key, state[key]]));
      }
      function contentSnapshot() {
        const data = projectData();
        delete data.activeLayerIndex;
        delete data.zoom;
        delete data.panX;
        delete data.panY;
        delete data.viewRotation;
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
      function handleDragStart(e) {
        cancelSelection();
        e.currentTarget.classList.add("dragging");
        state.draggedLayerId = parseFloat(e.currentTarget.dataset.layerId);
        e.dataTransfer.effectAllowed = "move";
      }
      function handleDragOver(e) {
        e.preventDefault();
        const target = e.currentTarget;
        if (parseFloat(target.dataset.layerId) !== state.draggedLayerId) {
          target.classList.add("drag-over");
        }
      }
      function handleDrop(e) {
        e.preventDefault();
        const target = e.currentTarget;
        target.classList.remove("drag-over");
        const activeId = getActiveLayer()?.id;
        const droppedOnId = parseFloat(target.dataset.layerId);
        const draggedIndex = state.layers.findIndex(
          (l) => l.id === state.draggedLayerId,
        );
        const targetIndex = state.layers.findIndex((l) => l.id === droppedOnId);
        if (draggedIndex === -1 || targetIndex === -1) return;
        const [draggedLayer] = state.layers.splice(draggedIndex, 1);
        state.layers.splice(targetIndex, 0, draggedLayer);
        state.activeLayerIndex = activeId
          ? state.layers.findIndex((l) => l.id === activeId)
          : 0;
        saveHistory();
        renderLayerList();
      }
      function handleDragEnd(e) {
        e.currentTarget.classList.remove("dragging");
        document
          .querySelectorAll(".layer-item")
          .forEach((el) => el.classList.remove("drag-over"));
      }
      function resetInteractionState() {
        if (!state.isPanning) {
          state.isRotating = false;
          state.isDrawing = false;
          state.isErasing = false;
          state.drag.isActive = false;
          state.currentBrushPath = [];
          state.pathsToErase.clear();
          DOM.viewport.classList.remove("rotating");
        }
      }

      function dataURLtoBlob(dataurl) {
        const arr = dataurl.split(","),
          mime = arr[0].match(/:(.*?);/)[1],
          bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
      }
      function triggerDownload(blob, filename) {
        const a = document.createElement("a");
        const url = URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 0);
      }
      function loadProjectData(jsonString, filename) {
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
          if (imported.zoom === undefined) centerView();
          else { DOM.rotationSlider.value = state.viewRotation; render(); }
          saveHistory();
          savedLabel = "已载入项目";
          setUnsaved(false);
          updateUI();
          showToast("项目已打开");
          return true;
        } catch (err) {
          alert("无法打开项目，当前画布未更改。\n" + err.message);
          return false;
        }
      }

      function rotateView(direction) {
        state.viewRotation += direction * (360 / state.sliceCount);
        state.viewRotation = ((state.viewRotation % 360) + 360) % 360;
        if (state.snapToMidline) snapRotation();
        DOM.rotationSlider.value = state.viewRotation;
        render();
      }

      function bindEvents() {
        // === SELECTION SYSTEM START ===
        DOM.selectionActions.addEventListener("pointerdown", (e) =>
          e.stopPropagation()
        );
        // === SELECTION SYSTEM END ===

        DOM.viewport.addEventListener("pointerdown", (e) => {
          if (e.target !== DOM.mainCanvas && e.target !== DOM.viewport) return;
          if (e.button === 2) return;
          if (e.pointerType === "touch" && !state.allowTouchDraw && state.currentTool === "brush") return;
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
          if (document.activeElement instanceof HTMLInputElement)
            document.activeElement.blur();
          if (state.isGesturing) return;
          if (e.pointerType === "touch" && !e.isPrimary) return;

          // === 1. 获取当前图层是否不旋转 ===
          const activeLayer = getActiveLayer();
          const ignoreAnim = activeLayer ? activeLayer.noRotate : false;
          // ==============================

          // === SELECTION SYSTEM START ===
          if (state.currentTool === "select") {
            handleSelectionPointerDown(e);
            return;
          }
          // === SELECTION SYSTEM END ===

          if (e.pointerType === "pen") {
            window.lastPencilTime = Date.now();
            e.preventDefault();
            DOM.viewport.setPointerCapture(e.pointerId);
            state.isCursorInCanvas = true;
            if (state.currentTool === "eraser") {
              state.isErasing = true;
              // 传入 ignoreAnim
              const pos = getScreenToWorldPos(e.clientX, e.clientY, ignoreAnim);
              const pathToErase = findClosestPath(pos);
              if (pathToErase) state.pathsToErase.add(pathToErase.id);
            } else {
              state.isDrawing = true;
              const rect = DOM.viewport.getBoundingClientRect();
              state.cursorScreenX = e.clientX - rect.left;
              state.cursorScreenY = e.clientY - rect.top;

              state.currentBrushPath = [
                // 传入 ignoreAnim
                getScreenToWorldPos(e.clientX, e.clientY, ignoreAnim),
              ];
            }
            return;
          }
          e.preventDefault();
          DOM.viewport.setPointerCapture(e.pointerId);
          state.isCursorInCanvas = true;
          if (e.button === 1 || state.isPanning) {
            startDrag(e);
            return;
          }
          if (state.isRotating) {
            state.dragStartAngle = getMouseAngle(e.clientX, e.clientY);
            state.dragStartViewRot = state.viewRotation;
            return;
          }
          
          // 传入 ignoreAnim
          const pos = getScreenToWorldPos(e.clientX, e.clientY, ignoreAnim);
          
          if (state.currentTool === "eraser") {
            state.isErasing = true;
            const pathToErase = findClosestPath(pos);
            if (pathToErase) state.pathsToErase.add(pathToErase.id);
          } else if (state.currentTool === "brush") {
            if (!e.pointerType.includes("touch") || state.allowTouchDraw) {
              state.isDrawing = true;
              state.currentBrushPath = [pos];
            }
          }
        });

        DOM.viewport.addEventListener("pointermove", (e) => {
          if (state.isGesturing) return;
          if (e.pointerType === "touch" && !e.isPrimary) return;
          if (e.pointerType === "pen") window.lastPencilTime = Date.now();
          e.preventDefault();
          state.cursorScreenX =
            e.clientX - DOM.viewport.getBoundingClientRect().left;
          state.cursorScreenY =
            e.clientY - DOM.viewport.getBoundingClientRect().top;
          
          // === 1. 获取当前图层是否不旋转 ===
          const activeLayer = getActiveLayer();
          const ignoreAnim = activeLayer ? activeLayer.noRotate : false;
          // 传入 ignoreAnim
          const worldPos = getScreenToWorldPos(e.clientX, e.clientY, ignoreAnim);
          // ==============================
          
          state.cursorWorldX = worldPos.x;
          state.cursorWorldY = worldPos.y;

          if (state.drag.isActive) { doDrag(e); return; }
          if (state.isRotating && (e.buttons & 1)) {
            state.viewRotation = state.dragStartViewRot + getMouseAngle(e.clientX, e.clientY) - state.dragStartAngle;
            if (state.snapToMidline) snapRotation();
            render();
            return;
          }
          // === SELECTION SYSTEM START ===
          if (state.currentTool === "select") {
            handleSelectionPointerMove(e);
            render();
            return;
          }
          // === SELECTION SYSTEM END ===

          if (state.drag.isActive) {
            doDrag(e);
            return;
          }
          if (state.isRotating && e.buttons & 1) {
            state.viewRotation =
              state.dragStartViewRot +
              (getMouseAngle(e.clientX, e.clientY) - state.dragStartAngle);
            if (state.snapToMidline) snapRotation();
            DOM.rotationSlider.value = state.viewRotation;
            render();
            return;
          }
          if (state.isDrawing) {
            const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
            const events = coalesced.length ? coalesced : [e];
            events.forEach((ev) => {
              // 传入 ignoreAnim
              state.currentBrushPath.push(
                getScreenToWorldPos(ev.clientX, ev.clientY, ignoreAnim)
              );
            });
          }
          if (state.isErasing) {
            const coalesced = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
            const events = coalesced.length ? coalesced : [e];
            events.forEach((ev) => {
              // 传入 ignoreAnim
              const coPos = getScreenToWorldPos(ev.clientX, ev.clientY, ignoreAnim);
              const pathToErase = findClosestPath(coPos);
              if (pathToErase) state.pathsToErase.add(pathToErase.id);
            });
          }
          render();
        });

        DOM.viewport.addEventListener("pointerup", (e) => {
          if (e.pointerType === "touch" && !e.isPrimary) return;
          if (DOM.viewport.hasPointerCapture(e.pointerId)) DOM.viewport.releasePointerCapture(e.pointerId);

          // === SELECTION SYSTEM START ===
          if (state.drag.isActive) { state.drag.isActive = false; return; }
          if (state.currentTool === "select") {
            handleSelectionPointerUp(e);
            return;
          }
          // === SELECTION SYSTEM END ===

          if (state.isDrawing) {
            const layer = getActiveLayer();
            if (layer && state.currentBrushPath.length > 0) {
              const simplified = simplifyPath(
                state.currentBrushPath,
                CONFIG.pathSimplificationThreshold / state.zoom
              );
              layer.paths.push(new Path(simplified));
              saveHistory();
            }
          }
          if (state.isErasing) {
            const layer = getActiveLayer();
            if (layer && state.pathsToErase.size > 0) {
              layer.paths = layer.paths.filter(
                (p) => !state.pathsToErase.has(p.id)
              );
              saveHistory();
            }
          }
          state.isDrawing = false;
          state.isErasing = false;
          state.drag.isActive = false;
          state.currentBrushPath = [];
          state.pathsToErase.clear();
          render();
        });

        DOM.viewport.addEventListener("pointerleave", () => {
          state.isCursorInCanvas = false;
          state.isDrawing = false;
          state.isErasing = false;
          state.drag.isActive = false;
          state.currentBrushPath = [];
          state.pathsToErase.clear();
          render();
        });
        DOM.viewport.addEventListener("pointerenter", () => {
          state.isCursorInCanvas = true;
        });

        let startTouches = [],
          startPan = { x: 0, y: 0 },
          startZoom = 1,
          startRot = 0,
          startDist = 0,
          startAngle = 0,
          startCenter = { x: 0, y: 0 },
          isRotationLocked = false,
          touchStartTime = 0,
          maxTouches = 0,
          touchTotalMovement = 0,
          singleSwipeStartY = 0;
        const ROTATION_THRESHOLD = 15;

        DOM.viewport.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches.length >= 2) {
              state.isGesturing = true;
              state.isDrawing = false;
              state.isErasing = false;
              state.currentBrushPath = [];
            }
            maxTouches = Math.max(maxTouches, e.touches.length);
            if (e.touches.length === 1) {
              touchStartTime = Date.now();
              touchTotalMovement = 0;
              singleSwipeStartY = e.touches[0].clientY;
            }
            if (e.touches.length === 2) {
              startPan = { x: state.panX, y: state.panY };
              startZoom = state.zoom;
              startRot = state.viewRotation;
              isRotationLocked = false;
              touchTotalMovement = 0;
              const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY },
                p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
              startDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              startAngle =
                (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
              startCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            }
          },
          { passive: false }
        );

        DOM.viewport.addEventListener(
          "touchmove",
          (e) => {
            if (e.touches.length > 0) {
              const touch = e.touches[0];
              if (window.lastTouchX) {
                touchTotalMovement += Math.hypot(
                  touch.clientX - window.lastTouchX,
                  touch.clientY - window.lastTouchY
                );
              }
              window.lastTouchX = touch.clientX;
              window.lastTouchY = touch.clientY;
            }
            if (e.touches.length === 2) {
              e.preventDefault();
              const p1 = { x: e.touches[0].clientX, y: e.touches[0].clientY },
                p2 = { x: e.touches[1].clientX, y: e.touches[1].clientY };
              const currCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
                currDist = Math.hypot(p2.x - p1.x, p2.y - p1.y),
                currAngle =
                  (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI,
                angleDiff = currAngle - startAngle;
              if (
                !isRotationLocked &&
                Math.abs(angleDiff) > ROTATION_THRESHOLD
              ) {
                isRotationLocked = true;
              }
              if (isRotationLocked) {
                state.viewRotation = startRot + angleDiff;
              } else {
                const scaleFactor = currDist / (startDist || 1),
                  newZoom = Math.max(
                    0.1,
                    Math.min(10, startZoom * scaleFactor)
                  );
                const rect = DOM.viewport.getBoundingClientRect(),
                  viewStartX = startCenter.x - rect.left,
                  viewStartY = startCenter.y - rect.top;
                const worldOffsetX = viewStartX - startPan.x,
                  worldOffsetY = viewStartY - startPan.y;
                state.panX =
                  viewStartX +
                  (currCenter.x - startCenter.x) -
                  worldOffsetX * (newZoom / startZoom);
                state.panY =
                  viewStartY +
                  (currCenter.y - startCenter.y) -
                  worldOffsetY * (newZoom / startZoom);
                state.zoom = newZoom;
              }
              if (state.snapToMidline) snapRotation();
              DOM.rotationSlider.value = state.viewRotation;
              render();
            }
          },
          { passive: false }
        );

        DOM.viewport.addEventListener("touchend", (e) => {
          if (e.touches.length === 0) {
            state.isGesturing = false;
            window.lastTouchX = null;
            window.lastTouchY = null;
            const duration = Date.now() - touchStartTime;
            const moveLimit = maxTouches === 3 ? 150 : 100,
              timeLimit = maxTouches === 3 ? 800 : 600;
            if (duration < timeLimit && touchTotalMovement < moveLimit) {
              if (maxTouches === 2) undo();
              else if (maxTouches === 3) redo();
            }
            const isPencilActive =
              Date.now() - (window.lastPencilTime || 0) < 500;
            if (
              maxTouches === 1 &&
              !state.allowTouchDraw &&
              !isPencilActive &&
              duration < 250 &&
              touchTotalMovement > 30
            ) {
              const endY = e.changedTouches[0].clientY;
              if (Math.abs(endY - singleSwipeStartY) > 30)
                rotateView(endY - singleSwipeStartY > 0 ? -1 : 1);
            }
            maxTouches = 0;
          }
        });

        function startDrag(e) {
          state.drag.isActive = true;
          state.drag.startX = e.clientX;
          state.drag.startY = e.clientY;
          state.drag.startPanX = state.panX;
          state.drag.startPanY = state.panY;
        }
        function doDrag(e) {
          if (!state.drag.isActive) return;
          state.panX = state.drag.startPanX + (e.clientX - state.drag.startX);
          state.panY = state.drag.startPanY + (e.clientY - state.drag.startY);
          render();
        }
        DOM.viewport.addEventListener(
          "wheel",
          (e) => {
            e.preventDefault();
            if (e.shiftKey) {
              rotateView(e.deltaY > 0 ? -0.2 : 0.2);
            } else {
              const rect = DOM.mainCanvas.getBoundingClientRect(),
                mx = e.clientX - rect.left,
                my = e.clientY - rect.top,
                zoomFactor = 1.1;
              let newZoom =
                state.zoom * (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor);
              newZoom = Math.max(0.1, Math.min(newZoom, 10));
              const offsetX = mx - state.panX,
                offsetY = my - state.panY;
              state.panX = mx - offsetX * (newZoom / state.zoom);
              state.panY = my - offsetY * (newZoom / state.zoom);
              state.zoom = newZoom;
            }
            render();
          },
          { passive: false }
        );

        window.addEventListener("keydown", (e) => {
          if (e.target.closest("input, select, textarea, [contenteditable=true]")) return;
          if (e.target.closest("button, summary") && (e.key === " " || e.key === "Enter")) return;
          if ([...document.querySelectorAll(".modal-overlay")].some(el => el.style.display !== "none")) return;

          // --- 修复后的快捷键逻辑 ---
          if (state.selection.status === "transforming") {
            // 在变换模式下，只处理我们关心的特定按键
            if (e.key === "Enter") {
              e.preventDefault();
              confirmSelection();
              return; // 处理完就退出
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancelSelection();
              return; // 处理完就退出
            }
            // 对于其他按键（包括方向键），我们什么都不做，让事件继续传递
          }

          if (e.ctrlKey || e.metaKey) {
            if (e.key.toLowerCase() === "z" && e.shiftKey) {
              e.preventDefault();
              redo();
            } else if (e.key.toLowerCase() === "z") {
              e.preventDefault();
              undo();
            }
            if (e.key.toLowerCase() === "y") {
              e.preventDefault();
              redo();
            }
            if (e.key === "0") {
              e.preventDefault();
              centerView();
            }
            return;
          }

          // 全局快捷键现在可以正常工作了
          if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
            e.preventDefault();
            rotateView(e.code === "ArrowLeft" ? 1 : -1);
          }

          if (e.key === "[" || e.key === "]") {
            const layer = getActiveLayer();
            if (layer) {
              const change = e.key === "[" ? -1 : 1;
              const newWidth = Math.max(
                1,
                Math.min(100, parseInt(layer.strokeWidth) + change)
              );
              changeActiveLayerProperty("strokeWidth", newWidth);
            }
          }
          if (e.code === "Space" && !e.repeat) {
            e.preventDefault();
            state.isPanning = true;
            DOM.viewport.classList.add("panning");
            state.isRotating = false;
            DOM.viewport.classList.remove("rotating");
          }
          if (e.code === "KeyR" && !e.repeat) {
            if (!state.isPanning) {
              state.isRotating = true;
              DOM.viewport.classList.add("rotating");
            }
          }
          if (e.code === "KeyV") {
            if (!state.isPanning) {
              state.currentTool = "select";
              DOM.viewport.classList.remove("erasing");
              resetInteractionState();
              updateUI();
              render();
              DOM.viewport.style.cursor = "crosshair";
            }
          }
          if (e.code === "KeyB") {
            if (!state.isPanning) {
              cancelSelection();
              state.currentTool = "brush";
              DOM.viewport.classList.remove("erasing");
              updateUI();
              render();
            }
          }
          if (e.code === "KeyE") {
            if (!state.isPanning) {
              cancelSelection();
              state.currentTool = "eraser";
              DOM.viewport.classList.add("erasing");
              updateUI();
              render();
            }
          }
        });
        window.addEventListener("keyup", (e) => {
          if (e.code === "Space") {
            state.isPanning = false;
            DOM.viewport.classList.remove("panning");
            resetInteractionState();
            render();
          }
          if (e.code === "KeyR") {
            if (!state.isPanning) {
              state.isRotating = false;
              DOM.viewport.classList.remove("rotating");
              if (state.snapToMidline) {
                snapRotation();
                render();
              }
            }
          }
        });
        window.addEventListener("blur", () => {
          state.isPanning = false;
          DOM.viewport.classList.remove("panning", "rotating");
          resetInteractionState();
        });
        window.addEventListener("beforeunload", (e) => {
          if (state.hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = "";
          }
        });

        DOM.projectNameInput.oninput = (e) => {
          state.projectName = e.target.value.trim() || "未命名项目";
          setUnsaved(true);
        };
        DOM.projectNameInput.onchange = () => saveHistory();
        DOM.currentLayerInput.oninput = (e) => {
          const layer = getActiveLayer();
          if (layer) {
            layer.name = e.target.value;
            setUnsaved(true);
            renderLayerList();
          }
        };
        DOM.currentLayerInput.onchange = (e) => {
          saveHistory();
        };

        DOM.addLayerBtn.onclick = () => addLayer();
        DOM.addDraftLayerBtn.onclick = () => addLayer(null, null, "draft");
        DOM.delLayerBtn.onclick = deleteLayer;
        DOM.copyLayerBtn.onclick = duplicateLayer;
        DOM.clearLayerBtn.onclick = clearLayer;
        DOM.undoBtn.onclick = undo;
        DOM.redoBtn.onclick = redo;
        DOM.resetViewBtn.onclick = centerView;

        DOM.brushSize.oninput = (e) => {
          const layer = getActiveLayer();
          if (layer) {
            layer.strokeWidth = Number(e.target.value);
            updateUI();
            render();
          }
        };
        DOM.brushSize.onchange = () => saveHistory();
        DOM.layerOpacity.oninput = (e) => {
          const layer = getActiveLayer();
          if (layer) {
            layer.opacity = parseFloat(e.target.value);
            updateUI();
            render();
          }
        };
        DOM.layerOpacity.onchange = () => saveHistory();
        DOM.layerColorTrigger.onclick = function () {
          const layer = getActiveLayer();
          if (layer)
            openColorPicker(
              layer.color,
              (hex) => {
                changeActiveLayerProperty("color", hex);
                DOM.layerColorSwatch.style.backgroundColor = hex;
              },
              this
            );
        };
        DOM.backgroundColorTrigger.onclick = function () {
          openColorPicker(
            state.backgroundColor,
            (hex) => {
              state.backgroundColor = hex;
              DOM.bgColorSwatch.style.backgroundColor = hex;
              saveHistory();
              render();
            },
            this
          );
        };
        DOM.modeFillBtn.onclick = () => {
          cancelSelection();
          state.currentTool = "brush";
          DOM.viewport.classList.remove("erasing");
          const layer = getActiveLayer();
          if (layer) {
            if (layer.mode !== "fill")
              changeActiveLayerProperty("mode", "fill");
            else updateUI();
          }
          DOM.viewport.style.cursor = "none";
          render();
        };
        DOM.modeStrokeBtn.onclick = () => {
          cancelSelection();
          state.currentTool = "brush";
          DOM.viewport.classList.remove("erasing");
          const layer = getActiveLayer();
          if (layer) {
            if (layer.mode !== "stroke")
              changeActiveLayerProperty("mode", "stroke");
            else updateUI();
          }
          DOM.viewport.style.cursor = "none";
          render();
        };
        DOM.toolEraserBtn.onclick = () => {
          cancelSelection();
          state.currentTool = "eraser";
          DOM.viewport.classList.add("erasing");
          updateUI();
          DOM.viewport.style.cursor = "";
          render();
        };
        DOM.toolSelectBtn.onclick = () => {
          state.currentTool = "select";
          DOM.viewport.classList.remove("erasing");
          resetInteractionState();
          updateUI();
          render();
          DOM.viewport.style.cursor = "crosshair";
        };

        // === SELECTION SYSTEM START ===
        DOM.selectionConfirmBtn.onclick = confirmSelection;
        DOM.selectionCancelBtn.onclick = cancelSelection;
        DOM.selectionCopyBtn.onclick = copySelection;
        DOM.selectionUniformBtn.onclick = () => {
          state.selection.isUniform = !state.selection.isUniform;
          updateSelectionUI();
        };
        // === SELECTION SYSTEM END ===

        DOM.onionToggle.onchange = (e) => {
          state.onionSkins.enabled = e.target.checked;
          updateUI();
          render();
        };
        DOM.onionBeforeToggle.onchange = (e) => {
          state.onionSkins.showBefore = e.target.checked;
          updateUI();
          render();
        };
        DOM.onionAfterToggle.onchange = (e) => {
          state.onionSkins.showAfter = e.target.checked;
          updateUI();
          render();
        };
        DOM.onionOpacity.oninput = (e) => {
          state.onionSkins.opacity = parseFloat(e.target.value);
          updateUI();
          render();
        };
        DOM.snapToggle.onchange = (e) => {
          state.snapToMidline = e.target.checked;
          if (state.snapToMidline) {
            snapRotation();
            render();
          }
        };
        DOM.sliceCountRange.onchange = () => saveHistory();
        DOM.sliceCountRange.oninput = (e) => {
          state.sliceCount = parseInt(e.target.value);
          DOM.sliceValDisplay.textContent = state.sliceCount;
          setUnsaved(true);
          updateUI();
          render();
        };
        DOM.rotationSlider.oninput = (e) => {
          state.viewRotation = parseFloat(e.target.value);
          render();
        };
        DOM.rotationSlider.onchange = () => {
          if (state.snapToMidline) {
            snapRotation();
            render();
          }
        };
        DOM.resetAllBtn.onclick = () => {
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
        DOM.fpsRange.oninput = (e) => {
          state.fps = parseInt(e.target.value);
          DOM.fpsVal.textContent = state.fps;
          setUnsaved(true);
        };
        DOM.rotateDirBtn.onclick = function () {
          state.rotDirection *= -1;
          this.textContent = state.rotDirection === 1 ? "↺ 反向" : "↻ 正向";
          this.classList.toggle("active", state.rotDirection === -1);
          saveHistory();
        };
        DOM.playbackModeBtn.onclick = function () {
          state.playbackMode =
            state.playbackMode === "slice" ? "uniform" : "slice";
          this.textContent =
            state.playbackMode === "slice" ? "逐格预览" : "连续预览";
          saveHistory();
        };
        DOM.playBtn.onclick = () => {
          confirmSelection();
          state.isPlaying = !state.isPlaying;
          DOM.playBtn.textContent = state.isPlaying ? "■ 停止" : "▶ 播放";
          DOM.playBtn.classList.toggle("active", state.isPlaying);
          DOM.playBtn.style.background = state.isPlaying
            ? "var(--danger-color)"
            : "";
          if (!state.isPlaying) {
            state.animRotation = 0;
            render();
          }
        };
        DOM.headerToggleBtn.onclick = () => {
          const collapsed = !document.body.classList.contains("header-collapsed");
          setHeaderCollapsed(collapsed);
          try {
            localStorage.setItem(
              "phenaki-header-collapsed",
              collapsed ? "1" : "0",
            );
          } catch (_) {}
        };
        DOM.transportToggleBtn.onclick = () => {
          const stage = DOM.viewport.closest(".stage");
          const collapsed = !stage.classList.contains("transport-collapsed");
          setTransportCollapsed(collapsed);
          try {
            localStorage.setItem(
              "phenaki-transport-collapsed",
              collapsed ? "1" : "0",
            );
          } catch (_) {}
        };
        DOM.onionLayerBtn.onclick = () => {
          state.onionOnTop = !state.onionOnTop;
          updateUI();
          render();
        };
        DOM.closeModalBtn.onclick = () => {
          DOM.welcomeModal.style.display = "none";
        };
        DOM.welcomeModal.onclick = (e) => {
          if (e.target === DOM.welcomeModal) {
            DOM.welcomeModal.style.display = "none";
          }
        };
        DOM.layoutToggleBtn.onclick = () => {
          document.body.classList.toggle("layout-left");
        };
        DOM.rotLeftBtn.onclick = () => rotateView(1);
        DOM.rotRightBtn.onclick = () => rotateView(-1);
        DOM.touchDrawToggleBtn.onclick = () => {
          state.allowTouchDraw = !state.allowTouchDraw;
          updateUI();
        };

        DOM.exportJsonBtn.onclick = async () => {
          confirmSelection();
          const originalButtonMarkup = DOM.exportJsonBtn.innerHTML;
          DOM.exportJsonBtn.textContent = "正在打包...";
          DOM.exportJsonBtn.disabled = true;
          try {
            const unsafeName = state.projectName || "未命名项目";
            const safeFilename =
              unsafeName.replace(/[\\/:*?"<>|]/g, "_").trim() ||
              `phenaki_project_${Date.now()}`;
            const exportedSnapshot = contentSnapshot();
            const dataToExport = { version: "13.0", state: projectData() };
            const jsonString = JSON.stringify(dataToExport, null, 2);
            const preview = document.createElement("canvas");
            preview.width = preview.height = 1024;
            render(preview.getContext("2d"), 1024, 1024, true);
            const pngDataUrl = preview.toDataURL("image/png");
            const pngBlob = dataURLtoBlob(pngDataUrl);
            const zip = new JSZip();
            zip.file(`${safeFilename}.json`, jsonString);
            zip.file(`${safeFilename}.png`, pngBlob);
            const zipBlob = await zip.generateAsync({
              type: "blob",
              compression: "DEFLATE",
              compressionOptions: { level: 9 },
            });
            triggerDownload(zipBlob, `${safeFilename}.zip`);
            savedSnapshot = exportedSnapshot;
            savedLabel = "已导出项目";
            setUnsaved(true);
            showToast("项目下载已开始");
          } catch (error) {
            console.error("导出 ZIP 失败:", error);
            alert("项目导出失败。请重试；如果仍失败，可先导出 PNG 保留画面。\n" + error.message);
          } finally {
            DOM.exportJsonBtn.innerHTML = originalButtonMarkup;
            DOM.exportJsonBtn.disabled = false;
          }
        };

        DOM.exportPngBtn.onclick = () => {
          confirmSelection();
          const originalMarkup = DOM.exportPngBtn.innerHTML;
          DOM.exportPngBtn.textContent = "生成中...";
          DOM.exportPngBtn.disabled = true;
          try {
            const size = 1024;
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext("2d");
            render(tempCtx, size, size, true);
            const dataUrl = tempCanvas.toDataURL("image/png");
            const link = document.createElement("a");
            const safeName = (state.projectName || "animation")
              .replace(/[\\/:*?"<>|]/g, "_")
              .trim();
            link.download = `${safeName}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showToast("PNG 下载已开始");
          } catch (e) {
            console.error(e);
            alert("导出图片失败。\\n" + e.message);
          } finally {
            DOM.exportPngBtn.innerHTML = originalMarkup;
            DOM.exportPngBtn.disabled = false;
          }
        };

        DOM.exportVideoBtn.onclick = () => {
          confirmSelection();
          if (typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream || !supportedVideoType()) {
            showToast("当前浏览器不支持 WebM 导出，请使用新版 Chrome 或 Edge");
            return;
          }
          DOM.videoSettingsModal.style.display = "flex";
        };
        DOM.closeVideoModalBtn.onclick = () => {
          DOM.videoSettingsModal.style.display = "none";
        };
        DOM.confirmVideoExportBtn.onclick = async () => {
          const loops = parseInt(DOM.videoLoopsSelect.value);
          const size = parseInt(DOM.videoSizeSelect.value);
          DOM.videoSettingsModal.style.display = "none";
          DOM.exportLoadingModal.style.display = "flex";
          setTimeout(async () => {
            try {
              const blob = await recordVideo({ loops, size, fps: state.fps });
              const safeName = (state.projectName || "animation")
                .replace(/[\\/:*?"<>|]/g, "_")
                .trim();
              triggerDownload(blob, `${safeName}.webm`);
              DOM.videoSuccessModal.style.display = "flex";
            } catch (e) {
              console.error(e);
              alert("导出视频失败，请确保浏览器支持 MediaRecorder API");
            } finally {
              DOM.exportLoadingModal.style.display = "none";
            }
          }, 100);
        };
        DOM.closeVideoSuccessBtn.onclick = () => {
          DOM.videoSuccessModal.style.display = "none";
        };

        async function recordVideo(options) {
          return recordAnimationVideo(options);
        }

        DOM.importJsonInput.onchange = async (e) => {
          e.target.blur();
          if (!e.target.files.length) return;
          const file = e.target.files[0];
          e.target.value = "";
          if (/\.zip$/i.test(file.name)) {
            try {
              const zip = await JSZip.loadAsync(file);
              const jsonFileKey = Object.keys(zip.files).find((name) =>
                /\.json$/i.test(name)
              );
              if (!jsonFileKey) {
                alert("导入失败: ZIP压缩包中未找到 .json 项目文件。");
                return;
              }
              const jsonString = await zip.files[jsonFileKey].async("string");
              loadProjectData(jsonString, file.name);
            } catch (err) {
              alert("导入失败: 无法读取或解压 ZIP 文件。\n" + err.message);
              console.error(err);
            }
          } else if (/\.json$/i.test(file.name)) {
            const reader = new FileReader();
            reader.onload = () => {
              loadProjectData(reader.result, file.name);
            };
            reader.onerror = () => {
              alert("导入失败: 无法读取 JSON 文件。");
            };
            reader.readAsText(file);
          } else {
            alert("请选择一个 .json 或 .zip 文件。");
          }
        };

        if (DOM.openDonateBtn) {
          DOM.openDonateBtn.onclick = () => {
            DOM.donateModal.style.display = "flex";
          };
        }
        if (DOM.closeDonateBtn) {
          DOM.closeDonateBtn.onclick = () => {
            DOM.donateModal.style.display = "none";
          };
        }
        DOM.donateModal.onclick = (e) => {
          if (e.target === DOM.donateModal) {
            DOM.donateModal.style.display = "none";
          }
        };
        if (DOM.showAboutBtn && DOM.welcomeModal) {
          DOM.showAboutBtn.onclick = () => {
            DOM.welcomeModal.style.display = "flex";
          };
        }
      }

      // === 修改后的坐标转换函数 ===
      function getScreenToWorldPos(screenX, screenY, ignoreAnim = false) {
        const rect = DOM.viewport.getBoundingClientRect();
        const viewX = screenX - rect.left;
        const viewY = screenY - rect.top;
        const worldX = (viewX - state.panX) / state.zoom;
        const worldY = (viewY - state.panY) / state.zoom;
        const cx = CONFIG.baseSize / 2,
          cy = CONFIG.baseSize / 2;
        const dx = worldX - cx,
          dy = worldY - cy;

        // 关键修改：如果 ignoreAnim 为 true，则强制 dynamicRotation 为 0
        const dynamicRotation =
          state.isPlaying && !ignoreAnim ? state.animRotation : 0;

        const rad =
          (-(state.viewRotation - 90 + dynamicRotation) * Math.PI) / 180;
        const finalX = dx * Math.cos(rad) - dy * Math.sin(rad) + cx;
        const finalY = dx * Math.sin(rad) + dy * Math.cos(rad) + cy;
        return { x: finalX, y: finalY };
      }

      function getMouseAngle(clientX, clientY) {
        const rect = DOM.mainCanvas.getBoundingClientRect();
        const z = state.zoom || 1;
        const screenCx = rect.left + state.panX + (CONFIG.baseSize / 2) * z;
        const screenCy = rect.top + state.panY + (CONFIG.baseSize / 2) * z;
        return (
          (Math.atan2(clientY - screenCy, clientX - screenCx) * 180) / Math.PI
        );
      }

      function resizeCanvas() {
        DOM.mainCanvas.width = DOM.viewport.clientWidth * state.dpr;
        DOM.mainCanvas.height = DOM.viewport.clientHeight * state.dpr;
        render();
      }
      function loop(time) {
        if (state.isPlaying) {
          if (!window._lastTime) window._lastTime = time;
          const deltaTime = time - window._lastTime;
          window._lastTime = time;

          // ---原有旋转逻辑---
          if (state.playbackMode === "slice") {
            if (!window._sliceTime) window._sliceTime = 0;
            window._sliceTime += deltaTime;
            if (window._sliceTime > 1000 / state.fps) {
              const step = 360 / state.sliceCount;
              const steps = Math.floor(window._sliceTime / (1000 / state.fps));
              state.animRotation -= steps * step * state.rotDirection;
              window._sliceTime %= 1000 / state.fps;
            }
          } else {
            const degreesPerSecond = state.fps * (360 / state.sliceCount);
            const rotationThisFrame = degreesPerSecond * (deltaTime / 1000);
            state.animRotation =
              state.animRotation - rotationThisFrame * state.rotDirection;
          }
          // ---原有旋转逻辑结束---

          // ▼▼▼ 修复：只保留这一份补帧逻辑，并正确处理 ignoreAnim ▼▼▼
          if (
            state.isDrawing &&
            state.currentTool === "brush" &&
            state.currentBrushPath.length > 0
          ) {
            const rect = DOM.viewport.getBoundingClientRect();

            // 1. 获取当前激活图层是否为“不旋转”
            const activeLayer = getActiveLayer();
            const ignoreAnim = activeLayer ? activeLayer.noRotate : false;

            // 2. 传入 ignoreAnim 参数，确保坐标计算正确
            //    如果 ignoreAnim 为 true，getScreenToWorldPos 会忽略当前的 animRotation
            const currentWorldPos = getScreenToWorldPos(
              state.cursorScreenX + rect.left,
              state.cursorScreenY + rect.top,
              ignoreAnim 
            );

            // 3. 计算距离，避免点过密
            const lastPoint =
              state.currentBrushPath[state.currentBrushPath.length - 1];
            const dist = Math.hypot(
              currentWorldPos.x - lastPoint.x,
              currentWorldPos.y - lastPoint.y,
            );

            // 4. 添加点
            if (dist > 2 / state.zoom) {
              state.currentBrushPath.push(currentWorldPos);
            }
          }
          // ▲▲▲ 修复结束 ▲▲▲

          render();
        } else {
          window._lastTime = 0;
          window._sliceTime = 0;
        }
        requestAnimationFrame(loop);
      }

      function drawGrid(ctx) {
        const cx = CONFIG.baseSize / 2,
          cy = CONFIG.baseSize / 2,
          r = CONFIG.baseSize / 2 - 2;
        const step = 360 / state.sliceCount;
        const offset = step / 2;
        const z = state.zoom || 1;
        const lw = 1 / z;
        ctx.setLineDash([]);
        ctx.strokeStyle = "rgba(0,188,212,0.2)";
        ctx.lineWidth = lw;
        ctx.beginPath();
        for (let i = 0; i < state.sliceCount; i++) {
          const rad = ((i * step + offset) * Math.PI) / 180;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        }
        ctx.stroke();
        ctx.strokeStyle = "rgba(200, 200, 200, 0.3)";
        ctx.setLineDash([4 / z, 4 / z]);
        ctx.beginPath();
        for (let i = 0; i < state.sliceCount; i++) {
          const rad = (i * step * Math.PI) / 180;
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.strokeStyle = "rgba(255,50,50,0.5)";
        ctx.lineWidth = 2 / z;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + r, cy);
        ctx.stroke();
      }

      function snapRotation() {
        if (!state.snapToMidline) return;
        const step = 360 / state.sliceCount;
        state.viewRotation = Math.round(state.viewRotation / step) * step;
        state.viewRotation = ((state.viewRotation % 360) + 360) % 360;
      }
      function centerView() {
        const w = DOM.viewport.clientWidth,
          h = DOM.viewport.clientHeight;
        if (!w || !h) return;
        state.zoom = (Math.min(w, h) / CONFIG.baseSize) * 0.84;
        state.panX = (w - CONFIG.baseSize * state.zoom) / 2;
        state.panY = (h - CONFIG.baseSize * state.zoom) / 2;
        state.viewRotation = 0;
        snapRotation();
        DOM.rotationSlider.value = 0;
        render();
      }

      // ==================================================================
      // === SELECTION SYSTEM START (REPLACEMENT BLOCK) ===================
      // ==================================================================

      function pointInPolygon(point, vs) {
        const { x, y } = point;
        let inside = false;
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
          const xi = vs[i].x,
            yi = vs[i].y;
          const xj = vs[j].x,
            yj = vs[j].y;
          const intersect =
            yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      }

      // === 将原有的 calculateBBox 替换为以下代码 ===

      // === 修改 calculateBBox ===
      // 修复：加入线条粗细(Stroke Width)计算，确保粗线也能被完美框住
      function calculateBBox(pathIds) {
        const layer = getActiveLayer();
        if (!layer) return null;

        const angleDeg = state.viewRotation || 0;
        const rad = -(angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        let minRx = Infinity,
          minRy = Infinity,
          maxRx = -Infinity,
          maxRy = -Infinity;
        let hasPoints = false;

        pathIds.forEach((id) => {
          const path = layer.paths.find((p) => p.id === id);
          if (path) {
            path.points.forEach((p) => {
              hasPoints = true;
              const rx = p.x * cos - p.y * sin;
              const ry = p.x * sin + p.y * cos;
              minRx = Math.min(minRx, rx);
              minRy = Math.min(minRy, ry);
              maxRx = Math.max(maxRx, rx);
              maxRy = Math.max(maxRy, ry);
            });
          }
        });

        if (!hasPoints) return null;

        // === 核心修复在这里 ===
        // 获取画笔半径，作为额外的扩充距离
        // 还要加上一点点(PADDING)作为视觉缓冲
        const halfStroke = (layer.strokeWidth || 1) / 2;
        const PADDING = 5 + halfStroke;

        minRx -= PADDING;
        minRy -= PADDING;
        maxRx += PADDING;
        maxRy += PADDING;

        const width = maxRx - minRx;
        const height = maxRy - minRy;

        const centerRx = minRx + width / 2;
        const centerRy = minRy + height / 2;

        const invCos = Math.cos(-rad);
        const invSin = Math.sin(-rad);

        const cx = centerRx * invCos - centerRy * invSin;
        const cy = centerRx * invSin + centerRy * invCos;

        return {
          minX: cx - width / 2,
          minY: cy - height / 2,
          width,
          height,
          cx,
          cy,
        };
      }
      function resetSelection() {
        state.selection = {
          ...state.selection,
          status: "none",
          lassoPath: [],
          selectedPathIds: new Set(),
          originalPaths: new Map(),
          transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
          bbox: null,
          activeControl: null,
        };
        updateUI();
        render();
      }

      // === 将原有的 enterTransformMode 替换为以下代码 ===

      function enterTransformMode() {
        const { selectedPathIds } = state.selection;
        const layer = getActiveLayer();
        if (selectedPathIds.size === 0 || !layer) {
          showToast("未选中内容");
          return resetSelection();
        }

        const bbox = calculateBBox(selectedPathIds);
        if (!bbox) return resetSelection();

        state.selection.status = "transforming";
        state.selection.bbox = bbox;
        state.selection.originalPaths.clear();
        selectedPathIds.forEach((id) => {
          const path = layer.paths.find((p) => p.id === id);
          if (path) {
            state.selection.originalPaths.set(
              id,
              JSON.parse(JSON.stringify(path)),
            );
          }
        });

        // === 核心修改在这里 ===
        // 初始 rotation 设置为 -state.viewRotation
        // 这样包围盒会被反向旋转，从而在视觉上与屏幕边缘平行
        state.selection.transform = {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: -state.viewRotation,
        };

        updateUI();
        render();
      }

      function commitCurrentTransform() {
        if (state.selection.status !== "transforming" || !state.selection.bbox)
          return;
        const { originalPaths, bbox, transform, selectedPathIds } =
          state.selection;
        const layer = getActiveLayer();
        if (!layer) return;

        // Apply the current temporary transform to the layer's actual path data
        selectedPathIds.forEach((id) => {
          const pathInLayer = layer.paths.find((p) => p.id === id);
          const originalPath = originalPaths.get(id);
          if (pathInLayer && originalPath) {
            pathInLayer.points = originalPath.points.map((p) =>
              transformPoint(p, bbox, transform),
            );
          }
        });

        // Now, update the "original" state to be this newly committed state
        const newBbox = calculateBBox(selectedPathIds);
        state.selection.originalPaths.clear();
        selectedPathIds.forEach((id) => {
          const path = layer.paths.find((p) => p.id === id);
          if (path) {
            state.selection.originalPaths.set(
              id,
              JSON.parse(JSON.stringify(path)),
            );
          }
        });
        state.selection.bbox = newBbox;

        // IMPORTANT: Reset the temporary transform state, ready for the next drag operation
        state.selection.transform = {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };
      }

      function confirmSelection() {
        if (state.selection.status !== "transforming") return;

        // ▼▼▼ 新增的核心逻辑：应用变换 ▼▼▼
        const { originalPaths, bbox, transform, selectedPathIds } =
          state.selection;
        const layer = getActiveLayer();
        if (layer) {
          selectedPathIds.forEach((id) => {
            const pathInLayer = layer.paths.find((p) => p.id === id);
            const originalPath = originalPaths.get(id); // 获取进入变换前的原始路径
            if (pathInLayer && originalPath) {
              // 应用最终的变换并更新图层数据
              pathInLayer.points = originalPath.points.map((p) =>
                transformPoint(p, bbox, transform),
              );
            }
          });
          saveHistory(); // 保存历史记录
        }
        // ▲▲▲ 核心逻辑结束 ▲▲▲

        resetSelection();
        DOM.viewport.style.cursor = "crosshair";
      }

      function cancelSelection() {
        if (state.selection.status === "none") return;

        // Revert to the state before the transform session started
        const { originalPaths, selectedPathIds } = state.selection;
        const layer = getActiveLayer();
        if (layer) {
          selectedPathIds.forEach((id) => {
            const pathInLayer = layer.paths.find((p) => p.id === id);
            const originalPath = originalPaths.get(id);
            if (pathInLayer && originalPath) {
              pathInLayer.points = originalPath.points;
            }
          });
        }

        resetSelection();
        DOM.viewport.style.cursor = "crosshair";
      }

      function copySelection() {
        if (state.selection.status !== "transforming") return;

        const { originalPaths, bbox, transform, selectedPathIds } =
          state.selection;
        const layer = getActiveLayer();
        if (!layer) return;

        // ▼▼▼ 新增的核心逻辑：基于变换后的结果创建副本 ▼▼▼
        const newPaths = [];
        const newPathIds = new Set();
        const offset = { x: 20 / state.zoom, y: 20 / state.zoom }; // 副本的偏移量

        originalPaths.forEach((originalPath, id) => {
          if (selectedPathIds.has(id)) {
            // 确保只复制当前选中的
            const newPath = JSON.parse(JSON.stringify(originalPath)); // 深拷贝原始路径结构
            newPath.id = Date.now() + Math.random();

            // 计算变换后的点，并额外加上偏移量
            newPath.points = originalPath.points.map((p) => {
              const transformedPoint = transformPoint(p, bbox, transform);
              return {
                x: transformedPoint.x + offset.x,
                y: transformedPoint.y + offset.y,
              };
            });

            newPaths.push(newPath);
            newPathIds.add(newPath.id);
          }
        });
        // ▲▲▲ 核心逻辑结束 ▲▲▲

        if (newPaths.length > 0) {
          layer.paths.push(...newPaths);
          saveHistory();

          // 可选：让新创建的副本成为当前选区，以便连续复制
          confirmSelection(); // 先确认并取消当前的选区
          state.selection.selectedPathIds = newPathIds; // 然后选中新的
          enterTransformMode(); // 进入新的变换模式
        }
      }

      function handleSelectionPointerDown(e) {
        const s = state.selection;
        if (s.status === "none") {
          s.status = "selecting";
          s.lassoPath = [getScreenToWorldPos(e.clientX, e.clientY)];
          DOM.viewport.setPointerCapture(e.pointerId);
        } else if (s.status === "transforming") {
          const worldPos = getScreenToWorldPos(e.clientX, e.clientY);
          s.activeControl = getHandleAtPos(worldPos);
          if (s.activeControl) {
            DOM.viewport.setPointerCapture(e.pointerId);
            s.dragStart.x = worldPos.x;
            s.dragStart.y = worldPos.y;
            // Record the state at the beginning of the drag
            s.dragStart.transform = JSON.parse(JSON.stringify(s.transform));
          } else {
            confirmSelection();
          }
        }
      }

      // === 修改 handleSelectionPointerMove ===
      // 修复：缩放逻辑重写，采用“锚点固定法”，确保对角点纹丝不动
      function handleSelectionPointerMove(e) {
        const s = state.selection;
        const worldPos = getScreenToWorldPos(e.clientX, e.clientY);

        if (s.status === "selecting" && e.buttons & 1) {
          s.lassoPath.push(worldPos);
          render();
          return;
        }

        if (s.status === "transforming") {
          if (s.activeControl && e.buttons & 1) {
            // 移动模式逻辑保持不变
            if (s.activeControl === "move") {
              const startTransform = s.dragStart.transform;
              const dx = worldPos.x - s.dragStart.x;
              const dy = worldPos.y - s.dragStart.y;
              s.transform.x = startTransform.x + dx;
              s.transform.y = startTransform.y + dy;
            }
            // 旋转模式逻辑保持不变
            else if (s.activeControl === "rotate") {
              const startTransform = s.dragStart.transform;
              const pivot = {
                cx: s.bbox.cx + startTransform.x,
                cy: s.bbox.cy + startTransform.y,
              };
              const startAngle = Math.atan2(
                s.dragStart.y - pivot.cy,
                s.dragStart.x - pivot.cx,
              );
              const currentAngle = Math.atan2(
                worldPos.y - pivot.cy,
                worldPos.x - pivot.cx,
              );
              s.transform.rotation =
                startTransform.rotation +
                ((currentAngle - startAngle) * 180) / Math.PI;
            }
            // === 核心修复：缩放逻辑 ===
            else {
              // 1. 定义控制点的符号 (左/上 为 -1, 右/下 为 1)
              const signX = s.activeControl.includes("l") ? -1 : 1;
              const signY = s.activeControl.includes("t") ? -1 : 1;

              // 2. 计算“对角锚点” (Anchor) 的世界坐标
              // 我们利用上一次(拖拽开始时)的变换状态来计算锚点的绝对位置，因为锚点是不动的
              const startTransform = s.dragStart.transform;

              // 获取包围盒的一半宽高
              const halfW = s.bbox.width / 2;
              const halfH = s.bbox.height / 2;

              // 锚点在局部坐标系的位置 (与当前拖拽点相反)
              // 例如：拖拽 tl(-1, -1)，锚点就是 br(1, 1)
              const anchorLocalX = -signX * halfW;
              const anchorLocalY = -signY * halfH;

              // 将锚点转为世界坐标
              const rad = (startTransform.rotation * Math.PI) / 180;
              const cos = Math.cos(rad);
              const sin = Math.sin(rad);

              // 应用缩放
              const scaledAnchorX = anchorLocalX * startTransform.scaleX;
              const scaledAnchorY = anchorLocalY * startTransform.scaleY;

              // 应用旋转并加上中心位移
              const anchorWorldX =
                s.bbox.cx +
                startTransform.x +
                (scaledAnchorX * cos - scaledAnchorY * sin);
              const anchorWorldY =
                s.bbox.cy +
                startTransform.y +
                (scaledAnchorX * sin + scaledAnchorY * cos);

              // 3. 计算“新中心点” (New Center)
              // 新的中心点必然是 锚点 和 鼠标当前位置 的中点
              const newCenterX = (anchorWorldX + worldPos.x) / 2;
              const newCenterY = (anchorWorldY + worldPos.y) / 2;

              // 4. 计算新的全长向量 (从锚点指向鼠标)
              const diagDx = worldPos.x - anchorWorldX;
              const diagDy = worldPos.y - anchorWorldY;

              // 5. 将该向量“反向旋转”，使其平行于包围盒的轴，以便提取宽高
              // 注意：这里使用当前的旋转角度
              const unrotatedDx = diagDx * cos + diagDy * sin;
              const unrotatedDy = -diagDx * sin + diagDy * cos;

              // 6. 计算新的 Scale
              // 新的 Scale = (反向旋转后的长度) / (原始包围盒长度 * 符号)
              // 符号很重要：如果我在拖拽左边(sign=-1)，向量也是指向左边(负)，负负得正，缩放为正。
              // 如果拖拽到了右边(翻转)，向量变正，结果变负，实现翻转效果。
              let newScaleX = unrotatedDx / (s.bbox.width * signX);
              let newScaleY = unrotatedDy / (s.bbox.height * signY);

              // 7. 处理等比缩放 (Shift键 或 锁定按钮)
              if (s.isUniform) {
                // 取绝对值较大的那个比例，保持形状
                const absScaleX = Math.abs(newScaleX);
                const absScaleY = Math.abs(newScaleY);
                const maxScale = Math.max(absScaleX, absScaleY);
                newScaleX = (newScaleX < 0 ? -1 : 1) * maxScale;
                newScaleY = (newScaleY < 0 ? -1 : 1) * maxScale;

                // 等比缩放时，中心点需要重新基于修正后的长度计算
                // (因为上面简单的中点计算假设了X和Y可以自由伸缩)
                // 这里为了代码简洁，微小的中心点偏移通常可以忽略，
                // 或者使用更复杂的几何修正。鉴于Web交互，上述中点法在视觉上通常足够，
                // 但若要精确修正：
                /*
          const correctedDx = newScaleX * s.bbox.width * signX;
          const correctedDy = newScaleY * s.bbox.height * signY;
          // 重新旋转回世界坐标
          const finalDx = correctedDx * cos - correctedDy * sin;
          const finalDy = correctedDx * sin + correctedDy * cos;
          newCenterX = anchorWorldX + finalDx / 2;
          newCenterY = anchorWorldY + finalDy / 2;
          */
              }

              // 8. 应用结果
              s.transform.scaleX = newScaleX;
              s.transform.scaleY = newScaleY;
              s.transform.x = newCenterX - s.bbox.cx;
              s.transform.y = newCenterY - s.bbox.cy;
            }
            render();
          } else {
            // 鼠标悬停样式逻辑 (保持不变)
            const handle = getHandleAtPos(worldPos);
            if (handle === "move") DOM.viewport.style.cursor = "move";
            else if (handle === "rotate")
              DOM.viewport.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23fff' stroke='%23000' stroke-width='0.5'><path d='M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97-.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z'/></svg>") 12 12, auto`;
            else if (handle) DOM.viewport.style.cursor = "nwse-resize";
            else DOM.viewport.style.cursor = "crosshair";
          }
        }
      }

      function handleSelectionPointerUp(e) {
        const s = state.selection;
        if (s.status === "selecting") {
          if (DOM.viewport.hasPointerCapture(e.pointerId)) DOM.viewport.releasePointerCapture(e.pointerId);
          s.status = "none";
          const layer = getActiveLayer();
          if (!layer || s.lassoPath.length < 3) return resetSelection();
          s.selectedPathIds.clear();
          layer.paths.forEach((path) => {
            for (const point of path.points) {
              if (pointInPolygon(point, s.lassoPath)) {
                s.selectedPathIds.add(path.id);
                break;
              }
            }
          });
          s.lassoPath = [];
          enterTransformMode();
        } else if (s.status === "transforming") {
          if (s.activeControl) {
            if (DOM.viewport.hasPointerCapture(e.pointerId)) DOM.viewport.releasePointerCapture(e.pointerId);
            s.activeControl = null;

            // ▼▼▼ 核心修复：不再提交！而是更新下一次拖拽的“起始状态” ▼▼▼
            // 这将当前的总变换量（旋转、缩放等）保存为下一次操作的基准
            // 从而保证了连续操作时包围盒的稳定。
            s.dragStart.transform = JSON.parse(JSON.stringify(s.transform));
          }
        }
      }

      function renderLassoPath(ctx) {
        if (state.selection.lassoPath.length < 2) return;
        ctx.save();
        ctx.strokeStyle = "rgba(0, 188, 212, 0.8)";
        ctx.lineWidth = 1 / state.zoom;
        ctx.setLineDash([4 / state.zoom, 4 / state.zoom]);
        ctx.beginPath();
        ctx.moveTo(
          state.selection.lassoPath[0].x,
          state.selection.lassoPath[0].y,
        );
        for (let i = 1; i < state.selection.lassoPath.length; i++) {
          ctx.lineTo(
            state.selection.lassoPath[i].x,
            state.selection.lassoPath[i].y,
          );
        }
        ctx.stroke();
        ctx.restore();
      }

      // === 修改 transformPoint ===
      // 核心逻辑：先将世界坐标的点，投影到“正向”的包围盒局部坐标系中，缩放后，再应用变换旋转
      function transformPoint(p, bbox, transform) {
        const { cx, cy } = bbox;
        const { x, y, scaleX, scaleY, rotation } = transform;

        // 1. 计算相对于中心的向量（此时还是世界坐标方向）
        let px = p.x - cx;
        let py = p.y - cy;

        // 2. 【关键修正】将向量旋转 ViewRotation 角度
        // 这样就把“世界方向”的点，对齐到了“选框局部方向”（即屏幕方向）
        // 否则后续的 scaleX 缩放会沿着错误的方向（世界X轴）进行，而不是沿着选框宽边进行
        const viewRad = (state.viewRotation * Math.PI) / 180;
        const cosV = Math.cos(viewRad);
        const sinV = Math.sin(viewRad);

        const localX = px * cosV - py * sinV;
        const localY = px * sinV + py * cosV;

        // 3. 应用缩放（现在是沿着选框的长宽方向缩放了）
        const scaledX = localX * scaleX;
        const scaledY = localY * scaleY;

        // 4. 应用变换旋转，并转回世界坐标
        // 这里的 rotation 初始值包含了 -viewRotation，正好会把上面的第2步抵消掉
        // 从而让图像在初始状态下保持纹丝不动
        const rotRad = (rotation * Math.PI) / 180;
        const cosR = Math.cos(rotRad);
        const sinR = Math.sin(rotRad);

        const finalX = scaledX * cosR - scaledY * sinR;
        const finalY = scaledX * sinR + scaledY * cosR;

        // 5. 加上位移和中心点
        return { x: finalX + cx + x, y: finalY + cy + y };
      }

      function renderTransformedSelection(ctx) {
        const { originalPaths, bbox, transform } = state.selection;
        const layer = getActiveLayer();
        if (!layer || !originalPaths || originalPaths.size === 0) return;

        ctx.save();
        ctx.globalAlpha = layer.opacity;
        ctx.strokeStyle = layer.color;
        ctx.fillStyle = layer.color;
        ctx.lineWidth = layer.strokeWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        originalPaths.forEach((originalPath) => {
          const transformedPoints = originalPath.points.map((p) =>
            transformPoint(p, bbox, transform),
          );
          if (transformedPoints.length < 1) return;
          ctx.beginPath();
          ctx.moveTo(transformedPoints[0].x, transformedPoints[0].y);
          for (let i = 1; i < transformedPoints.length; i++) {
            ctx.lineTo(transformedPoints[i].x, transformedPoints[i].y);
          }
          if (layer.mode === "fill" && transformedPoints.length > 1) {
            // Use layer.mode, not originalPath.mode
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.stroke();
          }
        });
        ctx.restore();
      }

      // === 修改 getTransformHandles ===
      // 直接根据宽高和变换参数计算控制点位置，更加稳定
      function getTransformHandles() {
        const { bbox, transform } = state.selection;
        if (!bbox) return null;

        const halfW = bbox.width / 2;
        const halfH = bbox.height / 2;
        const rotationMargin = 40 / state.zoom;

        // 预计算旋转参数
        const rotRad = (transform.rotation * Math.PI) / 180;
        const cos = Math.cos(rotRad);
        const sin = Math.sin(rotRad);

        // 辅助函数：将局部坐标(lx, ly)转换到最终世界坐标
        const toWorld = (lx, ly) => {
          // 缩放
          const sx = lx * transform.scaleX;
          const sy = ly * transform.scaleY;
          // 旋转 + 平移 + 中心点
          return {
            x: bbox.cx + transform.x + (sx * cos - sy * sin),
            y: bbox.cy + transform.y + (sx * sin + sy * cos),
          };
        };

        // 1. 计算内部四个角点 (Box Corners)
        const inner = {
          tl: toWorld(-halfW, -halfH),
          tr: toWorld(halfW, -halfH),
          br: toWorld(halfW, halfH),
          bl: toWorld(-halfW, halfH),
        };

        // 2. 计算外部四个角点 (用于旋转检测区域)
        const outer = {
          tl: toWorld(-halfW - rotationMargin, -halfH - rotationMargin),
          tr: toWorld(halfW + rotationMargin, -halfH - rotationMargin),
          br: toWorld(halfW + rotationMargin, halfH + rotationMargin),
          bl: toWorld(-halfW - rotationMargin, halfH + rotationMargin),
        };

        return { inner, outer };
      }
      function renderTransformHandles(ctx) {
        const handles = getTransformHandles();
        if (!handles) return;

        ctx.save();
        ctx.strokeStyle = "#00bcd4";
        ctx.fillStyle = "#00bcd4";
        ctx.lineWidth = 1 / state.zoom;

        // ▼▼▼ 核心修改：使用 handles.inner 来绘制包围盒和角点 ▼▼▼
        const innerHandles = handles.inner;

        ctx.beginPath();
        ctx.moveTo(innerHandles.tl.x, innerHandles.tl.y);
        ctx.lineTo(innerHandles.tr.x, innerHandles.tr.y);
        ctx.lineTo(innerHandles.br.x, innerHandles.br.y);
        ctx.lineTo(innerHandles.bl.x, innerHandles.bl.y);
        ctx.closePath();
        ctx.stroke();

        const handleSize = 6 / state.zoom;
        for (const key of ["tl", "tr", "bl", "br"]) {
          ctx.beginPath();
          ctx.arc(
            innerHandles[key].x,
            innerHandles[key].y,
            handleSize,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.restore();
      }

      function getHandleAtPos(pos) {
        const handles = getTransformHandles();
        if (!handles) return null;

        // 1. 优先检查四个角点
        const hitRadius = 12 / state.zoom; // 稍微增大角点的点击范围
        for (const key of ["tl", "tr", "bl", "br"]) {
          if (
            Math.hypot(
              pos.x - handles.inner[key].x,
              pos.y - handles.inner[key].y,
            ) < hitRadius
          ) {
            return key;
          }
        }

        // 2. 检查是否在包围盒内部（移动操作）
        const innerCorners = [
          handles.inner.tl,
          handles.inner.tr,
          handles.inner.br,
          handles.inner.bl,
        ];
        if (pointInPolygon(pos, innerCorners)) {
          return "move";
        }

        // ▼▼▼ 核心修改：检查是否在“外部框”内，但在“内部框”外 ▼▼▼
        const outerCorners = [
          handles.outer.tl,
          handles.outer.tr,
          handles.outer.br,
          handles.outer.bl,
        ];
        if (pointInPolygon(pos, outerCorners)) {
          // 如果能执行到这里，说明它不在角点上，也不在内部框里
          // 那么它一定在内外框之间的“旋转区域”
          return "rotate";
        }

        return null;
      }

      function updateSelectionUI() {
        const bubble = DOM.selectionActions;
        if (state.selection.status === "transforming") {
          bubble.style.display = "flex";
          DOM.selectionUniformBtn.textContent = state.selection.isUniform
            ? "🔒"
            : "🔓";
        } else {
          bubble.style.display = "none";
        }
      }

      // ==================================================================
      // === SELECTION SYSTEM END =========================================
      // ==================================================================

      document.addEventListener("DOMContentLoaded", init);
    
