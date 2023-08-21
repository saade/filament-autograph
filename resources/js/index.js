import SignaturePad from "signature_pad";

export default ({
    backgroundColor,
    backgroundColorOnDark,
    confirmable,
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
    throttle,
    velocityFilterWeight,
}) => ({
    state,
    previousState: state,
    dirty: false,
    confirmed: false,

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
            throttle,
            velocityFilterWeight,
        })

        if (disabled) {
            this.signaturePad.off()
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
        this.state = null;
        this.confirmed = false;
        this.dirty = false;
        this.signaturePad.on();
    },

    undo() {
        const data = this.signaturePad.toData();
        if (data.length) {
            data.pop();
            this.signaturePad.fromData(data);
        }

        if (!data.length) {
            this.state = null;
        }

        this.confirmed = false;
        this.dirty = data.length > 0;
        this.signaturePad.on();
    },

    done() {
        const { data: exportedData, canvasBackgroundColor, canvasPenColor } = this.prepareToExport()
        this.signaturePad.fromData(exportedData)

        this.previousState = this.state;
        this.state = this.signaturePad.toDataURL();

        if (confirmable) {
            this.confirmed = true;
            this.signaturePad.off();
        }

        const { data: restoredData } = this.restoreFromExport(exportedData, canvasBackgroundColor, canvasPenColor)
        this.signaturePad.fromData(restoredData)
    },

    downloadAs(type, extension) {
        const { data: exportedData, canvasBackgroundColor, canvasPenColor } = this.prepareToExport()
        this.signaturePad.fromData(exportedData)

        this.download(
            this.signaturePad.toDataURL(type, { includeBackgroundColor: true }),
            `${filename}.${extension}`
        )

        const { data: restoredData } = this.restoreFromExport(exportedData, canvasBackgroundColor, canvasPenColor)
        this.signaturePad.fromData(restoredData)
    },

    watchState() {
        this.signaturePad.addEventListener("endStroke", (e) => {
            this.dirty = true;

            if (confirmable) {
                return;
            }

            this.done();
        }, { once: false });

        this.$watch("confirmed", (confirmed) => {
            if (confirmable && !confirmed) {
                this.state = null
            }
        })
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

        if (this.$store.hasOwnProperty('theme')) {
            window.addEventListener('theme-changed', e => this.onThemeChanged(e.detail))

            theme = this.$store.theme
        } else {
            window
                .matchMedia('(prefers-color-scheme: dark)')
                .addEventListener('change', e => this.onThemeChanged(e.matches ? 'dark' : 'light'))

            theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }

        this.onThemeChanged(theme)
    },

    /**
     * Update the signature pad's pen color and background color when the theme changes.
     * @param {'dark'|'light'} theme
     */
    onThemeChanged(theme) {
        this.signaturePad.penColor = theme === 'dark' ? penColorOnDark ?? penColor : penColor
        this.signaturePad.backgroundColor = theme === 'dark' ? backgroundColorOnDark ?? backgroundColor : backgroundColor

        if (!this.signaturePad.toData().length) {
            return
        }

        // Repaint the signature pad with the new colors
        const data = this.signaturePad.toData()
        data.map(d => {
            d.penColor = theme === 'dark' ? penColorOnDark ?? penColor : penColor
            d.backgroundColor = theme === 'dark' ? backgroundColorOnDark ?? backgroundColor : backgroundColor
            return d
        })
        this.signaturePad.clear()
        this.signaturePad.fromData(data)
    },

    prepareToExport() {
        // Backup existing data
        const data = this.signaturePad.toData()
        const canvasBackgroundColor = this.signaturePad.backgroundColor
        const canvasPenColor = this.signaturePad.penColor

        // Set export colors
        this.signaturePad.backgroundColor = exportBackgroundColor ?? this.signaturePad.backgroundColor
        data.map(d => d.penColor = exportPenColor ?? d.penColor)

        return {
            data,
            canvasBackgroundColor,
            canvasPenColor,
        }
    },

    restoreFromExport(data, canvasBackgroundColor, canvasPenColor) {
        // Restore previous data
        this.signaturePad.backgroundColor = canvasBackgroundColor
        data.map(d => d.penColor = canvasPenColor)

        return {
            data,
        }
    },

    download(data, filename) {
        const link = document.createElement('a');

        link.download = filename;
        link.href = data;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    },
})
