<?php

namespace Saade\FilamentAutograph\Forms\Components\Concerns;

use Closure;
use Filament\Forms\Components\Actions\Action;
use Saade\FilamentAutograph\Forms\Components\Actions\ClearAction;
use Saade\FilamentAutograph\Forms\Components\Actions\DownloadAction;
use Saade\FilamentAutograph\Forms\Components\Actions\UndoAction;
use Saade\FilamentAutograph\Forms\Components\Enums\DownloadableFormat;

trait HasActions
{
    protected bool | Closure $isClearable = true;

    protected bool | Closure $isDownloadable = false;

    protected array | Closure $downloadableFormats = [
        DownloadableFormat::PNG,
        DownloadableFormat::JPG,
        DownloadableFormat::SVG,
    ];

    protected string | Closure | null $downloadActionDropdownPlacement = null;

    protected bool | Closure $isUndoable = true;

    protected ?Closure $modifyClearActionUsing = null;

    protected ?Closure $modifyDownloadActionUsing = null;

    protected ?Closure $modifyUndoActionUsing = null;

    public function getClearAction(): Action
    {
        $action = ClearAction::make();

        if ($this->modifyClearActionUsing) {
            $action = $this->evaluate($this->modifyClearActionUsing, [
                'action' => $action,
            ]) ?? $action;
        }

        $action->extraAttributes([
            'x-on:click' => 'clear',
            ...$action->getExtraAttributes(),
        ]);

        return $action;
    }

    public function getDownloadAction(): Action
    {
        $action = DownloadAction::make();

        if ($this->modifyDownloadActionUsing) {
            $action = $this->evaluate($this->modifyDownloadActionUsing, [
                'action' => $action,
            ]) ?? $action;
        }

        return $action;
    }

    public function getUndoAction(): Action
    {
        $action = UndoAction::make();

        if ($this->modifyUndoActionUsing) {
            $action = $this->evaluate($this->modifyUndoActionUsing, [
                'action' => $action,
            ]) ?? $action;
        }

        $action->extraAttributes([
            'x-on:click' => 'undo',
            ...$action->getExtraAttributes(),
        ]);

        return $action;
    }

    public function clearable(bool | Closure $condition = true): static
    {
        $this->isClearable = $condition;

        return $this;
    }

    public function downloadable(bool | Closure $condition = true, ?array $formats = null, string $dropdownPlacement = null): static
    {
        $this->isDownloadable = $condition;

        $this->downloadableFormats = $formats ?? $this->downloadableFormats;

        $this->downloadActionDropdownPlacement = $dropdownPlacement;

        return $this;
    }

    public function downloadableFormats(array | Closure $formats): static
    {
        $this->downloadableFormats = $formats;

        return $this;
    }

    public function downloadActionDropdownPlacement(string | Closure $placement): static
    {
        $this->downloadActionDropdownPlacement = $placement;

        return $this;
    }

    public function undoable(bool | Closure $condition = true): static
    {
        $this->isUndoable = $condition;

        return $this;
    }

    public function isClearable(): bool
    {
        if ($this->isDisabled()) {
            return false;
        }

        return (bool) $this->evaluate($this->isClearable);
    }

    public function isDownloadable(): bool
    {
        if ($this->isDisabled()) {
            return false;
        }

        return (bool) $this->evaluate($this->isDownloadable);
    }

    public function getDownloadableFormats(): array
    {
        return (array) $this->evaluate($this->downloadableFormats);
    }

    public function getDownloadActionDropdownPlacement(): ?string
    {
        return $this->evaluate($this->downloadActionDropdownPlacement);
    }

    public function isUndoable(): bool
    {
        if ($this->isDisabled()) {
            return false;
        }

        return (bool) $this->evaluate($this->isUndoable);
    }
}
