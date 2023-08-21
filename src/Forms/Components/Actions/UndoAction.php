<?php

namespace Saade\FilamentAutograph\Forms\Components\Actions;

use Filament\Forms\Components\Actions\Action;
use Filament\Support\Enums\ActionSize;
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

class UndoAction extends Action
{
    public static function getDefaultName(): ?string
    {
        return 'undo';
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->iconButton()->icon('heroicon-o-arrow-uturn-left')->color('gray');

        $this->label(fn (): string => __('filament-autograph::filament-autograph.actions.undo.label'));

        $this->livewireClickHandlerEnabled(false);

        $this->size(ActionSize::Small);

        $this->visible(
            fn (SignaturePad $component): bool => $component->isUndoable()
        );
    }
}
