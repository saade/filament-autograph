<?php

namespace Saade\FilamentAutograph\Forms\Components\Concerns;

use Closure;
use Filament\Actions\Action;
use Illuminate\Support\HtmlString;
use Saade\FilamentAutograph\Forms\Components\Actions\ClearAction;
use Saade\FilamentAutograph\Forms\Components\Actions\DoneAction;
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

    protected bool | Closure $isConfirmable = false;

    protected ?Closure $modifyClearActionUsing = null;

    protected ?Closure $modifyDownloadActionUsing = null;

    protected ?Closure $modifyUndoActionUsing = null;

    protected ?Closure $modifyDoneActionUsing = null;

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

    public function clearAction(?Closure $callback): static
    {
        $this->modifyClearActionUsing = $callback;

        return $this;
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

    public function downloadAction(?Closure $callback): static
    {
        $this->modifyDownloadActionUsing = $callback;

        return $this;
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

    public function undoAction(?Closure $callback): static
    {
        $this->modifyUndoActionUsing = $callback;

        return $this;
    }

    public function getDoneAction(): Action
    {
        $action = DoneAction::make();

        if ($this->modifyDoneActionUsing) {
            $action = $this->evaluate($this->modifyDoneActionUsing, [
                'action' => $action,
            ]) ?? $action;
        }

        $action->extraAttributes([
            'x-on:click' => 'done',
            'x-cloak' => '',
            'x-show' => new HtmlString('dirty && !confirmed'),
            ...$action->getExtraAttributes(),
        ]);

        return $action;
    }

    public function doneAction(?Closure $callback): static
    {
        $this->modifyDoneActionUsing = $callback;

        return $this;
    }

    public function clearable(bool | Closure $condition = true): static
    {
        $this->isClearable = $condition;

        return $this;
    }

    public function downloadable(bool | Closure $condition = true): static
    {
        $this->isDownloadable = $condition;

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

    public function confirmable(bool | Closure $condition = true): static
    {
        $this->isConfirmable = $condition;

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

    public function isConfirmable(): bool
    {
        if ($this->isDisabled()) {
            return false;
        }

        return (bool) $this->evaluate($this->isConfirmable);
    }
}
