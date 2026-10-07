import SignaturePad from 'signature_pad'

export default function signaturePadFormComponent({
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
}) {
    return {
        state,
        previousState: state,
        dirty: false,
        confirmed: false,

        /** @type {SignaturePad} */
        signaturePad: null,

        resizeObserver: null,

        resolutionQuery: null,

        onResize: null,

        hasLoadedImage: false,

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

            this.watchState()
            this.watchResize()
            this.watchTheme()

            if (state.initialValue) {
                this.hasLoadedImage = true
                this.signaturePad.fromDataURL(state.initialValue)

                this.signaturePad.addEventListener(
                    'beginStroke',
                    () => {
                        this.hasLoadedImage = false
                        this.signaturePad.clear()
                    },
                    { once: true },
                )
            }
        },

        destroy() {
            this.resizeObserver?.disconnect()
            this.resolutionQuery?.removeEventListener('change', this.onResize)
            window.removeEventListener('resize', this.onResize)
        },

        clear() {
            this.hasLoadedImage = false
            this.signaturePad.clear()
            this.state = null
            this.confirmed = false
            this.dirty = false
            this.signaturePad.on()
        },

        undo() {
            const data = this.signaturePad.toData()
            if (data.length) {
                data.pop()
                this.signaturePad.fromData(data)
            }

            if (!data.length) {
                this.state = null
            }

            this.confirmed = false
            this.dirty = data.length > 0
            this.signaturePad.on()
        },

        done() {
            const {
                data: exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            } = this.prepareToExport()
            this.signaturePad.fromData(exportedData)

            this.previousState = this.state
            this.state = this.signaturePad.toDataURL()

            if (confirmable) {
                this.confirmed = true
                this.signaturePad.off()
            }

            const { data: restoredData } = this.restoreFromExport(
                exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            )
            this.signaturePad.fromData(restoredData)
        },

        downloadAs(type, extension) {
            const {
                data: exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            } = this.prepareToExport()
            this.signaturePad.fromData(exportedData)

            this.download(
                this.signaturePad.toDataURL(type, {
                    includeBackgroundColor: true,
                }),
                `${filename}.${extension}`,
            )

            const { data: restoredData } = this.restoreFromExport(
                exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            )
            this.signaturePad.fromData(restoredData)
        },

        watchState() {
            this.signaturePad.addEventListener(
                'endStroke',
                (e) => {
                    this.dirty = true

                    if (confirmable) {
                        return
                    }

                    this.done()
                },
                { once: false },
            )

            this.$watch('confirmed', (confirmed) => {
                if (confirmable && !confirmed) {
                    this.state = null
                }
            })
        },

        // The canvas is watched itself, and not only the window, because its
        // box also changes when a modal opens, a tab is shown or a sidebar
        // collapses. A change of screen changes the pixel ratio without
        // changing the box, which the observer does not see.
        watchResize() {
            this.onResize = () => this.resizeCanvas()

            this.resizeObserver = new ResizeObserver(this.onResize)
            this.resizeObserver.observe(this.$refs.canvas)

            window.addEventListener('resize', this.onResize)

            this.resolutionQuery = window.matchMedia(
                `(resolution: ${window.devicePixelRatio || 1}dppx)`,
            )
            this.resolutionQuery.addEventListener('change', this.onResize)

            this.resizeCanvas()
        },

        // Resizing a canvas erases it, so what was drawn is put back: the
        // strokes from their points, or the loaded signature from the state.
        resizeCanvas() {
            const canvas = this.$refs.canvas
            const ratio = Math.max(window.devicePixelRatio || 1, 1)
            const width = Math.round(canvas.offsetWidth * ratio)
            const height = Math.round(canvas.offsetHeight * ratio)

            // Hidden, as in a closed modal or an inactive tab.
            if (!width || !height) {
                return
            }

            if (canvas.width === width && canvas.height === height) {
                return
            }

            const data = this.signaturePad.toData()

            canvas.width = width
            canvas.height = height
            canvas.getContext('2d').scale(ratio, ratio)

            this.signaturePad.clear()

            if (data.length) {
                this.signaturePad.fromData(data)
            } else if (this.hasLoadedImage && this.state) {
                this.signaturePad.fromDataURL(this.state)
            }
        },

        watchTheme() {
            let theme

            if (this.$store.hasOwnProperty('theme')) {
                window.addEventListener('theme-changed', (e) =>
                    this.onThemeChanged(e.detail),
                )

                theme = this.$store.theme
            } else {
                window
                    .matchMedia('(prefers-color-scheme: dark)')
                    .addEventListener('change', (e) =>
                        this.onThemeChanged(e.matches ? 'dark' : 'light'),
                    )

                theme = window.matchMedia('(prefers-color-scheme: dark)')
                    .matches
                    ? 'dark'
                    : 'light'
            }

            this.onThemeChanged(theme)
        },

        /**
         * Update the signature pad's pen color and background color when the theme changes.
         * @param {'dark'|'light'} theme
         */
        onThemeChanged(theme) {
            this.signaturePad.penColor =
                theme === 'dark' ? penColorOnDark ?? penColor : penColor
            this.signaturePad.backgroundColor =
                theme === 'dark'
                    ? backgroundColorOnDark ?? backgroundColor
                    : backgroundColor

            if (!this.signaturePad.toData().length) {
                return
            }

            // Repaint the signature pad with the new colors
            const data = this.signaturePad.toData()
            data.map((d) => {
                d.penColor =
                    theme === 'dark' ? penColorOnDark ?? penColor : penColor
                d.backgroundColor =
                    theme === 'dark'
                        ? backgroundColorOnDark ?? backgroundColor
                        : backgroundColor
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
            this.signaturePad.backgroundColor =
                exportBackgroundColor ?? this.signaturePad.backgroundColor
            data.map((d) => (d.penColor = exportPenColor ?? d.penColor))

            return {
                data,
                canvasBackgroundColor,
                canvasPenColor,
            }
        },

        restoreFromExport(data, canvasBackgroundColor, canvasPenColor) {
            // Restore previous data
            this.signaturePad.backgroundColor = canvasBackgroundColor
            data.map((d) => (d.penColor = canvasPenColor))

            return {
                data,
            }
        },

        download(data, filename) {
            const link = document.createElement('a')

            link.download = filename
            link.href = data
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        },
    }
}
