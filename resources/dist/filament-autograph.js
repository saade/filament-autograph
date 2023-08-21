// node_modules/signature_pad/dist/signature_pad.js
var Point = class {
  constructor(x, y, pressure, time) {
    if (isNaN(x) || isNaN(y)) {
      throw new Error(`Point is invalid: (${x}, ${y})`);
    }
    this.x = +x;
    this.y = +y;
    this.pressure = pressure || 0;
    this.time = time || Date.now();
  }
  distanceTo(start) {
    return Math.sqrt(Math.pow(this.x - start.x, 2) + Math.pow(this.y - start.y, 2));
  }
  equals(other) {
    return this.x === other.x && this.y === other.y && this.pressure === other.pressure && this.time === other.time;
  }
  velocityFrom(start) {
    return this.time !== start.time ? this.distanceTo(start) / (this.time - start.time) : 0;
  }
};
var Bezier = class _Bezier {
  constructor(startPoint, control2, control1, endPoint, startWidth, endWidth) {
    this.startPoint = startPoint;
    this.control2 = control2;
    this.control1 = control1;
    this.endPoint = endPoint;
    this.startWidth = startWidth;
    this.endWidth = endWidth;
  }
  static fromPoints(points, widths) {
    const c2 = this.calculateControlPoints(points[0], points[1], points[2]).c2;
    const c3 = this.calculateControlPoints(points[1], points[2], points[3]).c1;
    return new _Bezier(points[1], c2, c3, points[2], widths.start, widths.end);
  }
  static calculateControlPoints(s1, s2, s3) {
    const dx1 = s1.x - s2.x;
    const dy1 = s1.y - s2.y;
    const dx2 = s2.x - s3.x;
    const dy2 = s2.y - s3.y;
    const m1 = { x: (s1.x + s2.x) / 2, y: (s1.y + s2.y) / 2 };
    const m2 = { x: (s2.x + s3.x) / 2, y: (s2.y + s3.y) / 2 };
    const l1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const l2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const dxm = m1.x - m2.x;
    const dym = m1.y - m2.y;
    const k = l2 / (l1 + l2);
    const cm = { x: m2.x + dxm * k, y: m2.y + dym * k };
    const tx = s2.x - cm.x;
    const ty = s2.y - cm.y;
    return {
      c1: new Point(m1.x + tx, m1.y + ty),
      c2: new Point(m2.x + tx, m2.y + ty)
    };
  }
  length() {
    const steps = 10;
    let length = 0;
    let px;
    let py;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const cx = this.point(t, this.startPoint.x, this.control1.x, this.control2.x, this.endPoint.x);
      const cy = this.point(t, this.startPoint.y, this.control1.y, this.control2.y, this.endPoint.y);
      if (i > 0) {
        const xdiff = cx - px;
        const ydiff = cy - py;
        length += Math.sqrt(xdiff * xdiff + ydiff * ydiff);
      }
      px = cx;
      py = cy;
    }
    return length;
  }
  point(t, start, c1, c2, end) {
    return start * (1 - t) * (1 - t) * (1 - t) + 3 * c1 * (1 - t) * (1 - t) * t + 3 * c2 * (1 - t) * t * t + end * t * t * t;
  }
};
var SignatureEventTarget = class {
  constructor() {
    try {
      this._et = new EventTarget();
    } catch (error) {
      this._et = document;
    }
  }
  addEventListener(type, listener, options) {
    this._et.addEventListener(type, listener, options);
  }
  dispatchEvent(event) {
    return this._et.dispatchEvent(event);
  }
  removeEventListener(type, callback, options) {
    this._et.removeEventListener(type, callback, options);
  }
};
function throttle(fn, wait = 250) {
  let previous = 0;
  let timeout = null;
  let result;
  let storedContext;
  let storedArgs;
  const later = () => {
    previous = Date.now();
    timeout = null;
    result = fn.apply(storedContext, storedArgs);
    if (!timeout) {
      storedContext = null;
      storedArgs = [];
    }
  };
  return function wrapper(...args) {
    const now = Date.now();
    const remaining = wait - (now - previous);
    storedContext = this;
    storedArgs = args;
    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      previous = now;
      result = fn.apply(storedContext, storedArgs);
      if (!timeout) {
        storedContext = null;
        storedArgs = [];
      }
    } else if (!timeout) {
      timeout = window.setTimeout(later, remaining);
    }
    return result;
  };
}
var SignaturePad = class _SignaturePad extends SignatureEventTarget {
  constructor(canvas, options = {}) {
    super();
    this.canvas = canvas;
    this._drawningStroke = false;
    this._isEmpty = true;
    this._lastPoints = [];
    this._data = [];
    this._lastVelocity = 0;
    this._lastWidth = 0;
    this._handleMouseDown = (event) => {
      if (event.buttons === 1) {
        this._drawningStroke = true;
        this._strokeBegin(event);
      }
    };
    this._handleMouseMove = (event) => {
      if (this._drawningStroke) {
        this._strokeMoveUpdate(event);
      }
    };
    this._handleMouseUp = (event) => {
      if (event.buttons === 1 && this._drawningStroke) {
        this._drawningStroke = false;
        this._strokeEnd(event);
      }
    };
    this._handleTouchStart = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      if (event.targetTouches.length === 1) {
        const touch = event.changedTouches[0];
        this._strokeBegin(touch);
      }
    };
    this._handleTouchMove = (event) => {
      if (event.cancelable) {
        event.preventDefault();
      }
      const touch = event.targetTouches[0];
      this._strokeMoveUpdate(touch);
    };
    this._handleTouchEnd = (event) => {
      const wasCanvasTouched = event.target === this.canvas;
      if (wasCanvasTouched) {
        if (event.cancelable) {
          event.preventDefault();
        }
        const touch = event.changedTouches[0];
        this._strokeEnd(touch);
      }
    };
    this._handlePointerStart = (event) => {
      this._drawningStroke = true;
      event.preventDefault();
      this._strokeBegin(event);
    };
    this._handlePointerMove = (event) => {
      if (this._drawningStroke) {
        event.preventDefault();
        this._strokeMoveUpdate(event);
      }
    };
    this._handlePointerEnd = (event) => {
      if (this._drawningStroke) {
        event.preventDefault();
        this._drawningStroke = false;
        this._strokeEnd(event);
      }
    };
    this.velocityFilterWeight = options.velocityFilterWeight || 0.7;
    this.minWidth = options.minWidth || 0.5;
    this.maxWidth = options.maxWidth || 2.5;
    this.throttle = "throttle" in options ? options.throttle : 16;
    this.minDistance = "minDistance" in options ? options.minDistance : 5;
    this.dotSize = options.dotSize || 0;
    this.penColor = options.penColor || "black";
    this.backgroundColor = options.backgroundColor || "rgba(0,0,0,0)";
    this.compositeOperation = options.compositeOperation || "source-over";
    this._strokeMoveUpdate = this.throttle ? throttle(_SignaturePad.prototype._strokeUpdate, this.throttle) : _SignaturePad.prototype._strokeUpdate;
    this._ctx = canvas.getContext("2d");
    this.clear();
    this.on();
  }
  clear() {
    const { _ctx: ctx, canvas } = this;
    ctx.fillStyle = this.backgroundColor;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this._data = [];
    this._reset(this._getPointGroupOptions());
    this._isEmpty = true;
  }
  fromDataURL(dataUrl, options = {}) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const ratio = options.ratio || window.devicePixelRatio || 1;
      const width = options.width || this.canvas.width / ratio;
      const height = options.height || this.canvas.height / ratio;
      const xOffset = options.xOffset || 0;
      const yOffset = options.yOffset || 0;
      this._reset(this._getPointGroupOptions());
      image.onload = () => {
        this._ctx.drawImage(image, xOffset, yOffset, width, height);
        resolve();
      };
      image.onerror = (error) => {
        reject(error);
      };
      image.crossOrigin = "anonymous";
      image.src = dataUrl;
      this._isEmpty = false;
    });
  }
  toDataURL(type = "image/png", encoderOptions) {
    switch (type) {
      case "image/svg+xml":
        if (typeof encoderOptions !== "object") {
          encoderOptions = void 0;
        }
        return `data:image/svg+xml;base64,${btoa(this.toSVG(encoderOptions))}`;
      default:
        if (typeof encoderOptions !== "number") {
          encoderOptions = void 0;
        }
        return this.canvas.toDataURL(type, encoderOptions);
    }
  }
  on() {
    this.canvas.style.touchAction = "none";
    this.canvas.style.msTouchAction = "none";
    this.canvas.style.userSelect = "none";
    const isIOS = /Macintosh/.test(navigator.userAgent) && "ontouchstart" in document;
    if (window.PointerEvent && !isIOS) {
      this._handlePointerEvents();
    } else {
      this._handleMouseEvents();
      if ("ontouchstart" in window) {
        this._handleTouchEvents();
      }
    }
  }
  off() {
    this.canvas.style.touchAction = "auto";
    this.canvas.style.msTouchAction = "auto";
    this.canvas.style.userSelect = "auto";
    this.canvas.removeEventListener("pointerdown", this._handlePointerStart);
    this.canvas.removeEventListener("pointermove", this._handlePointerMove);
    this.canvas.ownerDocument.removeEventListener("pointerup", this._handlePointerEnd);
    this.canvas.removeEventListener("mousedown", this._handleMouseDown);
    this.canvas.removeEventListener("mousemove", this._handleMouseMove);
    this.canvas.ownerDocument.removeEventListener("mouseup", this._handleMouseUp);
    this.canvas.removeEventListener("touchstart", this._handleTouchStart);
    this.canvas.removeEventListener("touchmove", this._handleTouchMove);
    this.canvas.removeEventListener("touchend", this._handleTouchEnd);
  }
  isEmpty() {
    return this._isEmpty;
  }
  fromData(pointGroups, { clear = true } = {}) {
    if (clear) {
      this.clear();
    }
    this._fromData(pointGroups, this._drawCurve.bind(this), this._drawDot.bind(this));
    this._data = this._data.concat(pointGroups);
  }
  toData() {
    return this._data;
  }
  _getPointGroupOptions(group) {
    return {
      penColor: group && "penColor" in group ? group.penColor : this.penColor,
      dotSize: group && "dotSize" in group ? group.dotSize : this.dotSize,
      minWidth: group && "minWidth" in group ? group.minWidth : this.minWidth,
      maxWidth: group && "maxWidth" in group ? group.maxWidth : this.maxWidth,
      velocityFilterWeight: group && "velocityFilterWeight" in group ? group.velocityFilterWeight : this.velocityFilterWeight,
      compositeOperation: group && "compositeOperation" in group ? group.compositeOperation : this.compositeOperation
    };
  }
  _strokeBegin(event) {
    this.dispatchEvent(new CustomEvent("beginStroke", { detail: event }));
    const pointGroupOptions = this._getPointGroupOptions();
    const newPointGroup = Object.assign(Object.assign({}, pointGroupOptions), { points: [] });
    this._data.push(newPointGroup);
    this._reset(pointGroupOptions);
    this._strokeUpdate(event);
  }
  _strokeUpdate(event) {
    if (this._data.length === 0) {
      this._strokeBegin(event);
      return;
    }
    this.dispatchEvent(new CustomEvent("beforeUpdateStroke", { detail: event }));
    const x = event.clientX;
    const y = event.clientY;
    const pressure = event.pressure !== void 0 ? event.pressure : event.force !== void 0 ? event.force : 0;
    const point = this._createPoint(x, y, pressure);
    const lastPointGroup = this._data[this._data.length - 1];
    const lastPoints = lastPointGroup.points;
    const lastPoint = lastPoints.length > 0 && lastPoints[lastPoints.length - 1];
    const isLastPointTooClose = lastPoint ? point.distanceTo(lastPoint) <= this.minDistance : false;
    const pointGroupOptions = this._getPointGroupOptions(lastPointGroup);
    if (!lastPoint || !(lastPoint && isLastPointTooClose)) {
      const curve = this._addPoint(point, pointGroupOptions);
      if (!lastPoint) {
        this._drawDot(point, pointGroupOptions);
      } else if (curve) {
        this._drawCurve(curve, pointGroupOptions);
      }
      lastPoints.push({
        time: point.time,
        x: point.x,
        y: point.y,
        pressure: point.pressure
      });
    }
    this.dispatchEvent(new CustomEvent("afterUpdateStroke", { detail: event }));
  }
  _strokeEnd(event) {
    this._strokeUpdate(event);
    this.dispatchEvent(new CustomEvent("endStroke", { detail: event }));
  }
  _handlePointerEvents() {
    this._drawningStroke = false;
    this.canvas.addEventListener("pointerdown", this._handlePointerStart);
    this.canvas.addEventListener("pointermove", this._handlePointerMove);
    this.canvas.ownerDocument.addEventListener("pointerup", this._handlePointerEnd);
  }
  _handleMouseEvents() {
    this._drawningStroke = false;
    this.canvas.addEventListener("mousedown", this._handleMouseDown);
    this.canvas.addEventListener("mousemove", this._handleMouseMove);
    this.canvas.ownerDocument.addEventListener("mouseup", this._handleMouseUp);
  }
  _handleTouchEvents() {
    this.canvas.addEventListener("touchstart", this._handleTouchStart);
    this.canvas.addEventListener("touchmove", this._handleTouchMove);
    this.canvas.addEventListener("touchend", this._handleTouchEnd);
  }
  _reset(options) {
    this._lastPoints = [];
    this._lastVelocity = 0;
    this._lastWidth = (options.minWidth + options.maxWidth) / 2;
    this._ctx.fillStyle = options.penColor;
    this._ctx.globalCompositeOperation = options.compositeOperation;
  }
  _createPoint(x, y, pressure) {
    const rect = this.canvas.getBoundingClientRect();
    return new Point(x - rect.left, y - rect.top, pressure, (/* @__PURE__ */ new Date()).getTime());
  }
  _addPoint(point, options) {
    const { _lastPoints } = this;
    _lastPoints.push(point);
    if (_lastPoints.length > 2) {
      if (_lastPoints.length === 3) {
        _lastPoints.unshift(_lastPoints[0]);
      }
      const widths = this._calculateCurveWidths(_lastPoints[1], _lastPoints[2], options);
      const curve = Bezier.fromPoints(_lastPoints, widths);
      _lastPoints.shift();
      return curve;
    }
    return null;
  }
  _calculateCurveWidths(startPoint, endPoint, options) {
    const velocity = options.velocityFilterWeight * endPoint.velocityFrom(startPoint) + (1 - options.velocityFilterWeight) * this._lastVelocity;
    const newWidth = this._strokeWidth(velocity, options);
    const widths = {
      end: newWidth,
      start: this._lastWidth
    };
    this._lastVelocity = velocity;
    this._lastWidth = newWidth;
    return widths;
  }
  _strokeWidth(velocity, options) {
    return Math.max(options.maxWidth / (velocity + 1), options.minWidth);
  }
  _drawCurveSegment(x, y, width) {
    const ctx = this._ctx;
    ctx.moveTo(x, y);
    ctx.arc(x, y, width, 0, 2 * Math.PI, false);
    this._isEmpty = false;
  }
  _drawCurve(curve, options) {
    const ctx = this._ctx;
    const widthDelta = curve.endWidth - curve.startWidth;
    const drawSteps = Math.ceil(curve.length()) * 2;
    ctx.beginPath();
    ctx.fillStyle = options.penColor;
    for (let i = 0; i < drawSteps; i += 1) {
      const t = i / drawSteps;
      const tt = t * t;
      const ttt = tt * t;
      const u = 1 - t;
      const uu = u * u;
      const uuu = uu * u;
      let x = uuu * curve.startPoint.x;
      x += 3 * uu * t * curve.control1.x;
      x += 3 * u * tt * curve.control2.x;
      x += ttt * curve.endPoint.x;
      let y = uuu * curve.startPoint.y;
      y += 3 * uu * t * curve.control1.y;
      y += 3 * u * tt * curve.control2.y;
      y += ttt * curve.endPoint.y;
      const width = Math.min(curve.startWidth + ttt * widthDelta, options.maxWidth);
      this._drawCurveSegment(x, y, width);
    }
    ctx.closePath();
    ctx.fill();
  }
  _drawDot(point, options) {
    const ctx = this._ctx;
    const width = options.dotSize > 0 ? options.dotSize : (options.minWidth + options.maxWidth) / 2;
    ctx.beginPath();
    this._drawCurveSegment(point.x, point.y, width);
    ctx.closePath();
    ctx.fillStyle = options.penColor;
    ctx.fill();
  }
  _fromData(pointGroups, drawCurve, drawDot) {
    for (const group of pointGroups) {
      const { points } = group;
      const pointGroupOptions = this._getPointGroupOptions(group);
      if (points.length > 1) {
        for (let j = 0; j < points.length; j += 1) {
          const basicPoint = points[j];
          const point = new Point(basicPoint.x, basicPoint.y, basicPoint.pressure, basicPoint.time);
          if (j === 0) {
            this._reset(pointGroupOptions);
          }
          const curve = this._addPoint(point, pointGroupOptions);
          if (curve) {
            drawCurve(curve, pointGroupOptions);
          }
        }
      } else {
        this._reset(pointGroupOptions);
        drawDot(points[0], pointGroupOptions);
      }
    }
  }
  toSVG({ includeBackgroundColor = false } = {}) {
    const pointGroups = this._data;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const minX = 0;
    const minY = 0;
    const maxX = this.canvas.width / ratio;
    const maxY = this.canvas.height / ratio;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    svg.setAttribute("viewBox", `${minX} ${minY} ${maxX} ${maxY}`);
    svg.setAttribute("width", maxX.toString());
    svg.setAttribute("height", maxY.toString());
    if (includeBackgroundColor && this.backgroundColor) {
      const rect = document.createElement("rect");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", this.backgroundColor);
      svg.appendChild(rect);
    }
    this._fromData(pointGroups, (curve, { penColor }) => {
      const path = document.createElement("path");
      if (!isNaN(curve.control1.x) && !isNaN(curve.control1.y) && !isNaN(curve.control2.x) && !isNaN(curve.control2.y)) {
        const attr = `M ${curve.startPoint.x.toFixed(3)},${curve.startPoint.y.toFixed(3)} C ${curve.control1.x.toFixed(3)},${curve.control1.y.toFixed(3)} ${curve.control2.x.toFixed(3)},${curve.control2.y.toFixed(3)} ${curve.endPoint.x.toFixed(3)},${curve.endPoint.y.toFixed(3)}`;
        path.setAttribute("d", attr);
        path.setAttribute("stroke-width", (curve.endWidth * 2.25).toFixed(3));
        path.setAttribute("stroke", penColor);
        path.setAttribute("fill", "none");
        path.setAttribute("stroke-linecap", "round");
        svg.appendChild(path);
      }
    }, (point, { penColor, dotSize, minWidth, maxWidth }) => {
      const circle = document.createElement("circle");
      const size = dotSize > 0 ? dotSize : (minWidth + maxWidth) / 2;
      circle.setAttribute("r", size.toString());
      circle.setAttribute("cx", point.x.toString());
      circle.setAttribute("cy", point.y.toString());
      circle.setAttribute("fill", penColor);
      svg.appendChild(circle);
    });
    return svg.outerHTML;
  }
};

