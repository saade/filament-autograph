import SignaturePad from 'signature_pad'

export default function signaturePadFormComponent({
    backgroundColor,
    backgroundColorOnDark,
    canvasHeight,
    canvasWidth,
    clearable,
    confirmable,
    cropPadding,
    cropSignature,
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
        writtenState: undefined,
        dirty: false,
        confirmed: false,

        /** @type {SignaturePad} */
        signaturePad: null,

        resizeObserver: null,

        resolutionQuery: null,

        onResize: null,

        themeObserver: null,

        hasLoadedImage: false,

        isDark: false,

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
                        if (!this.hasLoadedImage) {
                            return
                        }

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
            this.themeObserver?.disconnect()
            this.signaturePad?.off()
        },

        clear() {
            this.reset()
            this.setState(null)
        },

        reset() {
            this.hasLoadedImage = false
            this.signaturePad.clear()
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
                this.setState(null)
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

            this.setState(this.toDataURL('image/png'))

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
                this.download(this.toDataURL(type), `${filename}.${extension}`)

                return
            }

            const {
                data: exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            } = this.prepareToExport()
            this.signaturePad.fromData(exportedData)

            this.download(this.toDataURL(type), `${filename}.${extension}`)

            const { data: restoredData } = this.restoreFromExport(
                exportedData,
                canvasBackgroundColor,
                canvasPenColor,
            )
            this.signaturePad.fromData(restoredData)
        },

        // JPEG has no transparency: whatever is transparent on the pad would
        // come out black, so it is put on white first.
        //
        // A cropped pad exports the bounds of its ink instead of the full
        // canvas: SVG downloads pass through untouched, since their export
        // is vector paths, not canvas pixels, and a pad without ink falls
        // back to the full canvas.
        toDataURL(type) {
            if (cropSignature && type !== 'image/svg+xml') {
                const cropped = this.croppedDataURL(type)

                if (cropped) {
                    return cropped
                }
            }

            if (type !== 'image/jpeg') {
                return this.signaturePad.toDataURL(type, {
                    includeBackgroundColor: true,
                })
            }

            const canvas = document.createElement('canvas')
            canvas.width = this.$refs.canvas.width
            canvas.height = this.$refs.canvas.height

            const context = canvas.getContext('2d')
            context.fillStyle = '#ffffff'
            context.fillRect(0, 0, canvas.width, canvas.height)
            context.drawImage(this.$refs.canvas, 0, 0)

            return canvas.toDataURL(type)
        },

        // The bounds of the pixels that differ from the background, so a
        // transparent or a solid background both crop correctly.
        inkBounds() {
            const canvas = this.$refs.canvas
            const { width, height } = canvas

            if (!width || !height) {
                return null
            }

            const background = document.createElement('canvas')
            background.width = 1
            background.height = 1

            const backgroundContext = background.getContext('2d')
            backgroundContext.fillStyle = this.signaturePad.backgroundColor
            backgroundContext.fillRect(0, 0, 1, 1)

            const [
                backgroundRed,
                backgroundGreen,
                backgroundBlue,
                backgroundAlpha,
            ] = backgroundContext.getImageData(0, 0, 1, 1).data

            const pixels = canvas
                .getContext('2d')
                .getImageData(0, 0, width, height).data

            let minX = width
            let minY = height
            let maxX = -1
            let maxY = -1

            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const i = (y * width + x) * 4

                    if (
                        pixels[i] !== backgroundRed ||
                        pixels[i + 1] !== backgroundGreen ||
                        pixels[i + 2] !== backgroundBlue ||
                        pixels[i + 3] !== backgroundAlpha
                    ) {
                        minX = Math.min(minX, x)
                        minY = Math.min(minY, y)
                        maxX = Math.max(maxX, x)
                        maxY = Math.max(maxY, y)
                    }
                }
            }

            if (maxX < 0) {
                return null
            }

            return { minX, minY, maxX, maxY }
        },

        croppedDataURL(type) {
            const bounds = this.inkBounds()

            if (!bounds) {
                return null
            }

            const canvas = this.$refs.canvas
            const x = Math.max(0, bounds.minX - cropPadding)
            const y = Math.max(0, bounds.minY - cropPadding)
            const width =
                Math.min(canvas.width, bounds.maxX + 1 + cropPadding) - x
            const height =
                Math.min(canvas.height, bounds.maxY + 1 + cropPadding) - y

            if (width < 1 || height < 1) {
                return null
            }

            const cropped = document.createElement('canvas')
            cropped.width = width
            cropped.height = height

            const context = cropped.getContext('2d')

            if (type === 'image/jpeg') {
                context.fillStyle = '#ffffff'
                context.fillRect(0, 0, width, height)
            }

            context.drawImage(canvas, x, y, width, height, 0, 0, width, height)

            return cropped.toDataURL(type)
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
                    this.setState(null)
                }
            })

            // A value the pad did not write itself came from the server: a
            // `$set()`, a form reset, "create another".
            this.$watch('state', (value) => {
                if (value === this.writtenState) {
                    return
                }

                this.writtenState = value

                if (value) {
                    this.signaturePad.clear()
                    this.loadImage(value)
                } else {
                    this.reset()
                }
            })
        },

        setState(value) {
            this.writtenState = value
            this.state = value
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
        //
        // A fixed resolution pins the backing store, so the saved and the
        // downloaded image keep their size whatever the screen: the strokes
        // are drawn on the full backing store, and the element itself is
        // scaled by CSS to fit its box.
        resizeCanvas() {
            const canvas = this.$refs.canvas

            const ratio =
                canvasWidth && canvasHeight
                    ? Math.min(
                          canvasWidth / (canvas.offsetWidth || canvasWidth),
                          canvasHeight / (canvas.offsetHeight || canvasHeight),
                      )
                    : Math.max(window.devicePixelRatio || 1, 1)

            // Hidden, as in a closed modal or an inactive tab.
            if (!canvas.offsetWidth || !canvas.offsetHeight) {
                return
            }

            const width = Math.round(canvas.offsetWidth * ratio)
            const height = Math.round(canvas.offsetHeight * ratio)

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

        // Not `prefers-color-scheme`: a light page on a dark system would get
        // a dark pad with white ink.
        watchTheme() {
            const root = document.documentElement
            const theme = () =>
                root.classList.contains('dark') ? 'dark' : 'light'

            this.themeObserver = new MutationObserver(() => {
                if ((theme() === 'dark') !== this.isDark) {
                    this.onThemeChanged(theme())
                }
            })
            this.themeObserver.observe(root, {
                attributes: true,
                attributeFilter: ['class'],
            })

            this.onThemeChanged(theme())
        },

        /**
         * Update the signature pad's pen color and background color when the theme changes.
         * @param {'dark'|'light'} theme
         */
        onThemeChanged(theme) {
            this.isDark = theme === 'dark'

            this.signaturePad.penColor =
                theme === 'dark' ? (penColorOnDark ?? penColor) : penColor
            this.signaturePad.backgroundColor =
                theme === 'dark'
                    ? (backgroundColorOnDark ?? backgroundColor)
                    : backgroundColor

            if (!this.signaturePad.toData().length) {
                return
            }

            // Repaint the signature pad with the new colors
            const data = this.signaturePad.toData()
            data.map((d) => {
                d.penColor =
                    theme === 'dark' ? (penColorOnDark ?? penColor) : penColor
                d.backgroundColor =
                    theme === 'dark'
                        ? (backgroundColorOnDark ?? backgroundColor)
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
