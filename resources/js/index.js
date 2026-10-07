import SignaturePad from 'signature_pad'

export default function signaturePadFormComponent({
    backgroundColor,
    backgroundColorOnDark,
    clearable,
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

        schemeQuery: null,

        onSchemeChange: null,

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
                this.loadImage(state.initialValue)
            }
        },

        // A saved signature is only a picture, with no strokes to undo. It
        // stays until cleared, so a stray touch on an edit page cannot replace
        // it. A pad that cannot be cleared is replaced by the first stroke.
        loadImage(dataUrl) {
            this.hasLoadedImage = true
            this.confirmed = true

            if (clearable) {
                this.signaturePad.off()
            } else {
                // Before the pad sees the press: clearing it from its own
                // `beginStroke` event would drop the stroke being started.
                this.$refs.canvas.addEventListener(
                    'pointerdown',
                    () => {
                        this.hasLoadedImage = false
                        this.signaturePad.clear()
                    },
                    { once: true, capture: true },
                )
            }

            this.drawLoadedImage(dataUrl)
        },

        // Fitted inside the pad and centered, keeping its proportions, since
        // it may have been signed on a pad of another size.
        drawLoadedImage(dataUrl) {
            const image = new Image()

            image.onload = () => {
                const canvas = this.$refs.canvas
                const width = canvas.offsetWidth
                const height = canvas.offsetHeight

                if (!this.hasLoadedImage || !width || !height) {
                    return
                }

                const scale = Math.min(
                    width / image.width,
                    height / image.height,
                )

                this.signaturePad.clear()
                this.signaturePad.fromDataURL(dataUrl, {
                    width: image.width * scale,
                    height: image.height * scale,
                    xOffset: (width - image.width * scale) / 2,
                    yOffset: (height - image.height * scale) / 2,
                })
            }

            image.src = dataUrl
        },

        destroy() {
            this.resizeObserver?.disconnect()
            this.resolutionQuery?.removeEventListener('change', this.onResize)
            window.removeEventListener('resize', this.onResize)
            this.schemeQuery?.removeEventListener('change', this.onSchemeChange)
        },

        clear() {
            this.hasLoadedImage = false
            this.signaturePad.clear()
            this.state = null
            this.confirmed = false
            this.dirty = false

            if (!disabled) {
                this.signaturePad.on()
            }
        },

        undo() {
            const data = this.signaturePad.toData()

            if (!data.length) {
                return
            }

            data.pop()
            this.signaturePad.fromData(data)

            this.confirmed = false
            this.dirty = data.length > 0

            if (!disabled) {
                this.signaturePad.on()
            }

            if (!data.length) {
                this.state = null
            } else if (!confirmable) {
                this.done()
            }
        },

        done() {
            if (!this.signaturePad.toData().length) {
                return
            }

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
            if (this.hasLoadedImage) {
                this.download(
                    this.signaturePad.toDataURL(type, {
                        includeBackgroundColor: true,
                    }),
                    `${filename}.${extension}`,
                )

                return
            }

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
                this.drawLoadedImage(this.state)
            }
        },

        watchTheme() {
            let theme

            if (this.$store.hasOwnProperty('theme')) {
                // The store always holds light or dark. The `theme-changed`
                // event can also say "system", which is neither.
                this.$watch('$store.theme', (theme) =>
                    this.onThemeChanged(theme),
                )

                theme = this.$store.theme
            } else {
                this.onSchemeChange = (e) =>
                    this.onThemeChanged(e.matches ? 'dark' : 'light')

                this.schemeQuery = window.matchMedia(
                    '(prefers-color-scheme: dark)',
                )
                this.schemeQuery.addEventListener('change', this.onSchemeChange)

                theme = this.schemeQuery.matches ? 'dark' : 'light'
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

            // The saved signature must not depend on the theme of whoever
            // signed, so it falls back to the light colors, never the ones on
            // screen: white ink on a transparent background cannot be seen.
            this.signaturePad.backgroundColor =
                exportBackgroundColor ?? backgroundColor
            data.map((d) => (d.penColor = exportPenColor ?? penColor))

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