// resources/js/index.js
var js_default = ({
  backgroundColor,
  backgroundColorOnDark,
  disabled,
  dotSize,
  exportBackgroundColor,
  exportPenColor,
  filename,
  maxWidth,
  minDistance,
  minWidth,
  penColor,
  penColorOnDark,
  state,
  throttle: throttle2,
  velocityFilterWeight
}) => ({
  state,
  previousState: state,
  /** @type {SignaturePad} */
  signaturePad: null,
  init() {
    this.signaturePad = new SignaturePad(this.$refs.canvas, {
      backgroundColor,
      dotSize,
      maxWidth,
      minDistance,
      minWidth,
      penColor,
      throttle: throttle2,
      velocityFilterWeight
    });
    if (disabled) {
      this.signaturePad.off();
    }
    this.watchState();
    this.watchResize();
    this.watchTheme();
    if (state.initialValue) {
      this.signaturePad.fromDataURL(state.initialValue);
      this.signaturePad.addEventListener("beginStroke", () => {
        this.signaturePad.clear();
      }, { once: true });
    }
  },
  clear() {
    this.signaturePad.clear();
  },
  undo() {
    const data = this.signaturePad.toData();
    if (data) {
      data.pop();
      this.signaturePad.fromData(data);
    }
  },
  downloadAs(type, extension) {
    const { data: exportedData, canvasBackgroundColor, canvasPenColor } = this.prepareToExport();
    this.signaturePad.fromData(exportedData);
    this.download(
      this.signaturePad.toDataURL(type, { includeBackgroundColor: true }),
      `${filename}.${extension}`
    );
    const { data: restoredData } = this.restoreFromExport(exportedData, canvasBackgroundColor, canvasPenColor);
    this.signaturePad.fromData(restoredData);
  },
  watchState() {
    this.signaturePad.addEventListener("afterUpdateStroke", (e) => {
      const { data: exportedData, canvasBackgroundColor, canvasPenColor } = this.prepareToExport();
      this.signaturePad.fromData(exportedData);
      this.previousState = this.state;
      this.state = this.signaturePad.toDataURL();
      const { data: restoredData } = this.restoreFromExport(exportedData, canvasBackgroundColor, canvasPenColor);
      this.signaturePad.fromData(restoredData);
    }, { once: false });
  },
  watchResize() {
    window.addEventListener("resize", () => this.resizeCanvas);
    this.resizeCanvas();
  },
  /**
   * To correctly handle canvas on low and high DPI screens one has to take devicePixelRatio into account and scale the canvas accordingly.
   */
  resizeCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    this.$refs.canvas.width = this.$refs.canvas.offsetWidth * ratio;
    this.$refs.canvas.height = this.$refs.canvas.offsetHeight * ratio;
    this.$refs.canvas.getContext("2d").scale(ratio, ratio);
    this.signaturePad.clear();
  },
  watchTheme() {
    let theme;
    if (this.$store.hasOwnProperty("theme")) {
      window.addEventListener("theme-changed", (e) => this.onThemeChanged(e.detail));
      theme = this.$store.theme;
    } else {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => this.onThemeChanged(e.matches ? "dark" : "light"));
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    this.onThemeChanged(theme);
  },
  /**
   * Update the signature pad's pen color and background color when the theme changes.
   * @param {'dark'|'light'} theme
   */
  onThemeChanged(theme) {
    this.signaturePad.penColor = theme === "dark" ? penColorOnDark ?? penColor : penColor;
    this.signaturePad.backgroundColor = theme === "dark" ? backgroundColorOnDark ?? backgroundColor : backgroundColor;
    if (!this.signaturePad.toData().length) {
      return;
    }
    const data = this.signaturePad.toData();
    data.map((d) => {
      d.penColor = theme === "dark" ? penColorOnDark ?? penColor : penColor;
      d.backgroundColor = theme === "dark" ? backgroundColorOnDark ?? backgroundColor : backgroundColor;
      return d;
    });
    this.signaturePad.clear();
    this.signaturePad.fromData(data);
  },
  prepareToExport() {
    const data = this.signaturePad.toData();
    const canvasBackgroundColor = this.signaturePad.backgroundColor;
    const canvasPenColor = this.signaturePad.penColor;
    this.signaturePad.backgroundColor = exportBackgroundColor ?? this.signaturePad.backgroundColor;
    data.map((d) => d.penColor = exportPenColor ?? d.penColor);
    return {
      data,
      canvasBackgroundColor,
      canvasPenColor
    };
  },
  restoreFromExport(data, canvasBackgroundColor, canvasPenColor) {
    this.signaturePad.backgroundColor = canvasBackgroundColor;
    data.map((d) => d.penColor = canvasPenColor);
    return {
      data
    };
  },
  download(data, filename2) {
    const link = document.createElement("a");
    link.download = filename2;
    link.href = data;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
});
export {
  js_default as default
};
/*! Bundled license information:

signature_pad/dist/signature_pad.js:
  (*!
   * Signature Pad v4.1.6 | https://github.com/szimek/signature_pad
   * (c) 2023 Szymon Nowak | Released under the MIT license
   *)
*/
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vbm9kZV9tb2R1bGVzL3NpZ25hdHVyZV9wYWQvc3JjL3BvaW50LnRzIiwgIi4uLy4uL25vZGVfbW9kdWxlcy9zaWduYXR1cmVfcGFkL3NyYy9iZXppZXIudHMiLCAiLi4vLi4vbm9kZV9tb2R1bGVzL3NpZ25hdHVyZV9wYWQvc3JjL3NpZ25hdHVyZV9ldmVudF90YXJnZXQudHMiLCAiLi4vLi4vbm9kZV9tb2R1bGVzL3NpZ25hdHVyZV9wYWQvc3JjL3Rocm90dGxlLnRzIiwgIi4uLy4uL25vZGVfbW9kdWxlcy9zaWduYXR1cmVfcGFkL3NyYy9zaWduYXR1cmVfcGFkLnRzIiwgIi4uL2pzL2luZGV4LmpzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyIvLyBJbnRlcmZhY2UgZm9yIHBvaW50IGRhdGEgc3RydWN0dXJlIHVzZWQgZS5nLiBpbiBTaWduYXR1cmVQYWQjZnJvbURhdGEgbWV0aG9kXG5leHBvcnQgaW50ZXJmYWNlIEJhc2ljUG9pbnQge1xuICB4OiBudW1iZXI7XG4gIHk6IG51bWJlcjtcbiAgcHJlc3N1cmU6IG51bWJlcjtcbiAgdGltZTogbnVtYmVyO1xufVxuXG5leHBvcnQgY2xhc3MgUG9pbnQgaW1wbGVtZW50cyBCYXNpY1BvaW50IHtcbiAgcHVibGljIHg6IG51bWJlcjtcbiAgcHVibGljIHk6IG51bWJlcjtcbiAgcHVibGljIHByZXNzdXJlOiBudW1iZXI7XG4gIHB1YmxpYyB0aW1lOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoeDogbnVtYmVyLCB5OiBudW1iZXIsIHByZXNzdXJlPzogbnVtYmVyLCB0aW1lPzogbnVtYmVyKSB7XG4gICAgaWYgKGlzTmFOKHgpIHx8IGlzTmFOKHkpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYFBvaW50IGlzIGludmFsaWQ6ICgke3h9LCAke3l9KWApO1xuICAgIH1cbiAgICB0aGlzLnggPSAreDtcbiAgICB0aGlzLnkgPSAreTtcbiAgICB0aGlzLnByZXNzdXJlID0gcHJlc3N1cmUgfHwgMDtcbiAgICB0aGlzLnRpbWUgPSB0aW1lIHx8IERhdGUubm93KCk7XG4gIH1cblxuICBwdWJsaWMgZGlzdGFuY2VUbyhzdGFydDogQmFzaWNQb2ludCk6IG51bWJlciB7XG4gICAgcmV0dXJuIE1hdGguc3FydChcbiAgICAgIE1hdGgucG93KHRoaXMueCAtIHN0YXJ0LngsIDIpICsgTWF0aC5wb3codGhpcy55IC0gc3RhcnQueSwgMiksXG4gICAgKTtcbiAgfVxuXG4gIHB1YmxpYyBlcXVhbHMob3RoZXI6IEJhc2ljUG9pbnQpOiBib29sZWFuIHtcbiAgICByZXR1cm4gKFxuICAgICAgdGhpcy54ID09PSBvdGhlci54ICYmXG4gICAgICB0aGlzLnkgPT09IG90aGVyLnkgJiZcbiAgICAgIHRoaXMucHJlc3N1cmUgPT09IG90aGVyLnByZXNzdXJlICYmXG4gICAgICB0aGlzLnRpbWUgPT09IG90aGVyLnRpbWVcbiAgICApO1xuICB9XG5cbiAgcHVibGljIHZlbG9jaXR5RnJvbShzdGFydDogQmFzaWNQb2ludCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMudGltZSAhPT0gc3RhcnQudGltZVxuICAgICAgPyB0aGlzLmRpc3RhbmNlVG8oc3RhcnQpIC8gKHRoaXMudGltZSAtIHN0YXJ0LnRpbWUpXG4gICAgICA6IDA7XG4gIH1cbn1cbiIsICJpbXBvcnQgeyBCYXNpY1BvaW50LCBQb2ludCB9IGZyb20gJy4vcG9pbnQnO1xuXG5leHBvcnQgY2xhc3MgQmV6aWVyIHtcbiAgcHVibGljIHN0YXRpYyBmcm9tUG9pbnRzKFxuICAgIHBvaW50czogUG9pbnRbXSxcbiAgICB3aWR0aHM6IHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfSxcbiAgKTogQmV6aWVyIHtcbiAgICBjb25zdCBjMiA9IHRoaXMuY2FsY3VsYXRlQ29udHJvbFBvaW50cyhwb2ludHNbMF0sIHBvaW50c1sxXSwgcG9pbnRzWzJdKS5jMjtcbiAgICBjb25zdCBjMyA9IHRoaXMuY2FsY3VsYXRlQ29udHJvbFBvaW50cyhwb2ludHNbMV0sIHBvaW50c1syXSwgcG9pbnRzWzNdKS5jMTtcblxuICAgIHJldHVybiBuZXcgQmV6aWVyKHBvaW50c1sxXSwgYzIsIGMzLCBwb2ludHNbMl0sIHdpZHRocy5zdGFydCwgd2lkdGhzLmVuZCk7XG4gIH1cblxuICBwcml2YXRlIHN0YXRpYyBjYWxjdWxhdGVDb250cm9sUG9pbnRzKFxuICAgIHMxOiBCYXNpY1BvaW50LFxuICAgIHMyOiBCYXNpY1BvaW50LFxuICAgIHMzOiBCYXNpY1BvaW50LFxuICApOiB7XG4gICAgYzE6IEJhc2ljUG9pbnQ7XG4gICAgYzI6IEJhc2ljUG9pbnQ7XG4gIH0ge1xuICAgIGNvbnN0IGR4MSA9IHMxLnggLSBzMi54O1xuICAgIGNvbnN0IGR5MSA9IHMxLnkgLSBzMi55O1xuICAgIGNvbnN0IGR4MiA9IHMyLnggLSBzMy54O1xuICAgIGNvbnN0IGR5MiA9IHMyLnkgLSBzMy55O1xuXG4gICAgY29uc3QgbTEgPSB7IHg6IChzMS54ICsgczIueCkgLyAyLjAsIHk6IChzMS55ICsgczIueSkgLyAyLjAgfTtcbiAgICBjb25zdCBtMiA9IHsgeDogKHMyLnggKyBzMy54KSAvIDIuMCwgeTogKHMyLnkgKyBzMy55KSAvIDIuMCB9O1xuXG4gICAgY29uc3QgbDEgPSBNYXRoLnNxcnQoZHgxICogZHgxICsgZHkxICogZHkxKTtcbiAgICBjb25zdCBsMiA9IE1hdGguc3FydChkeDIgKiBkeDIgKyBkeTIgKiBkeTIpO1xuXG4gICAgY29uc3QgZHhtID0gbTEueCAtIG0yLng7XG4gICAgY29uc3QgZHltID0gbTEueSAtIG0yLnk7XG5cbiAgICBjb25zdCBrID0gbDIgLyAobDEgKyBsMik7XG4gICAgY29uc3QgY20gPSB7IHg6IG0yLnggKyBkeG0gKiBrLCB5OiBtMi55ICsgZHltICogayB9O1xuXG4gICAgY29uc3QgdHggPSBzMi54IC0gY20ueDtcbiAgICBjb25zdCB0eSA9IHMyLnkgLSBjbS55O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGMxOiBuZXcgUG9pbnQobTEueCArIHR4LCBtMS55ICsgdHkpLFxuICAgICAgYzI6IG5ldyBQb2ludChtMi54ICsgdHgsIG0yLnkgKyB0eSksXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIHB1YmxpYyBzdGFydFBvaW50OiBQb2ludCxcbiAgICBwdWJsaWMgY29udHJvbDI6IEJhc2ljUG9pbnQsXG4gICAgcHVibGljIGNvbnRyb2wxOiBCYXNpY1BvaW50LFxuICAgIHB1YmxpYyBlbmRQb2ludDogUG9pbnQsXG4gICAgcHVibGljIHN0YXJ0V2lkdGg6IG51bWJlcixcbiAgICBwdWJsaWMgZW5kV2lkdGg6IG51bWJlcixcbiAgKSB7fVxuXG4gIC8vIFJldHVybnMgYXBwcm94aW1hdGVkIGxlbmd0aC4gQ29kZSB0YWtlbiBmcm9tIGh0dHBzOi8vd3d3LmxlbW9kYS5uZXQvbWF0aHMvYmV6aWVyLWxlbmd0aC9pbmRleC5odG1sLlxuICBwdWJsaWMgbGVuZ3RoKCk6IG51bWJlciB7XG4gICAgY29uc3Qgc3RlcHMgPSAxMDtcbiAgICBsZXQgbGVuZ3RoID0gMDtcbiAgICBsZXQgcHg7XG4gICAgbGV0IHB5O1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPD0gc3RlcHM7IGkgKz0gMSkge1xuICAgICAgY29uc3QgdCA9IGkgLyBzdGVwcztcbiAgICAgIGNvbnN0IGN4ID0gdGhpcy5wb2ludChcbiAgICAgICAgdCxcbiAgICAgICAgdGhpcy5zdGFydFBvaW50LngsXG4gICAgICAgIHRoaXMuY29udHJvbDEueCxcbiAgICAgICAgdGhpcy5jb250cm9sMi54LFxuICAgICAgICB0aGlzLmVuZFBvaW50LngsXG4gICAgICApO1xuICAgICAgY29uc3QgY3kgPSB0aGlzLnBvaW50KFxuICAgICAgICB0LFxuICAgICAgICB0aGlzLnN0YXJ0UG9pbnQueSxcbiAgICAgICAgdGhpcy5jb250cm9sMS55LFxuICAgICAgICB0aGlzLmNvbnRyb2wyLnksXG4gICAgICAgIHRoaXMuZW5kUG9pbnQueSxcbiAgICAgICk7XG5cbiAgICAgIGlmIChpID4gMCkge1xuICAgICAgICBjb25zdCB4ZGlmZiA9IGN4IC0gKHB4IGFzIG51bWJlcik7XG4gICAgICAgIGNvbnN0IHlkaWZmID0gY3kgLSAocHkgYXMgbnVtYmVyKTtcblxuICAgICAgICBsZW5ndGggKz0gTWF0aC5zcXJ0KHhkaWZmICogeGRpZmYgKyB5ZGlmZiAqIHlkaWZmKTtcbiAgICAgIH1cblxuICAgICAgcHggPSBjeDtcbiAgICAgIHB5ID0gY3k7XG4gICAgfVxuXG4gICAgcmV0dXJuIGxlbmd0aDtcbiAgfVxuXG4gIC8vIENhbGN1bGF0ZSBwYXJhbWV0cmljIHZhbHVlIG9mIHggb3IgeSBnaXZlbiB0IGFuZCB0aGUgZm91ciBwb2ludCBjb29yZGluYXRlcyBvZiBhIGN1YmljIGJlemllciBjdXJ2ZS5cbiAgcHJpdmF0ZSBwb2ludChcbiAgICB0OiBudW1iZXIsXG4gICAgc3RhcnQ6IG51bWJlcixcbiAgICBjMTogbnVtYmVyLFxuICAgIGMyOiBudW1iZXIsXG4gICAgZW5kOiBudW1iZXIsXG4gICk6IG51bWJlciB7XG4gICAgLy8gcHJldHRpZXItaWdub3JlXG4gICAgcmV0dXJuICggICAgICAgc3RhcnQgKiAoMS4wIC0gdCkgKiAoMS4wIC0gdCkgICogKDEuMCAtIHQpKVxuICAgICAgICAgKyAoMy4wICogIGMxICAgICogKDEuMCAtIHQpICogKDEuMCAtIHQpICAqIHQpXG4gICAgICAgICArICgzLjAgKiAgYzIgICAgKiAoMS4wIC0gdCkgKiB0ICAgICAgICAgICogdClcbiAgICAgICAgICsgKCAgICAgICBlbmQgICAqIHQgICAgICAgICAqIHQgICAgICAgICAgKiB0KTtcbiAgfVxufVxuIiwgImV4cG9ydCBjbGFzcyBTaWduYXR1cmVFdmVudFRhcmdldCB7XG4gIC8qIHRzbGludDpkaXNhYmxlOiB2YXJpYWJsZS1uYW1lICovXG4gIHByaXZhdGUgX2V0OiBFdmVudFRhcmdldDtcbiAgLyogdHNsaW50OmVuYWJsZTogdmFyaWFibGUtbmFtZSAqL1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRyeSB7XG4gICAgICB0aGlzLl9ldCA9IG5ldyBFdmVudFRhcmdldCgpO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAvLyBVc2luZyBkb2N1bWVudCBhcyBFdmVudFRhcmdldCB0byBzdXBwb3J0IGlPUyAxMyBhbmQgb2xkZXIuXG4gICAgICAvLyBCZWNhdXNlIEV2ZW50VGFyZ2V0IGNvbnN0cnVjdG9yIGp1c3QgZXhpc3RzIGF0IGlPUyAxNCBhbmQgbGF0ZXIuXG4gICAgICB0aGlzLl9ldCA9IGRvY3VtZW50O1xuICAgIH1cbiAgfVxuXG4gIGFkZEV2ZW50TGlzdGVuZXIoXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIGxpc3RlbmVyOiBFdmVudExpc3RlbmVyT3JFdmVudExpc3RlbmVyT2JqZWN0IHwgbnVsbCxcbiAgICBvcHRpb25zPzogYm9vbGVhbiB8IEFkZEV2ZW50TGlzdGVuZXJPcHRpb25zLFxuICApOiB2b2lkIHtcbiAgICB0aGlzLl9ldC5hZGRFdmVudExpc3RlbmVyKHR5cGUsIGxpc3RlbmVyLCBvcHRpb25zKTtcbiAgfVxuXG4gIGRpc3BhdGNoRXZlbnQoZXZlbnQ6IEV2ZW50KTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2V0LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICB9XG5cbiAgcmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICB0eXBlOiBzdHJpbmcsXG4gICAgY2FsbGJhY2s6IEV2ZW50TGlzdGVuZXJPckV2ZW50TGlzdGVuZXJPYmplY3QgfCBudWxsLFxuICAgIG9wdGlvbnM/OiBib29sZWFuIHwgRXZlbnRMaXN0ZW5lck9wdGlvbnMsXG4gICk6IHZvaWQge1xuICAgIHRoaXMuX2V0LnJlbW92ZUV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIG9wdGlvbnMpO1xuICB9XG59XG4iLCAiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueSwgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXMgKi9cbi8vIFNsaWdodGx5IHNpbXBsaWZpZWQgdmVyc2lvbiBvZiBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yNzA3ODQwMS84MTU1MDdcblxuZXhwb3J0IGZ1bmN0aW9uIHRocm90dGxlKFxuICBmbjogKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnksXG4gIHdhaXQgPSAyNTAsXG4pOiAodGhpczogYW55LCAuLi5hcmdzOiBhbnlbXSkgPT4gYW55IHtcbiAgbGV0IHByZXZpb3VzID0gMDtcbiAgbGV0IHRpbWVvdXQ6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICBsZXQgcmVzdWx0OiBhbnk7XG4gIGxldCBzdG9yZWRDb250ZXh0OiBhbnk7XG4gIGxldCBzdG9yZWRBcmdzOiBhbnlbXTtcblxuICBjb25zdCBsYXRlciA9ICgpOiB2b2lkID0+IHtcbiAgICBwcmV2aW91cyA9IERhdGUubm93KCk7XG4gICAgdGltZW91dCA9IG51bGw7XG4gICAgcmVzdWx0ID0gZm4uYXBwbHkoc3RvcmVkQ29udGV4dCwgc3RvcmVkQXJncyk7XG5cbiAgICBpZiAoIXRpbWVvdXQpIHtcbiAgICAgIHN0b3JlZENvbnRleHQgPSBudWxsO1xuICAgICAgc3RvcmVkQXJncyA9IFtdO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZnVuY3Rpb24gd3JhcHBlcih0aGlzOiBhbnksIC4uLmFyZ3M6IGFueVtdKTogYW55IHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGNvbnN0IHJlbWFpbmluZyA9IHdhaXQgLSAobm93IC0gcHJldmlvdXMpO1xuXG4gICAgc3RvcmVkQ29udGV4dCA9IHRoaXM7XG4gICAgc3RvcmVkQXJncyA9IGFyZ3M7XG5cbiAgICBpZiAocmVtYWluaW5nIDw9IDAgfHwgcmVtYWluaW5nID4gd2FpdCkge1xuICAgICAgaWYgKHRpbWVvdXQpIHtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgICB0aW1lb3V0ID0gbnVsbDtcbiAgICAgIH1cblxuICAgICAgcHJldmlvdXMgPSBub3c7XG4gICAgICByZXN1bHQgPSBmbi5hcHBseShzdG9yZWRDb250ZXh0LCBzdG9yZWRBcmdzKTtcblxuICAgICAgaWYgKCF0aW1lb3V0KSB7XG4gICAgICAgIHN0b3JlZENvbnRleHQgPSBudWxsO1xuICAgICAgICBzdG9yZWRBcmdzID0gW107XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICghdGltZW91dCkge1xuICAgICAgdGltZW91dCA9IHdpbmRvdy5zZXRUaW1lb3V0KGxhdGVyLCByZW1haW5pbmcpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG59XG4iLCAiLyoqXG4gKiBUaGUgbWFpbiBpZGVhIGFuZCBzb21lIHBhcnRzIG9mIHRoZSBjb2RlIChlLmcuIGRyYXdpbmcgdmFyaWFibGUgd2lkdGggQlx1MDBFOXppZXIgY3VydmUpIGFyZSB0YWtlbiBmcm9tOlxuICogaHR0cDovL2Nvcm5lci5zcXVhcmV1cC5jb20vMjAxMi8wNy9zbW9vdGhlci1zaWduYXR1cmVzLmh0bWxcbiAqXG4gKiBJbXBsZW1lbnRhdGlvbiBvZiBpbnRlcnBvbGF0aW9uIHVzaW5nIGN1YmljIEJcdTAwRTl6aWVyIGN1cnZlcyBpcyB0YWtlbiBmcm9tOlxuICogaHR0cHM6Ly93ZWIuYXJjaGl2ZS5vcmcvd2ViLzIwMTYwMzIzMjEzNDMzL2h0dHA6Ly93d3cuYmVua25vd3Njb2RlLmNvbS8yMDEyLzA5L3BhdGgtaW50ZXJwb2xhdGlvbi11c2luZy1jdWJpYy1iZXppZXJfOTc0Mi5odG1sXG4gKlxuICogQWxnb3JpdGhtIGZvciBhcHByb3hpbWF0ZWQgbGVuZ3RoIG9mIGEgQlx1MDBFOXppZXIgY3VydmUgaXMgdGFrZW4gZnJvbTpcbiAqIGh0dHA6Ly93d3cubGVtb2RhLm5ldC9tYXRocy9iZXppZXItbGVuZ3RoL2luZGV4Lmh0bWxcbiAqL1xuXG5pbXBvcnQgeyBCZXppZXIgfSBmcm9tICcuL2Jlemllcic7XG5pbXBvcnQgeyBCYXNpY1BvaW50LCBQb2ludCB9IGZyb20gJy4vcG9pbnQnO1xuaW1wb3J0IHsgU2lnbmF0dXJlRXZlbnRUYXJnZXQgfSBmcm9tICcuL3NpZ25hdHVyZV9ldmVudF90YXJnZXQnO1xuaW1wb3J0IHsgdGhyb3R0bGUgfSBmcm9tICcuL3Rocm90dGxlJztcblxuZGVjbGFyZSBnbG9iYWwge1xuICBpbnRlcmZhY2UgQ1NTU3R5bGVEZWNsYXJhdGlvbiB7XG4gICAgbXNUb3VjaEFjdGlvbjogc3RyaW5nIHwgbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBTaWduYXR1cmVFdmVudCA9IE1vdXNlRXZlbnQgfCBUb3VjaCB8IFBvaW50ZXJFdmVudDtcblxuZXhwb3J0IGludGVyZmFjZSBGcm9tRGF0YU9wdGlvbnMge1xuICBjbGVhcj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVG9TVkdPcHRpb25zIHtcbiAgaW5jbHVkZUJhY2tncm91bmRDb2xvcj86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9pbnRHcm91cE9wdGlvbnMge1xuICBkb3RTaXplOiBudW1iZXI7XG4gIG1pbldpZHRoOiBudW1iZXI7XG4gIG1heFdpZHRoOiBudW1iZXI7XG4gIHBlbkNvbG9yOiBzdHJpbmc7XG4gIHZlbG9jaXR5RmlsdGVyV2VpZ2h0OiBudW1iZXI7XG4gIC8qKlxuICAgKiBUaGlzIGlzIHRoZSBnbG9iYWxDb21wb3NpdGVPcGVyYXRpb24gZm9yIHRoZSBsaW5lLlxuICAgKiAqZGVmYXVsdDogJ3NvdXJjZS1vdmVyJypcbiAgICogQHNlZSBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEL2dsb2JhbENvbXBvc2l0ZU9wZXJhdGlvblxuICAgKi9cbiAgY29tcG9zaXRlT3BlcmF0aW9uOiBHbG9iYWxDb21wb3NpdGVPcGVyYXRpb247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgT3B0aW9ucyBleHRlbmRzIFBhcnRpYWw8UG9pbnRHcm91cE9wdGlvbnM+IHtcbiAgbWluRGlzdGFuY2U/OiBudW1iZXI7XG4gIGJhY2tncm91bmRDb2xvcj86IHN0cmluZztcbiAgdGhyb3R0bGU/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUG9pbnRHcm91cCBleHRlbmRzIFBvaW50R3JvdXBPcHRpb25zIHtcbiAgcG9pbnRzOiBCYXNpY1BvaW50W107XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFNpZ25hdHVyZVBhZCBleHRlbmRzIFNpZ25hdHVyZUV2ZW50VGFyZ2V0IHtcbiAgLy8gUHVibGljIHN0dWZmXG4gIHB1YmxpYyBkb3RTaXplOiBudW1iZXI7XG4gIHB1YmxpYyBtaW5XaWR0aDogbnVtYmVyO1xuICBwdWJsaWMgbWF4V2lkdGg6IG51bWJlcjtcbiAgcHVibGljIHBlbkNvbG9yOiBzdHJpbmc7XG4gIHB1YmxpYyBtaW5EaXN0YW5jZTogbnVtYmVyO1xuICBwdWJsaWMgdmVsb2NpdHlGaWx0ZXJXZWlnaHQ6IG51bWJlcjtcbiAgcHVibGljIGNvbXBvc2l0ZU9wZXJhdGlvbjogR2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uO1xuICBwdWJsaWMgYmFja2dyb3VuZENvbG9yOiBzdHJpbmc7XG4gIHB1YmxpYyB0aHJvdHRsZTogbnVtYmVyO1xuXG4gIC8vIFByaXZhdGUgc3R1ZmZcbiAgLyogdHNsaW50OmRpc2FibGU6IHZhcmlhYmxlLW5hbWUgKi9cbiAgcHJpdmF0ZSBfY3R4OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQ7XG4gIHByaXZhdGUgX2RyYXduaW5nU3Ryb2tlID0gZmFsc2U7XG4gIHByaXZhdGUgX2lzRW1wdHkgPSB0cnVlO1xuICBwcml2YXRlIF9sYXN0UG9pbnRzOiBQb2ludFtdID0gW107IC8vIFN0b3JlcyB1cCB0byA0IG1vc3QgcmVjZW50IHBvaW50czsgdXNlZCB0byBnZW5lcmF0ZSBhIG5ldyBjdXJ2ZVxuICBwcml2YXRlIF9kYXRhOiBQb2ludEdyb3VwW10gPSBbXTsgLy8gU3RvcmVzIGFsbCBwb2ludHMgaW4gZ3JvdXBzIChvbmUgZ3JvdXAgcGVyIGxpbmUgb3IgZG90KVxuICBwcml2YXRlIF9sYXN0VmVsb2NpdHkgPSAwO1xuICBwcml2YXRlIF9sYXN0V2lkdGggPSAwO1xuICBwcml2YXRlIF9zdHJva2VNb3ZlVXBkYXRlOiAoZXZlbnQ6IFNpZ25hdHVyZUV2ZW50KSA9PiB2b2lkO1xuICAvKiB0c2xpbnQ6ZW5hYmxlOiB2YXJpYWJsZS1uYW1lICovXG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50LCBvcHRpb25zOiBPcHRpb25zID0ge30pIHtcbiAgICBzdXBlcigpO1xuICAgIHRoaXMudmVsb2NpdHlGaWx0ZXJXZWlnaHQgPSBvcHRpb25zLnZlbG9jaXR5RmlsdGVyV2VpZ2h0IHx8IDAuNztcbiAgICB0aGlzLm1pbldpZHRoID0gb3B0aW9ucy5taW5XaWR0aCB8fCAwLjU7XG4gICAgdGhpcy5tYXhXaWR0aCA9IG9wdGlvbnMubWF4V2lkdGggfHwgMi41O1xuICAgIHRoaXMudGhyb3R0bGUgPSAoJ3Rocm90dGxlJyBpbiBvcHRpb25zID8gb3B0aW9ucy50aHJvdHRsZSA6IDE2KSBhcyBudW1iZXI7IC8vIGluIG1pbGlzZWNvbmRzc1xuICAgIHRoaXMubWluRGlzdGFuY2UgPSAoXG4gICAgICAnbWluRGlzdGFuY2UnIGluIG9wdGlvbnMgPyBvcHRpb25zLm1pbkRpc3RhbmNlIDogNVxuICAgICkgYXMgbnVtYmVyOyAvLyBpbiBwaXhlbHNcbiAgICB0aGlzLmRvdFNpemUgPSBvcHRpb25zLmRvdFNpemUgfHwgMDtcbiAgICB0aGlzLnBlbkNvbG9yID0gb3B0aW9ucy5wZW5Db2xvciB8fCAnYmxhY2snO1xuICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gb3B0aW9ucy5iYWNrZ3JvdW5kQ29sb3IgfHwgJ3JnYmEoMCwwLDAsMCknO1xuICAgIHRoaXMuY29tcG9zaXRlT3BlcmF0aW9uID0gb3B0aW9ucy5jb21wb3NpdGVPcGVyYXRpb24gfHwgJ3NvdXJjZS1vdmVyJztcblxuICAgIHRoaXMuX3N0cm9rZU1vdmVVcGRhdGUgPSB0aGlzLnRocm90dGxlXG4gICAgICA/IHRocm90dGxlKFNpZ25hdHVyZVBhZC5wcm90b3R5cGUuX3N0cm9rZVVwZGF0ZSwgdGhpcy50aHJvdHRsZSlcbiAgICAgIDogU2lnbmF0dXJlUGFkLnByb3RvdHlwZS5fc3Ryb2tlVXBkYXRlO1xuICAgIHRoaXMuX2N0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpIGFzIENhbnZhc1JlbmRlcmluZ0NvbnRleHQyRDtcblxuICAgIHRoaXMuY2xlYXIoKTtcblxuICAgIC8vIEVuYWJsZSBtb3VzZSBhbmQgdG91Y2ggZXZlbnQgaGFuZGxlcnNcbiAgICB0aGlzLm9uKCk7XG4gIH1cblxuICBwdWJsaWMgY2xlYXIoKTogdm9pZCB7XG4gICAgY29uc3QgeyBfY3R4OiBjdHgsIGNhbnZhcyB9ID0gdGhpcztcblxuICAgIC8vIENsZWFyIGNhbnZhcyB1c2luZyBiYWNrZ3JvdW5kIGNvbG9yXG4gICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuYmFja2dyb3VuZENvbG9yO1xuICAgIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcblxuICAgIHRoaXMuX2RhdGEgPSBbXTtcbiAgICB0aGlzLl9yZXNldCh0aGlzLl9nZXRQb2ludEdyb3VwT3B0aW9ucygpKTtcbiAgICB0aGlzLl9pc0VtcHR5ID0gdHJ1ZTtcbiAgfVxuXG4gIHB1YmxpYyBmcm9tRGF0YVVSTChcbiAgICBkYXRhVXJsOiBzdHJpbmcsXG4gICAgb3B0aW9uczoge1xuICAgICAgcmF0aW8/OiBudW1iZXI7XG4gICAgICB3aWR0aD86IG51bWJlcjtcbiAgICAgIGhlaWdodD86IG51bWJlcjtcbiAgICAgIHhPZmZzZXQ/OiBudW1iZXI7XG4gICAgICB5T2Zmc2V0PzogbnVtYmVyO1xuICAgIH0gPSB7fSxcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IGltYWdlID0gbmV3IEltYWdlKCk7XG4gICAgICBjb25zdCByYXRpbyA9IG9wdGlvbnMucmF0aW8gfHwgd2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMTtcbiAgICAgIGNvbnN0IHdpZHRoID0gb3B0aW9ucy53aWR0aCB8fCB0aGlzLmNhbnZhcy53aWR0aCAvIHJhdGlvO1xuICAgICAgY29uc3QgaGVpZ2h0ID0gb3B0aW9ucy5oZWlnaHQgfHwgdGhpcy5jYW52YXMuaGVpZ2h0IC8gcmF0aW87XG4gICAgICBjb25zdCB4T2Zmc2V0ID0gb3B0aW9ucy54T2Zmc2V0IHx8IDA7XG4gICAgICBjb25zdCB5T2Zmc2V0ID0gb3B0aW9ucy55T2Zmc2V0IHx8IDA7XG5cbiAgICAgIHRoaXMuX3Jlc2V0KHRoaXMuX2dldFBvaW50R3JvdXBPcHRpb25zKCkpO1xuXG4gICAgICBpbWFnZS5vbmxvYWQgPSAoKTogdm9pZCA9PiB7XG4gICAgICAgIHRoaXMuX2N0eC5kcmF3SW1hZ2UoaW1hZ2UsIHhPZmZzZXQsIHlPZmZzZXQsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9O1xuICAgICAgaW1hZ2Uub25lcnJvciA9IChlcnJvcik6IHZvaWQgPT4ge1xuICAgICAgICByZWplY3QoZXJyb3IpO1xuICAgICAgfTtcbiAgICAgIGltYWdlLmNyb3NzT3JpZ2luID0gJ2Fub255bW91cyc7XG4gICAgICBpbWFnZS5zcmMgPSBkYXRhVXJsO1xuXG4gICAgICB0aGlzLl9pc0VtcHR5ID0gZmFsc2U7XG4gICAgfSk7XG4gIH1cblxuICBwdWJsaWMgdG9EYXRhVVJMKFxuICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJyxcbiAgICBlbmNvZGVyT3B0aW9ucz86IFRvU1ZHT3B0aW9ucyxcbiAgKTogc3RyaW5nO1xuICBwdWJsaWMgdG9EYXRhVVJMKHR5cGU/OiBzdHJpbmcsIGVuY29kZXJPcHRpb25zPzogbnVtYmVyKTogc3RyaW5nO1xuICBwdWJsaWMgdG9EYXRhVVJMKFxuICAgIHR5cGUgPSAnaW1hZ2UvcG5nJyxcbiAgICBlbmNvZGVyT3B0aW9ucz86IG51bWJlciB8IFRvU1ZHT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgKTogc3RyaW5nIHtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgJ2ltYWdlL3N2Zyt4bWwnOlxuICAgICAgICBpZiAodHlwZW9mIGVuY29kZXJPcHRpb25zICE9PSAnb2JqZWN0Jykge1xuICAgICAgICAgIGVuY29kZXJPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBgZGF0YTppbWFnZS9zdmcreG1sO2Jhc2U2NCwke2J0b2EoXG4gICAgICAgICAgdGhpcy50b1NWRyhlbmNvZGVyT3B0aW9ucyBhcyBUb1NWR09wdGlvbnMpLFxuICAgICAgICApfWA7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICBpZiAodHlwZW9mIGVuY29kZXJPcHRpb25zICE9PSAnbnVtYmVyJykge1xuICAgICAgICAgIGVuY29kZXJPcHRpb25zID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0aGlzLmNhbnZhcy50b0RhdGFVUkwodHlwZSwgZW5jb2Rlck9wdGlvbnMpO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvbigpOiB2b2lkIHtcbiAgICAvLyBEaXNhYmxlIHBhbm5pbmcvem9vbWluZyB3aGVuIHRvdWNoaW5nIGNhbnZhcyBlbGVtZW50XG4gICAgdGhpcy5jYW52YXMuc3R5bGUudG91Y2hBY3Rpb24gPSAnbm9uZSc7XG4gICAgdGhpcy5jYW52YXMuc3R5bGUubXNUb3VjaEFjdGlvbiA9ICdub25lJztcbiAgICB0aGlzLmNhbnZhcy5zdHlsZS51c2VyU2VsZWN0ID0gJ25vbmUnO1xuXG4gICAgY29uc3QgaXNJT1MgPVxuICAgICAgL01hY2ludG9zaC8udGVzdChuYXZpZ2F0b3IudXNlckFnZW50KSAmJiAnb250b3VjaHN0YXJ0JyBpbiBkb2N1bWVudDtcblxuICAgIC8vIFRoZSBcIlNjcmliYmxlXCIgZmVhdHVyZSBvZiBpT1MgaW50ZXJjZXB0cyBwb2ludCBldmVudHMuIFNvIHRoYXQgd2UgY2FuIGxvc2Ugc29tZSBvZiB0aGVtIHdoZW4gdGFwcGluZyByYXBpZGx5LlxuICAgIC8vIFVzZSB0b3VjaCBldmVudHMgZm9yIGlPUyBwbGF0Zm9ybXMgdG8gcHJldmVudCBpdC4gU2VlIGh0dHBzOi8vZGV2ZWxvcGVyLmFwcGxlLmNvbS9mb3J1bXMvdGhyZWFkLzY2NDEwOCBmb3IgbW9yZSBpbmZvcm1hdGlvbi5cbiAgICBpZiAod2luZG93LlBvaW50ZXJFdmVudCAmJiAhaXNJT1MpIHtcbiAgICAgIHRoaXMuX2hhbmRsZVBvaW50ZXJFdmVudHMoKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5faGFuZGxlTW91c2VFdmVudHMoKTtcblxuICAgICAgaWYgKCdvbnRvdWNoc3RhcnQnIGluIHdpbmRvdykge1xuICAgICAgICB0aGlzLl9oYW5kbGVUb3VjaEV2ZW50cygpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyBvZmYoKTogdm9pZCB7XG4gICAgLy8gRW5hYmxlIHBhbm5pbmcvem9vbWluZyB3aGVuIHRvdWNoaW5nIGNhbnZhcyBlbGVtZW50XG4gICAgdGhpcy5jYW52YXMuc3R5bGUudG91Y2hBY3Rpb24gPSAnYXV0byc7XG4gICAgdGhpcy5jYW52YXMuc3R5bGUubXNUb3VjaEFjdGlvbiA9ICdhdXRvJztcbiAgICB0aGlzLmNhbnZhcy5zdHlsZS51c2VyU2VsZWN0ID0gJ2F1dG8nO1xuXG4gICAgdGhpcy5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCB0aGlzLl9oYW5kbGVQb2ludGVyU3RhcnQpO1xuICAgIHRoaXMuY2FudmFzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJtb3ZlJywgdGhpcy5faGFuZGxlUG9pbnRlck1vdmUpO1xuICAgIHRoaXMuY2FudmFzLm93bmVyRG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICdwb2ludGVydXAnLFxuICAgICAgdGhpcy5faGFuZGxlUG9pbnRlckVuZCxcbiAgICApO1xuXG4gICAgdGhpcy5jYW52YXMucmVtb3ZlRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5faGFuZGxlTW91c2VEb3duKTtcbiAgICB0aGlzLmNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9oYW5kbGVNb3VzZU1vdmUpO1xuICAgIHRoaXMuY2FudmFzLm93bmVyRG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcbiAgICAgICdtb3VzZXVwJyxcbiAgICAgIHRoaXMuX2hhbmRsZU1vdXNlVXAsXG4gICAgKTtcblxuICAgIHRoaXMuY2FudmFzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCB0aGlzLl9oYW5kbGVUb3VjaFN0YXJ0KTtcbiAgICB0aGlzLmNhbnZhcy5yZW1vdmVFdmVudExpc3RlbmVyKCd0b3VjaG1vdmUnLCB0aGlzLl9oYW5kbGVUb3VjaE1vdmUpO1xuICAgIHRoaXMuY2FudmFzLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgdGhpcy5faGFuZGxlVG91Y2hFbmQpO1xuICB9XG5cbiAgcHVibGljIGlzRW1wdHkoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRW1wdHk7XG4gIH1cblxuICBwdWJsaWMgZnJvbURhdGEoXG4gICAgcG9pbnRHcm91cHM6IFBvaW50R3JvdXBbXSxcbiAgICB7IGNsZWFyID0gdHJ1ZSB9OiBGcm9tRGF0YU9wdGlvbnMgPSB7fSxcbiAgKTogdm9pZCB7XG4gICAgaWYgKGNsZWFyKSB7XG4gICAgICB0aGlzLmNsZWFyKCk7XG4gICAgfVxuXG4gICAgdGhpcy5fZnJvbURhdGEoXG4gICAgICBwb2ludEdyb3VwcyxcbiAgICAgIHRoaXMuX2RyYXdDdXJ2ZS5iaW5kKHRoaXMpLFxuICAgICAgdGhpcy5fZHJhd0RvdC5iaW5kKHRoaXMpLFxuICAgICk7XG5cbiAgICB0aGlzLl9kYXRhID0gdGhpcy5fZGF0YS5jb25jYXQocG9pbnRHcm91cHMpO1xuICB9XG5cbiAgcHVibGljIHRvRGF0YSgpOiBQb2ludEdyb3VwW10ge1xuICAgIHJldHVybiB0aGlzLl9kYXRhO1xuICB9XG5cbiAgLy8gRXZlbnQgaGFuZGxlcnNcbiAgcHJpdmF0ZSBfaGFuZGxlTW91c2VEb3duID0gKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgaWYgKGV2ZW50LmJ1dHRvbnMgPT09IDEpIHtcbiAgICAgIHRoaXMuX2RyYXduaW5nU3Ryb2tlID0gdHJ1ZTtcbiAgICAgIHRoaXMuX3N0cm9rZUJlZ2luKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlTW91c2VNb3ZlID0gKGV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCA9PiB7XG4gICAgaWYgKHRoaXMuX2RyYXduaW5nU3Ryb2tlKSB7XG4gICAgICB0aGlzLl9zdHJva2VNb3ZlVXBkYXRlKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlTW91c2VVcCA9IChldmVudDogTW91c2VFdmVudCk6IHZvaWQgPT4ge1xuICAgIGlmIChldmVudC5idXR0b25zID09PSAxICYmIHRoaXMuX2RyYXduaW5nU3Ryb2tlKSB7XG4gICAgICB0aGlzLl9kcmF3bmluZ1N0cm9rZSA9IGZhbHNlO1xuICAgICAgdGhpcy5fc3Ryb2tlRW5kKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlVG91Y2hTdGFydCA9IChldmVudDogVG91Y2hFdmVudCk6IHZvaWQgPT4ge1xuICAgIC8vIFByZXZlbnQgc2Nyb2xsaW5nLlxuICAgIGlmIChldmVudC5jYW5jZWxhYmxlKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cblxuICAgIGlmIChldmVudC50YXJnZXRUb3VjaGVzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgY29uc3QgdG91Y2ggPSBldmVudC5jaGFuZ2VkVG91Y2hlc1swXTtcbiAgICAgIHRoaXMuX3N0cm9rZUJlZ2luKHRvdWNoKTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlVG91Y2hNb3ZlID0gKGV2ZW50OiBUb3VjaEV2ZW50KTogdm9pZCA9PiB7XG4gICAgLy8gUHJldmVudCBzY3JvbGxpbmcuXG4gICAgaWYgKGV2ZW50LmNhbmNlbGFibGUpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgfVxuXG4gICAgY29uc3QgdG91Y2ggPSBldmVudC50YXJnZXRUb3VjaGVzWzBdO1xuICAgIHRoaXMuX3N0cm9rZU1vdmVVcGRhdGUodG91Y2gpO1xuICB9O1xuXG4gIHByaXZhdGUgX2hhbmRsZVRvdWNoRW5kID0gKGV2ZW50OiBUb3VjaEV2ZW50KTogdm9pZCA9PiB7XG4gICAgY29uc3Qgd2FzQ2FudmFzVG91Y2hlZCA9IGV2ZW50LnRhcmdldCA9PT0gdGhpcy5jYW52YXM7XG4gICAgaWYgKHdhc0NhbnZhc1RvdWNoZWQpIHtcbiAgICAgIGlmIChldmVudC5jYW5jZWxhYmxlKSB7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB9XG4gICAgICBjb25zdCB0b3VjaCA9IGV2ZW50LmNoYW5nZWRUb3VjaGVzWzBdO1xuICAgICAgdGhpcy5fc3Ryb2tlRW5kKHRvdWNoKTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlUG9pbnRlclN0YXJ0ID0gKGV2ZW50OiBQb2ludGVyRXZlbnQpOiB2b2lkID0+IHtcbiAgICB0aGlzLl9kcmF3bmluZ1N0cm9rZSA9IHRydWU7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0aGlzLl9zdHJva2VCZWdpbihldmVudCk7XG4gIH07XG5cbiAgcHJpdmF0ZSBfaGFuZGxlUG9pbnRlck1vdmUgPSAoZXZlbnQ6IFBvaW50ZXJFdmVudCk6IHZvaWQgPT4ge1xuICAgIGlmICh0aGlzLl9kcmF3bmluZ1N0cm9rZSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIHRoaXMuX3N0cm9rZU1vdmVVcGRhdGUoZXZlbnQpO1xuICAgIH1cbiAgfTtcblxuICBwcml2YXRlIF9oYW5kbGVQb2ludGVyRW5kID0gKGV2ZW50OiBQb2ludGVyRXZlbnQpOiB2b2lkID0+IHtcbiAgICBpZiAodGhpcy5fZHJhd25pbmdTdHJva2UpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0aGlzLl9kcmF3bmluZ1N0cm9rZSA9IGZhbHNlO1xuICAgICAgdGhpcy5fc3Ryb2tlRW5kKGV2ZW50KTtcbiAgICB9XG4gIH07XG5cbiAgcHJpdmF0ZSBfZ2V0UG9pbnRHcm91cE9wdGlvbnMoZ3JvdXA/OiBQb2ludEdyb3VwKTogUG9pbnRHcm91cE9wdGlvbnMge1xuICAgIHJldHVybiB7XG4gICAgICBwZW5Db2xvcjogZ3JvdXAgJiYgJ3BlbkNvbG9yJyBpbiBncm91cCA/IGdyb3VwLnBlbkNvbG9yIDogdGhpcy5wZW5Db2xvcixcbiAgICAgIGRvdFNpemU6IGdyb3VwICYmICdkb3RTaXplJyBpbiBncm91cCA/IGdyb3VwLmRvdFNpemUgOiB0aGlzLmRvdFNpemUsXG4gICAgICBtaW5XaWR0aDogZ3JvdXAgJiYgJ21pbldpZHRoJyBpbiBncm91cCA/IGdyb3VwLm1pbldpZHRoIDogdGhpcy5taW5XaWR0aCxcbiAgICAgIG1heFdpZHRoOiBncm91cCAmJiAnbWF4V2lkdGgnIGluIGdyb3VwID8gZ3JvdXAubWF4V2lkdGggOiB0aGlzLm1heFdpZHRoLFxuICAgICAgdmVsb2NpdHlGaWx0ZXJXZWlnaHQ6XG4gICAgICAgIGdyb3VwICYmICd2ZWxvY2l0eUZpbHRlcldlaWdodCcgaW4gZ3JvdXBcbiAgICAgICAgICA/IGdyb3VwLnZlbG9jaXR5RmlsdGVyV2VpZ2h0XG4gICAgICAgICAgOiB0aGlzLnZlbG9jaXR5RmlsdGVyV2VpZ2h0LFxuICAgICAgY29tcG9zaXRlT3BlcmF0aW9uOlxuICAgICAgICBncm91cCAmJiAnY29tcG9zaXRlT3BlcmF0aW9uJyBpbiBncm91cFxuICAgICAgICAgID8gZ3JvdXAuY29tcG9zaXRlT3BlcmF0aW9uXG4gICAgICAgICAgOiB0aGlzLmNvbXBvc2l0ZU9wZXJhdGlvbixcbiAgICB9O1xuICB9XG5cbiAgLy8gUHJpdmF0ZSBtZXRob2RzXG4gIHByaXZhdGUgX3N0cm9rZUJlZ2luKGV2ZW50OiBTaWduYXR1cmVFdmVudCk6IHZvaWQge1xuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2JlZ2luU3Ryb2tlJywgeyBkZXRhaWw6IGV2ZW50IH0pKTtcblxuICAgIGNvbnN0IHBvaW50R3JvdXBPcHRpb25zID0gdGhpcy5fZ2V0UG9pbnRHcm91cE9wdGlvbnMoKTtcblxuICAgIGNvbnN0IG5ld1BvaW50R3JvdXA6IFBvaW50R3JvdXAgPSB7XG4gICAgICAuLi5wb2ludEdyb3VwT3B0aW9ucyxcbiAgICAgIHBvaW50czogW10sXG4gICAgfTtcblxuICAgIHRoaXMuX2RhdGEucHVzaChuZXdQb2ludEdyb3VwKTtcbiAgICB0aGlzLl9yZXNldChwb2ludEdyb3VwT3B0aW9ucyk7XG4gICAgdGhpcy5fc3Ryb2tlVXBkYXRlKGV2ZW50KTtcbiAgfVxuXG4gIHByaXZhdGUgX3N0cm9rZVVwZGF0ZShldmVudDogU2lnbmF0dXJlRXZlbnQpOiB2b2lkIHtcbiAgICBpZiAodGhpcy5fZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIFRoaXMgY2FuIGhhcHBlbiBpZiBjbGVhcigpIHdhcyBjYWxsZWQgd2hpbGUgYSBzaWduYXR1cmUgaXMgc3RpbGwgaW4gcHJvZ3Jlc3MsXG4gICAgICAvLyBvciBpZiB0aGVyZSBpcyBhIHJhY2UgY29uZGl0aW9uIGJldHdlZW4gc3RhcnQvdXBkYXRlIGV2ZW50cy5cbiAgICAgIHRoaXMuX3N0cm9rZUJlZ2luKGV2ZW50KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQoXG4gICAgICBuZXcgQ3VzdG9tRXZlbnQoJ2JlZm9yZVVwZGF0ZVN0cm9rZScsIHsgZGV0YWlsOiBldmVudCB9KSxcbiAgICApO1xuXG4gICAgY29uc3QgeCA9IGV2ZW50LmNsaWVudFg7XG4gICAgY29uc3QgeSA9IGV2ZW50LmNsaWVudFk7XG4gICAgY29uc3QgcHJlc3N1cmUgPVxuICAgICAgKGV2ZW50IGFzIFBvaW50ZXJFdmVudCkucHJlc3N1cmUgIT09IHVuZGVmaW5lZFxuICAgICAgICA/IChldmVudCBhcyBQb2ludGVyRXZlbnQpLnByZXNzdXJlXG4gICAgICAgIDogKGV2ZW50IGFzIFRvdWNoKS5mb3JjZSAhPT0gdW5kZWZpbmVkXG4gICAgICAgICAgPyAoZXZlbnQgYXMgVG91Y2gpLmZvcmNlXG4gICAgICAgICAgOiAwO1xuXG4gICAgY29uc3QgcG9pbnQgPSB0aGlzLl9jcmVhdGVQb2ludCh4LCB5LCBwcmVzc3VyZSk7XG4gICAgY29uc3QgbGFzdFBvaW50R3JvdXAgPSB0aGlzLl9kYXRhW3RoaXMuX2RhdGEubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgbGFzdFBvaW50cyA9IGxhc3RQb2ludEdyb3VwLnBvaW50cztcbiAgICBjb25zdCBsYXN0UG9pbnQgPVxuICAgICAgbGFzdFBvaW50cy5sZW5ndGggPiAwICYmIGxhc3RQb2ludHNbbGFzdFBvaW50cy5sZW5ndGggLSAxXTtcbiAgICBjb25zdCBpc0xhc3RQb2ludFRvb0Nsb3NlID0gbGFzdFBvaW50XG4gICAgICA/IHBvaW50LmRpc3RhbmNlVG8obGFzdFBvaW50KSA8PSB0aGlzLm1pbkRpc3RhbmNlXG4gICAgICA6IGZhbHNlO1xuICAgIGNvbnN0IHBvaW50R3JvdXBPcHRpb25zID0gdGhpcy5fZ2V0UG9pbnRHcm91cE9wdGlvbnMobGFzdFBvaW50R3JvdXApO1xuXG4gICAgLy8gU2tpcCB0aGlzIHBvaW50IGlmIGl0J3MgdG9vIGNsb3NlIHRvIHRoZSBwcmV2aW91cyBvbmVcbiAgICBpZiAoIWxhc3RQb2ludCB8fCAhKGxhc3RQb2ludCAmJiBpc0xhc3RQb2ludFRvb0Nsb3NlKSkge1xuICAgICAgY29uc3QgY3VydmUgPSB0aGlzLl9hZGRQb2ludChwb2ludCwgcG9pbnRHcm91cE9wdGlvbnMpO1xuXG4gICAgICBpZiAoIWxhc3RQb2ludCkge1xuICAgICAgICB0aGlzLl9kcmF3RG90KHBvaW50LCBwb2ludEdyb3VwT3B0aW9ucyk7XG4gICAgICB9IGVsc2UgaWYgKGN1cnZlKSB7XG4gICAgICAgIHRoaXMuX2RyYXdDdXJ2ZShjdXJ2ZSwgcG9pbnRHcm91cE9wdGlvbnMpO1xuICAgICAgfVxuXG4gICAgICBsYXN0UG9pbnRzLnB1c2goe1xuICAgICAgICB0aW1lOiBwb2ludC50aW1lLFxuICAgICAgICB4OiBwb2ludC54LFxuICAgICAgICB5OiBwb2ludC55LFxuICAgICAgICBwcmVzc3VyZTogcG9pbnQucHJlc3N1cmUsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICB0aGlzLmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdhZnRlclVwZGF0ZVN0cm9rZScsIHsgZGV0YWlsOiBldmVudCB9KSk7XG4gIH1cblxuICBwcml2YXRlIF9zdHJva2VFbmQoZXZlbnQ6IFNpZ25hdHVyZUV2ZW50KTogdm9pZCB7XG4gICAgdGhpcy5fc3Ryb2tlVXBkYXRlKGV2ZW50KTtcblxuICAgIHRoaXMuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2VuZFN0cm9rZScsIHsgZGV0YWlsOiBldmVudCB9KSk7XG4gIH1cblxuICBwcml2YXRlIF9oYW5kbGVQb2ludGVyRXZlbnRzKCk6IHZvaWQge1xuICAgIHRoaXMuX2RyYXduaW5nU3Ryb2tlID0gZmFsc2U7XG5cbiAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVyZG93bicsIHRoaXMuX2hhbmRsZVBvaW50ZXJTdGFydCk7XG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcm1vdmUnLCB0aGlzLl9oYW5kbGVQb2ludGVyTW92ZSk7XG4gICAgdGhpcy5jYW52YXMub3duZXJEb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFxuICAgICAgJ3BvaW50ZXJ1cCcsXG4gICAgICB0aGlzLl9oYW5kbGVQb2ludGVyRW5kLFxuICAgICk7XG4gIH1cblxuICBwcml2YXRlIF9oYW5kbGVNb3VzZUV2ZW50cygpOiB2b2lkIHtcbiAgICB0aGlzLl9kcmF3bmluZ1N0cm9rZSA9IGZhbHNlO1xuXG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgdGhpcy5faGFuZGxlTW91c2VEb3duKTtcbiAgICB0aGlzLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKCdtb3VzZW1vdmUnLCB0aGlzLl9oYW5kbGVNb3VzZU1vdmUpO1xuICAgIHRoaXMuY2FudmFzLm93bmVyRG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIHRoaXMuX2hhbmRsZU1vdXNlVXApO1xuICB9XG5cbiAgcHJpdmF0ZSBfaGFuZGxlVG91Y2hFdmVudHMoKTogdm9pZCB7XG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIHRoaXMuX2hhbmRsZVRvdWNoU3RhcnQpO1xuICAgIHRoaXMuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIHRoaXMuX2hhbmRsZVRvdWNoTW92ZSk7XG4gICAgdGhpcy5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hlbmQnLCB0aGlzLl9oYW5kbGVUb3VjaEVuZCk7XG4gIH1cblxuICAvLyBDYWxsZWQgd2hlbiBhIG5ldyBsaW5lIGlzIHN0YXJ0ZWRcbiAgcHJpdmF0ZSBfcmVzZXQob3B0aW9uczogUG9pbnRHcm91cE9wdGlvbnMpOiB2b2lkIHtcbiAgICB0aGlzLl9sYXN0UG9pbnRzID0gW107XG4gICAgdGhpcy5fbGFzdFZlbG9jaXR5ID0gMDtcbiAgICB0aGlzLl9sYXN0V2lkdGggPSAob3B0aW9ucy5taW5XaWR0aCArIG9wdGlvbnMubWF4V2lkdGgpIC8gMjtcbiAgICB0aGlzLl9jdHguZmlsbFN0eWxlID0gb3B0aW9ucy5wZW5Db2xvcjtcbiAgICB0aGlzLl9jdHguZ2xvYmFsQ29tcG9zaXRlT3BlcmF0aW9uID0gb3B0aW9ucy5jb21wb3NpdGVPcGVyYXRpb247XG4gIH1cblxuICBwcml2YXRlIF9jcmVhdGVQb2ludCh4OiBudW1iZXIsIHk6IG51bWJlciwgcHJlc3N1cmU6IG51bWJlcik6IFBvaW50IHtcbiAgICBjb25zdCByZWN0ID0gdGhpcy5jYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG5cbiAgICByZXR1cm4gbmV3IFBvaW50KFxuICAgICAgeCAtIHJlY3QubGVmdCxcbiAgICAgIHkgLSByZWN0LnRvcCxcbiAgICAgIHByZXNzdXJlLFxuICAgICAgbmV3IERhdGUoKS5nZXRUaW1lKCksXG4gICAgKTtcbiAgfVxuXG4gIC8vIEFkZCBwb2ludCB0byBfbGFzdFBvaW50cyBhcnJheSBhbmQgZ2VuZXJhdGUgYSBuZXcgY3VydmUgaWYgdGhlcmUgYXJlIGVub3VnaCBwb2ludHMgKGkuZS4gMylcbiAgcHJpdmF0ZSBfYWRkUG9pbnQocG9pbnQ6IFBvaW50LCBvcHRpb25zOiBQb2ludEdyb3VwT3B0aW9ucyk6IEJlemllciB8IG51bGwge1xuICAgIGNvbnN0IHsgX2xhc3RQb2ludHMgfSA9IHRoaXM7XG5cbiAgICBfbGFzdFBvaW50cy5wdXNoKHBvaW50KTtcblxuICAgIGlmIChfbGFzdFBvaW50cy5sZW5ndGggPiAyKSB7XG4gICAgICAvLyBUbyByZWR1Y2UgdGhlIGluaXRpYWwgbGFnIG1ha2UgaXQgd29yayB3aXRoIDMgcG9pbnRzXG4gICAgICAvLyBieSBjb3B5aW5nIHRoZSBmaXJzdCBwb2ludCB0byB0aGUgYmVnaW5uaW5nLlxuICAgICAgaWYgKF9sYXN0UG9pbnRzLmxlbmd0aCA9PT0gMykge1xuICAgICAgICBfbGFzdFBvaW50cy51bnNoaWZ0KF9sYXN0UG9pbnRzWzBdKTtcbiAgICAgIH1cblxuICAgICAgLy8gX3BvaW50cyBhcnJheSB3aWxsIGFsd2F5cyBoYXZlIDQgcG9pbnRzIGhlcmUuXG4gICAgICBjb25zdCB3aWR0aHMgPSB0aGlzLl9jYWxjdWxhdGVDdXJ2ZVdpZHRocyhcbiAgICAgICAgX2xhc3RQb2ludHNbMV0sXG4gICAgICAgIF9sYXN0UG9pbnRzWzJdLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGN1cnZlID0gQmV6aWVyLmZyb21Qb2ludHMoX2xhc3RQb2ludHMsIHdpZHRocyk7XG5cbiAgICAgIC8vIFJlbW92ZSB0aGUgZmlyc3QgZWxlbWVudCBmcm9tIHRoZSBsaXN0LCBzbyB0aGF0IHRoZXJlIGFyZSBubyBtb3JlIHRoYW4gNCBwb2ludHMgYXQgYW55IHRpbWUuXG4gICAgICBfbGFzdFBvaW50cy5zaGlmdCgpO1xuXG4gICAgICByZXR1cm4gY3VydmU7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIF9jYWxjdWxhdGVDdXJ2ZVdpZHRocyhcbiAgICBzdGFydFBvaW50OiBQb2ludCxcbiAgICBlbmRQb2ludDogUG9pbnQsXG4gICAgb3B0aW9uczogUG9pbnRHcm91cE9wdGlvbnMsXG4gICk6IHsgc3RhcnQ6IG51bWJlcjsgZW5kOiBudW1iZXIgfSB7XG4gICAgY29uc3QgdmVsb2NpdHkgPVxuICAgICAgb3B0aW9ucy52ZWxvY2l0eUZpbHRlcldlaWdodCAqIGVuZFBvaW50LnZlbG9jaXR5RnJvbShzdGFydFBvaW50KSArXG4gICAgICAoMSAtIG9wdGlvbnMudmVsb2NpdHlGaWx0ZXJXZWlnaHQpICogdGhpcy5fbGFzdFZlbG9jaXR5O1xuXG4gICAgY29uc3QgbmV3V2lkdGggPSB0aGlzLl9zdHJva2VXaWR0aCh2ZWxvY2l0eSwgb3B0aW9ucyk7XG5cbiAgICBjb25zdCB3aWR0aHMgPSB7XG4gICAgICBlbmQ6IG5ld1dpZHRoLFxuICAgICAgc3RhcnQ6IHRoaXMuX2xhc3RXaWR0aCxcbiAgICB9O1xuXG4gICAgdGhpcy5fbGFzdFZlbG9jaXR5ID0gdmVsb2NpdHk7XG4gICAgdGhpcy5fbGFzdFdpZHRoID0gbmV3V2lkdGg7XG5cbiAgICByZXR1cm4gd2lkdGhzO1xuICB9XG5cbiAgcHJpdmF0ZSBfc3Ryb2tlV2lkdGgodmVsb2NpdHk6IG51bWJlciwgb3B0aW9uczogUG9pbnRHcm91cE9wdGlvbnMpOiBudW1iZXIge1xuICAgIHJldHVybiBNYXRoLm1heChvcHRpb25zLm1heFdpZHRoIC8gKHZlbG9jaXR5ICsgMSksIG9wdGlvbnMubWluV2lkdGgpO1xuICB9XG5cbiAgcHJpdmF0ZSBfZHJhd0N1cnZlU2VnbWVudCh4OiBudW1iZXIsIHk6IG51bWJlciwgd2lkdGg6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuX2N0eDtcblxuICAgIGN0eC5tb3ZlVG8oeCwgeSk7XG4gICAgY3R4LmFyYyh4LCB5LCB3aWR0aCwgMCwgMiAqIE1hdGguUEksIGZhbHNlKTtcbiAgICB0aGlzLl9pc0VtcHR5ID0gZmFsc2U7XG4gIH1cblxuICBwcml2YXRlIF9kcmF3Q3VydmUoY3VydmU6IEJlemllciwgb3B0aW9uczogUG9pbnRHcm91cE9wdGlvbnMpOiB2b2lkIHtcbiAgICBjb25zdCBjdHggPSB0aGlzLl9jdHg7XG4gICAgY29uc3Qgd2lkdGhEZWx0YSA9IGN1cnZlLmVuZFdpZHRoIC0gY3VydmUuc3RhcnRXaWR0aDtcbiAgICAvLyAnMicgaXMganVzdCBhbiBhcmJpdHJhcnkgbnVtYmVyIGhlcmUuIElmIG9ubHkgbGVuZ3RoIGlzIHVzZWQsIHRoZW5cbiAgICAvLyB0aGVyZSBhcmUgZ2FwcyBiZXR3ZWVuIGN1cnZlIHNlZ21lbnRzIDovXG4gICAgY29uc3QgZHJhd1N0ZXBzID0gTWF0aC5jZWlsKGN1cnZlLmxlbmd0aCgpKSAqIDI7XG5cbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgY3R4LmZpbGxTdHlsZSA9IG9wdGlvbnMucGVuQ29sb3I7XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRyYXdTdGVwczsgaSArPSAxKSB7XG4gICAgICAvLyBDYWxjdWxhdGUgdGhlIEJlemllciAoeCwgeSkgY29vcmRpbmF0ZSBmb3IgdGhpcyBzdGVwLlxuICAgICAgY29uc3QgdCA9IGkgLyBkcmF3U3RlcHM7XG4gICAgICBjb25zdCB0dCA9IHQgKiB0O1xuICAgICAgY29uc3QgdHR0ID0gdHQgKiB0O1xuICAgICAgY29uc3QgdSA9IDEgLSB0O1xuICAgICAgY29uc3QgdXUgPSB1ICogdTtcbiAgICAgIGNvbnN0IHV1dSA9IHV1ICogdTtcblxuICAgICAgbGV0IHggPSB1dXUgKiBjdXJ2ZS5zdGFydFBvaW50Lng7XG4gICAgICB4ICs9IDMgKiB1dSAqIHQgKiBjdXJ2ZS5jb250cm9sMS54O1xuICAgICAgeCArPSAzICogdSAqIHR0ICogY3VydmUuY29udHJvbDIueDtcbiAgICAgIHggKz0gdHR0ICogY3VydmUuZW5kUG9pbnQueDtcblxuICAgICAgbGV0IHkgPSB1dXUgKiBjdXJ2ZS5zdGFydFBvaW50Lnk7XG4gICAgICB5ICs9IDMgKiB1dSAqIHQgKiBjdXJ2ZS5jb250cm9sMS55O1xuICAgICAgeSArPSAzICogdSAqIHR0ICogY3VydmUuY29udHJvbDIueTtcbiAgICAgIHkgKz0gdHR0ICogY3VydmUuZW5kUG9pbnQueTtcblxuICAgICAgY29uc3Qgd2lkdGggPSBNYXRoLm1pbihcbiAgICAgICAgY3VydmUuc3RhcnRXaWR0aCArIHR0dCAqIHdpZHRoRGVsdGEsXG4gICAgICAgIG9wdGlvbnMubWF4V2lkdGgsXG4gICAgICApO1xuICAgICAgdGhpcy5fZHJhd0N1cnZlU2VnbWVudCh4LCB5LCB3aWR0aCk7XG4gICAgfVxuXG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5maWxsKCk7XG4gIH1cblxuICBwcml2YXRlIF9kcmF3RG90KHBvaW50OiBCYXNpY1BvaW50LCBvcHRpb25zOiBQb2ludEdyb3VwT3B0aW9ucyk6IHZvaWQge1xuICAgIGNvbnN0IGN0eCA9IHRoaXMuX2N0eDtcbiAgICBjb25zdCB3aWR0aCA9XG4gICAgICBvcHRpb25zLmRvdFNpemUgPiAwXG4gICAgICAgID8gb3B0aW9ucy5kb3RTaXplXG4gICAgICAgIDogKG9wdGlvbnMubWluV2lkdGggKyBvcHRpb25zLm1heFdpZHRoKSAvIDI7XG5cbiAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgdGhpcy5fZHJhd0N1cnZlU2VnbWVudChwb2ludC54LCBwb2ludC55LCB3aWR0aCk7XG4gICAgY3R4LmNsb3NlUGF0aCgpO1xuICAgIGN0eC5maWxsU3R5bGUgPSBvcHRpb25zLnBlbkNvbG9yO1xuICAgIGN0eC5maWxsKCk7XG4gIH1cblxuICBwcml2YXRlIF9mcm9tRGF0YShcbiAgICBwb2ludEdyb3VwczogUG9pbnRHcm91cFtdLFxuICAgIGRyYXdDdXJ2ZTogU2lnbmF0dXJlUGFkWydfZHJhd0N1cnZlJ10sXG4gICAgZHJhd0RvdDogU2lnbmF0dXJlUGFkWydfZHJhd0RvdCddLFxuICApOiB2b2lkIHtcbiAgICBmb3IgKGNvbnN0IGdyb3VwIG9mIHBvaW50R3JvdXBzKSB7XG4gICAgICBjb25zdCB7IHBvaW50cyB9ID0gZ3JvdXA7XG4gICAgICBjb25zdCBwb2ludEdyb3VwT3B0aW9ucyA9IHRoaXMuX2dldFBvaW50R3JvdXBPcHRpb25zKGdyb3VwKTtcblxuICAgICAgaWYgKHBvaW50cy5sZW5ndGggPiAxKSB7XG4gICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcG9pbnRzLmxlbmd0aDsgaiArPSAxKSB7XG4gICAgICAgICAgY29uc3QgYmFzaWNQb2ludCA9IHBvaW50c1tqXTtcbiAgICAgICAgICBjb25zdCBwb2ludCA9IG5ldyBQb2ludChcbiAgICAgICAgICAgIGJhc2ljUG9pbnQueCxcbiAgICAgICAgICAgIGJhc2ljUG9pbnQueSxcbiAgICAgICAgICAgIGJhc2ljUG9pbnQucHJlc3N1cmUsXG4gICAgICAgICAgICBiYXNpY1BvaW50LnRpbWUsXG4gICAgICAgICAgKTtcblxuICAgICAgICAgIGlmIChqID09PSAwKSB7XG4gICAgICAgICAgICB0aGlzLl9yZXNldChwb2ludEdyb3VwT3B0aW9ucyk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgY29uc3QgY3VydmUgPSB0aGlzLl9hZGRQb2ludChwb2ludCwgcG9pbnRHcm91cE9wdGlvbnMpO1xuXG4gICAgICAgICAgaWYgKGN1cnZlKSB7XG4gICAgICAgICAgICBkcmF3Q3VydmUoY3VydmUsIHBvaW50R3JvdXBPcHRpb25zKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX3Jlc2V0KHBvaW50R3JvdXBPcHRpb25zKTtcblxuICAgICAgICBkcmF3RG90KHBvaW50c1swXSwgcG9pbnRHcm91cE9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyB0b1NWRyh7IGluY2x1ZGVCYWNrZ3JvdW5kQ29sb3IgPSBmYWxzZSB9OiBUb1NWR09wdGlvbnMgPSB7fSk6IHN0cmluZyB7XG4gICAgY29uc3QgcG9pbnRHcm91cHMgPSB0aGlzLl9kYXRhO1xuICAgIGNvbnN0IHJhdGlvID0gTWF0aC5tYXgod2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSwgMSk7XG4gICAgY29uc3QgbWluWCA9IDA7XG4gICAgY29uc3QgbWluWSA9IDA7XG4gICAgY29uc3QgbWF4WCA9IHRoaXMuY2FudmFzLndpZHRoIC8gcmF0aW87XG4gICAgY29uc3QgbWF4WSA9IHRoaXMuY2FudmFzLmhlaWdodCAvIHJhdGlvO1xuICAgIGNvbnN0IHN2ZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUygnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnLCAnc3ZnJyk7XG5cbiAgICBzdmcuc2V0QXR0cmlidXRlKCd4bWxucycsICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpO1xuICAgIHN2Zy5zZXRBdHRyaWJ1dGUoJ3htbG5zOnhsaW5rJywgJ2h0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsnKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd2aWV3Qm94JywgYCR7bWluWH0gJHttaW5ZfSAke21heFh9ICR7bWF4WX1gKTtcbiAgICBzdmcuc2V0QXR0cmlidXRlKCd3aWR0aCcsIG1heFgudG9TdHJpbmcoKSk7XG4gICAgc3ZnLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgbWF4WS50b1N0cmluZygpKTtcblxuICAgIGlmIChpbmNsdWRlQmFja2dyb3VuZENvbG9yICYmIHRoaXMuYmFja2dyb3VuZENvbG9yKSB7XG4gICAgICBjb25zdCByZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncmVjdCcpO1xuICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3dpZHRoJywgJzEwMCUnKTtcbiAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnMTAwJScpO1xuICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCB0aGlzLmJhY2tncm91bmRDb2xvcik7XG5cbiAgICAgIHN2Zy5hcHBlbmRDaGlsZChyZWN0KTtcbiAgICB9XG5cbiAgICB0aGlzLl9mcm9tRGF0YShcbiAgICAgIHBvaW50R3JvdXBzLFxuXG4gICAgICAoY3VydmUsIHsgcGVuQ29sb3IgfSkgPT4ge1xuICAgICAgICBjb25zdCBwYXRoID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncGF0aCcpO1xuXG4gICAgICAgIC8vIE5lZWQgdG8gY2hlY2sgY3VydmUgZm9yIE5hTiB2YWx1ZXMsIHRoZXNlIHBvcCB1cCB3aGVuIGRyYXdpbmdcbiAgICAgICAgLy8gbGluZXMgb24gdGhlIGNhbnZhcyB0aGF0IGFyZSBub3QgY29udGludW91cy4gRS5nLiBTaGFycCBjb3JuZXJzXG4gICAgICAgIC8vIG9yIHN0b3BwaW5nIG1pZC1zdHJva2UgYW5kIHRoYW4gY29udGludWluZyB3aXRob3V0IGxpZnRpbmcgbW91c2UuXG4gICAgICAgIC8qIGVzbGludC1kaXNhYmxlIG5vLXJlc3RyaWN0ZWQtZ2xvYmFscyAqL1xuICAgICAgICBpZiAoXG4gICAgICAgICAgIWlzTmFOKGN1cnZlLmNvbnRyb2wxLngpICYmXG4gICAgICAgICAgIWlzTmFOKGN1cnZlLmNvbnRyb2wxLnkpICYmXG4gICAgICAgICAgIWlzTmFOKGN1cnZlLmNvbnRyb2wyLngpICYmXG4gICAgICAgICAgIWlzTmFOKGN1cnZlLmNvbnRyb2wyLnkpXG4gICAgICAgICkge1xuICAgICAgICAgIGNvbnN0IGF0dHIgPVxuICAgICAgICAgICAgYE0gJHtjdXJ2ZS5zdGFydFBvaW50LngudG9GaXhlZCgzKX0sJHtjdXJ2ZS5zdGFydFBvaW50LnkudG9GaXhlZChcbiAgICAgICAgICAgICAgMyxcbiAgICAgICAgICAgICl9IGAgK1xuICAgICAgICAgICAgYEMgJHtjdXJ2ZS5jb250cm9sMS54LnRvRml4ZWQoMyl9LCR7Y3VydmUuY29udHJvbDEueS50b0ZpeGVkKDMpfSBgICtcbiAgICAgICAgICAgIGAke2N1cnZlLmNvbnRyb2wyLngudG9GaXhlZCgzKX0sJHtjdXJ2ZS5jb250cm9sMi55LnRvRml4ZWQoMyl9IGAgK1xuICAgICAgICAgICAgYCR7Y3VydmUuZW5kUG9pbnQueC50b0ZpeGVkKDMpfSwke2N1cnZlLmVuZFBvaW50LnkudG9GaXhlZCgzKX1gO1xuICAgICAgICAgIHBhdGguc2V0QXR0cmlidXRlKCdkJywgYXR0cik7XG4gICAgICAgICAgcGF0aC5zZXRBdHRyaWJ1dGUoJ3N0cm9rZS13aWR0aCcsIChjdXJ2ZS5lbmRXaWR0aCAqIDIuMjUpLnRvRml4ZWQoMykpO1xuICAgICAgICAgIHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UnLCBwZW5Db2xvcik7XG4gICAgICAgICAgcGF0aC5zZXRBdHRyaWJ1dGUoJ2ZpbGwnLCAnbm9uZScpO1xuICAgICAgICAgIHBhdGguc2V0QXR0cmlidXRlKCdzdHJva2UtbGluZWNhcCcsICdyb3VuZCcpO1xuXG4gICAgICAgICAgc3ZnLmFwcGVuZENoaWxkKHBhdGgpO1xuICAgICAgICB9XG4gICAgICAgIC8qIGVzbGludC1lbmFibGUgbm8tcmVzdHJpY3RlZC1nbG9iYWxzICovXG4gICAgICB9LFxuXG4gICAgICAocG9pbnQsIHsgcGVuQ29sb3IsIGRvdFNpemUsIG1pbldpZHRoLCBtYXhXaWR0aCB9KSA9PiB7XG4gICAgICAgIGNvbnN0IGNpcmNsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NpcmNsZScpO1xuICAgICAgICBjb25zdCBzaXplID0gZG90U2l6ZSA+IDAgPyBkb3RTaXplIDogKG1pbldpZHRoICsgbWF4V2lkdGgpIC8gMjtcbiAgICAgICAgY2lyY2xlLnNldEF0dHJpYnV0ZSgncicsIHNpemUudG9TdHJpbmcoKSk7XG4gICAgICAgIGNpcmNsZS5zZXRBdHRyaWJ1dGUoJ2N4JywgcG9pbnQueC50b1N0cmluZygpKTtcbiAgICAgICAgY2lyY2xlLnNldEF0dHJpYnV0ZSgnY3knLCBwb2ludC55LnRvU3RyaW5nKCkpO1xuICAgICAgICBjaXJjbGUuc2V0QXR0cmlidXRlKCdmaWxsJywgcGVuQ29sb3IpO1xuXG4gICAgICAgIHN2Zy5hcHBlbmRDaGlsZChjaXJjbGUpO1xuICAgICAgfSxcbiAgICApO1xuXG4gICAgcmV0dXJuIHN2Zy5vdXRlckhUTUw7XG4gIH1cbn1cbiIsICJpbXBvcnQgU2lnbmF0dXJlUGFkIGZyb20gXCJzaWduYXR1cmVfcGFkXCI7XG5cbmV4cG9ydCBkZWZhdWx0ICh7XG4gICAgYmFja2dyb3VuZENvbG9yLFxuICAgIGJhY2tncm91bmRDb2xvck9uRGFyayxcbiAgICBkaXNhYmxlZCxcbiAgICBkb3RTaXplLFxuICAgIGV4cG9ydEJhY2tncm91bmRDb2xvcixcbiAgICBleHBvcnRQZW5Db2xvcixcbiAgICBmaWxlbmFtZSxcbiAgICBtYXhXaWR0aCxcbiAgICBtaW5EaXN0YW5jZSxcbiAgICBtaW5XaWR0aCxcbiAgICBwZW5Db2xvcixcbiAgICBwZW5Db2xvck9uRGFyayxcbiAgICBzdGF0ZSxcbiAgICB0aHJvdHRsZSxcbiAgICB2ZWxvY2l0eUZpbHRlcldlaWdodCxcbn0pID0+ICh7XG4gICAgc3RhdGUsXG4gICAgcHJldmlvdXNTdGF0ZTogc3RhdGUsXG5cbiAgICAvKiogQHR5cGUge1NpZ25hdHVyZVBhZH0gKi9cbiAgICBzaWduYXR1cmVQYWQ6IG51bGwsXG5cbiAgICBpbml0KCkge1xuICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZCA9IG5ldyBTaWduYXR1cmVQYWQodGhpcy4kcmVmcy5jYW52YXMsIHtcbiAgICAgICAgICAgIGJhY2tncm91bmRDb2xvcixcbiAgICAgICAgICAgIGRvdFNpemUsXG4gICAgICAgICAgICBtYXhXaWR0aCxcbiAgICAgICAgICAgIG1pbkRpc3RhbmNlLFxuICAgICAgICAgICAgbWluV2lkdGgsXG4gICAgICAgICAgICBwZW5Db2xvcixcbiAgICAgICAgICAgIHRocm90dGxlLFxuICAgICAgICAgICAgdmVsb2NpdHlGaWx0ZXJXZWlnaHQsXG4gICAgICAgIH0pXG5cbiAgICAgICAgaWYgKGRpc2FibGVkKSB7XG4gICAgICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5vZmYoKVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy53YXRjaFN0YXRlKCk7XG4gICAgICAgIHRoaXMud2F0Y2hSZXNpemUoKTtcbiAgICAgICAgdGhpcy53YXRjaFRoZW1lKCk7XG5cbiAgICAgICAgaWYgKHN0YXRlLmluaXRpYWxWYWx1ZSkge1xuICAgICAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuZnJvbURhdGFVUkwoc3RhdGUuaW5pdGlhbFZhbHVlKTtcblxuICAgICAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuYWRkRXZlbnRMaXN0ZW5lcihcImJlZ2luU3Ryb2tlXCIsICgpID0+IHtcbiAgICAgICAgICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5jbGVhcigpO1xuICAgICAgICAgICAgfSwgeyBvbmNlOiB0cnVlIH0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGNsZWFyKCkge1xuICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5jbGVhcigpO1xuICAgIH0sXG5cbiAgICB1bmRvKCkge1xuICAgICAgICBjb25zdCBkYXRhID0gdGhpcy5zaWduYXR1cmVQYWQudG9EYXRhKCk7XG4gICAgICAgIGlmIChkYXRhKSB7XG4gICAgICAgICAgICBkYXRhLnBvcCgpO1xuICAgICAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuZnJvbURhdGEoZGF0YSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZG93bmxvYWRBcyh0eXBlLCBleHRlbnNpb24pIHtcbiAgICAgICAgY29uc3QgeyBkYXRhOiBleHBvcnRlZERhdGEsIGNhbnZhc0JhY2tncm91bmRDb2xvciwgY2FudmFzUGVuQ29sb3IgfSA9IHRoaXMucHJlcGFyZVRvRXhwb3J0KClcbiAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuZnJvbURhdGEoZXhwb3J0ZWREYXRhKVxuXG4gICAgICAgIHRoaXMuZG93bmxvYWQoXG4gICAgICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC50b0RhdGFVUkwodHlwZSwgeyBpbmNsdWRlQmFja2dyb3VuZENvbG9yOiB0cnVlIH0pLFxuICAgICAgICAgICAgYCR7ZmlsZW5hbWV9LiR7ZXh0ZW5zaW9ufWBcbiAgICAgICAgKVxuXG4gICAgICAgIGNvbnN0IHsgZGF0YTogcmVzdG9yZWREYXRhIH0gPSB0aGlzLnJlc3RvcmVGcm9tRXhwb3J0KGV4cG9ydGVkRGF0YSwgY2FudmFzQmFja2dyb3VuZENvbG9yLCBjYW52YXNQZW5Db2xvcilcbiAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuZnJvbURhdGEocmVzdG9yZWREYXRhKVxuICAgIH0sXG5cbiAgICB3YXRjaFN0YXRlKCkge1xuICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5hZGRFdmVudExpc3RlbmVyKFwiYWZ0ZXJVcGRhdGVTdHJva2VcIiwgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YTogZXhwb3J0ZWREYXRhLCBjYW52YXNCYWNrZ3JvdW5kQ29sb3IsIGNhbnZhc1BlbkNvbG9yIH0gPSB0aGlzLnByZXBhcmVUb0V4cG9ydCgpXG4gICAgICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5mcm9tRGF0YShleHBvcnRlZERhdGEpXG5cbiAgICAgICAgICAgIHRoaXMucHJldmlvdXNTdGF0ZSA9IHRoaXMuc3RhdGU7XG4gICAgICAgICAgICB0aGlzLnN0YXRlID0gdGhpcy5zaWduYXR1cmVQYWQudG9EYXRhVVJMKCk7XG5cbiAgICAgICAgICAgIGNvbnN0IHsgZGF0YTogcmVzdG9yZWREYXRhIH0gPSB0aGlzLnJlc3RvcmVGcm9tRXhwb3J0KGV4cG9ydGVkRGF0YSwgY2FudmFzQmFja2dyb3VuZENvbG9yLCBjYW52YXNQZW5Db2xvcilcbiAgICAgICAgICAgIHRoaXMuc2lnbmF0dXJlUGFkLmZyb21EYXRhKHJlc3RvcmVkRGF0YSlcbiAgICAgICAgfSwgeyBvbmNlOiBmYWxzZSB9KTtcbiAgICB9LFxuXG4gICAgd2F0Y2hSZXNpemUoKSB7XG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwicmVzaXplXCIsICgpID0+IHRoaXMucmVzaXplQ2FudmFzKTtcbiAgICAgICAgdGhpcy5yZXNpemVDYW52YXMoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG8gY29ycmVjdGx5IGhhbmRsZSBjYW52YXMgb24gbG93IGFuZCBoaWdoIERQSSBzY3JlZW5zIG9uZSBoYXMgdG8gdGFrZSBkZXZpY2VQaXhlbFJhdGlvIGludG8gYWNjb3VudCBhbmQgc2NhbGUgdGhlIGNhbnZhcyBhY2NvcmRpbmdseS5cbiAgICAgKi9cbiAgICByZXNpemVDYW52YXMoKSB7XG4gICAgICAgIGNvbnN0IHJhdGlvID0gTWF0aC5tYXgod2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSwgMSk7XG5cbiAgICAgICAgdGhpcy4kcmVmcy5jYW52YXMud2lkdGggPSB0aGlzLiRyZWZzLmNhbnZhcy5vZmZzZXRXaWR0aCAqIHJhdGlvO1xuICAgICAgICB0aGlzLiRyZWZzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLiRyZWZzLmNhbnZhcy5vZmZzZXRIZWlnaHQgKiByYXRpbztcbiAgICAgICAgdGhpcy4kcmVmcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpLnNjYWxlKHJhdGlvLCByYXRpbyk7XG4gICAgICAgIHRoaXMuc2lnbmF0dXJlUGFkLmNsZWFyKCk7XG4gICAgfSxcblxuICAgIHdhdGNoVGhlbWUoKSB7XG4gICAgICAgIGxldCB0aGVtZTtcblxuICAgICAgICBpZiAodGhpcy4kc3RvcmUuaGFzT3duUHJvcGVydHkoJ3RoZW1lJykpIHtcbiAgICAgICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCd0aGVtZS1jaGFuZ2VkJywgZSA9PiB0aGlzLm9uVGhlbWVDaGFuZ2VkKGUuZGV0YWlsKSlcblxuICAgICAgICAgICAgdGhlbWUgPSB0aGlzLiRzdG9yZS50aGVtZVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2luZG93XG4gICAgICAgICAgICAgICAgLm1hdGNoTWVkaWEoJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyayknKVxuICAgICAgICAgICAgICAgIC5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCBlID0+IHRoaXMub25UaGVtZUNoYW5nZWQoZS5tYXRjaGVzID8gJ2RhcmsnIDogJ2xpZ2h0JykpXG5cbiAgICAgICAgICAgIHRoZW1lID0gd2luZG93Lm1hdGNoTWVkaWEoJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyayknKS5tYXRjaGVzID8gJ2RhcmsnIDogJ2xpZ2h0J1xuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5vblRoZW1lQ2hhbmdlZCh0aGVtZSlcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBzaWduYXR1cmUgcGFkJ3MgcGVuIGNvbG9yIGFuZCBiYWNrZ3JvdW5kIGNvbG9yIHdoZW4gdGhlIHRoZW1lIGNoYW5nZXMuXG4gICAgICogQHBhcmFtIHsnZGFyayd8J2xpZ2h0J30gdGhlbWVcbiAgICAgKi9cbiAgICBvblRoZW1lQ2hhbmdlZCh0aGVtZSkge1xuICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5wZW5Db2xvciA9IHRoZW1lID09PSAnZGFyaycgPyBwZW5Db2xvck9uRGFyayA/PyBwZW5Db2xvciA6IHBlbkNvbG9yXG4gICAgICAgIHRoaXMuc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IHRoZW1lID09PSAnZGFyaycgPyBiYWNrZ3JvdW5kQ29sb3JPbkRhcmsgPz8gYmFja2dyb3VuZENvbG9yIDogYmFja2dyb3VuZENvbG9yXG5cbiAgICAgICAgaWYgKCF0aGlzLnNpZ25hdHVyZVBhZC50b0RhdGEoKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVwYWludCB0aGUgc2lnbmF0dXJlIHBhZCB3aXRoIHRoZSBuZXcgY29sb3JzXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnNpZ25hdHVyZVBhZC50b0RhdGEoKVxuICAgICAgICBkYXRhLm1hcChkID0+IHtcbiAgICAgICAgICAgIGQucGVuQ29sb3IgPSB0aGVtZSA9PT0gJ2RhcmsnID8gcGVuQ29sb3JPbkRhcmsgPz8gcGVuQ29sb3IgOiBwZW5Db2xvclxuICAgICAgICAgICAgZC5iYWNrZ3JvdW5kQ29sb3IgPSB0aGVtZSA9PT0gJ2RhcmsnID8gYmFja2dyb3VuZENvbG9yT25EYXJrID8/IGJhY2tncm91bmRDb2xvciA6IGJhY2tncm91bmRDb2xvclxuICAgICAgICAgICAgcmV0dXJuIGRcbiAgICAgICAgfSlcbiAgICAgICAgdGhpcy5zaWduYXR1cmVQYWQuY2xlYXIoKVxuICAgICAgICB0aGlzLnNpZ25hdHVyZVBhZC5mcm9tRGF0YShkYXRhKVxuICAgIH0sXG5cbiAgICBwcmVwYXJlVG9FeHBvcnQoKSB7XG4gICAgICAgIC8vIEJhY2t1cCBleGlzdGluZyBkYXRhXG4gICAgICAgIGNvbnN0IGRhdGEgPSB0aGlzLnNpZ25hdHVyZVBhZC50b0RhdGEoKVxuICAgICAgICBjb25zdCBjYW52YXNCYWNrZ3JvdW5kQ29sb3IgPSB0aGlzLnNpZ25hdHVyZVBhZC5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgICAgY29uc3QgY2FudmFzUGVuQ29sb3IgPSB0aGlzLnNpZ25hdHVyZVBhZC5wZW5Db2xvclxuXG4gICAgICAgIC8vIFNldCBleHBvcnQgY29sb3JzXG4gICAgICAgIHRoaXMuc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IGV4cG9ydEJhY2tncm91bmRDb2xvciA/PyB0aGlzLnNpZ25hdHVyZVBhZC5iYWNrZ3JvdW5kQ29sb3JcbiAgICAgICAgZGF0YS5tYXAoZCA9PiBkLnBlbkNvbG9yID0gZXhwb3J0UGVuQ29sb3IgPz8gZC5wZW5Db2xvcilcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgICAgIGNhbnZhc0JhY2tncm91bmRDb2xvcixcbiAgICAgICAgICAgIGNhbnZhc1BlbkNvbG9yLFxuICAgICAgICB9XG4gICAgfSxcblxuICAgIHJlc3RvcmVGcm9tRXhwb3J0KGRhdGEsIGNhbnZhc0JhY2tncm91bmRDb2xvciwgY2FudmFzUGVuQ29sb3IpIHtcbiAgICAgICAgLy8gUmVzdG9yZSBwcmV2aW91cyBkYXRhXG4gICAgICAgIHRoaXMuc2lnbmF0dXJlUGFkLmJhY2tncm91bmRDb2xvciA9IGNhbnZhc0JhY2tncm91bmRDb2xvclxuICAgICAgICBkYXRhLm1hcChkID0+IGQucGVuQ29sb3IgPSBjYW52YXNQZW5Db2xvcilcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgZGF0YSxcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkb3dubG9hZChkYXRhLCBmaWxlbmFtZSkge1xuICAgICAgICBjb25zdCBsaW5rID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuXG4gICAgICAgIGxpbmsuZG93bmxvYWQgPSBmaWxlbmFtZTtcbiAgICAgICAgbGluay5ocmVmID0gZGF0YTtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChsaW5rKTtcbiAgICAgICAgbGluay5jbGljaygpO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGxpbmspO1xuICAgIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtJQVFhLGNBQUs7RUFNaEIsWUFB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
