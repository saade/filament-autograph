<?php

namespace Saade\FilamentAutograph\Forms\Components\Concerns;

use Closure;

trait HasOptions
{
    public string | Closure | null $filename = null;

    protected float | Closure $dotSize = 2.0;

    protected float | Closure $lineMinWidth = 0.5;

    protected float | Closure $lineMaxWidth = 2.5;

    protected int | Closure $throttle = 16;

    protected int | Closure $minDistance = 5;

    protected string | Closure $backgroundColor = 'rgba(0,0,0,0)';

    protected string | Closure | null $backgroundColorOnDark = null;

    protected string | Closure | null $exportBackgroundColor = null;

    protected string | Closure $penColor = '#000000';

    protected string | Closure | null $penColorOnDark = '#ffffff';

    protected string | Closure | null $exportPenColor = null;

    protected float | Closure $velocityFilterWeight = 0.7;

    /**
     * Filename of the downloaded image. Without extension.
     */
    public function filename(string | Closure | null $filename): static
    {
        $this->filename = $filename;

        return $this;
    }

    public function getFilename(): string
    {
        return $this->evaluate($this->filename) ?? 'signature';
    }

    /**
     * Radius of a single dot. Also the width of the start of a mark.
     */
    public function dotSize(float | Closure $dotSize): static
    {
        $this->dotSize = $dotSize;

        return $this;
    }

    /**
     * Minimum width of a line.
     */
    public function lineMinWidth(float | Closure $lineMinWidth): static
    {
        $this->lineMinWidth = $lineMinWidth;

        return $this;
    }

    /**
     * Maximum width of a line.
     */
    public function lineMaxWidth(float | Closure $lineMaxWidth): static
    {
        $this->lineMaxWidth = $lineMaxWidth;

        return $this;
    }

    /**
     * Draw the next point at most once per every x milliseconds. Set it to 0 to turn off throttling.
     */
    public function throttle(int | Closure $throttle): static
    {
        $this->throttle = $throttle;

        return $this;
    }

    /**
     * Add the next point only if the previous one is farther than x pixels.
     */
    public function minDistance(int | Closure $minDistance): static
    {
        $this->minDistance = $minDistance;

        return $this;
    }

    /**
     * The color used to clear the background when the theme is light. Can be any color format accepted by context.fillStyle.
     */
    public function backgroundColor(string | Closure $backgroundColor): static
    {
        $this->backgroundColor = $backgroundColor;

        return $this;
    }

    /**
     * Color used to clear the background when the theme is dark. Can be any color format accepted by context.fillStyle.
     */
    public function backgroundColorOnDark(string | Closure | null $backgroundColorOnDark): static
    {
        $this->backgroundColorOnDark = $backgroundColorOnDark;

        return $this;
    }

    /**
     * Color used to export the background regardless of the theme. Can be any color format accepted by context.fillStyle.
     */
    public function exportBackgroundColor(string | Closure | null $exportBackgroundColor): static
    {
        $this->exportBackgroundColor = $exportBackgroundColor;

        return $this;
    }

    /**
     * Color used to draw the lines when the theme is light. Can be any color format accepted by context.fillStyle.
     */
    public function penColor(string | Closure $penColor): static
    {
        $this->penColor = $penColor;

        return $this;
    }

    /**
     * Color used to draw the lines when the theme is dark. Can be any color format accepted by context.fillStyle.
     */
    public function penColorOnDark(string | Closure | null $penColorOnDark): static
    {
        $this->penColorOnDark = $penColorOnDark;

        return $this;
    }

    /**
     * Color used to export the lines regardless of the theme. Can be any color format accepted by context.fillStyle.
     */
    public function exportPenColor(string | Closure $exportPenColor): static
    {
        $this->exportPenColor = $exportPenColor;

        return $this;
    }

    /**
     * Weight used to modify new velocity based on the previous velocity.
     */
    public function velocityFilterWeight(float | Closure $velocityFilterWeight): static
    {
        $this->velocityFilterWeight = $velocityFilterWeight;

        return $this;
    }

    public function getDotSize(): float
    {
        return $this->evaluate($this->dotSize);
    }

    public function getLineMinWidth(): float
    {
        return $this->evaluate($this->lineMinWidth);
    }

    public function getLineMaxWidth(): float
    {
        return $this->evaluate($this->lineMaxWidth);
    }

    public function getThrottle(): int
    {
        return $this->evaluate($this->throttle);
    }

    public function getMinDistance(): int
    {
        return $this->evaluate($this->minDistance);
    }

    public function getBackgroundColor(): string
    {
        return $this->evaluate($this->backgroundColor);
    }

    public function getBackgroundColorOnDark(): ?string
    {
        return $this->evaluate($this->backgroundColorOnDark);
    }

    public function getExportBackgroundColor(): ?string
    {
        return $this->evaluate($this->exportBackgroundColor);
    }

    public function getPenColor(): string
    {
        return $this->evaluate($this->penColor);
    }

    public function getPenColorOnDark(): ?string
    {
        return $this->evaluate($this->penColorOnDark);
    }

    public function getExportPenColor(): ?string
    {
        return $this->evaluate($this->exportPenColor);
    }

    public function getVelocityFilterWeight(): float
    {
        return $this->evaluate($this->velocityFilterWeight);
    }
}
