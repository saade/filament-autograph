<?php

namespace Saade\FilamentAutograph\Forms\Components\Actions;

use Filament\Forms\Components\Actions\Action;
use Filament\Support\Enums\ActionSize;
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

class DoneAction extends Action
{
    public static function getDefaultName(): ?string
    {
        return 'done';
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->link()->icon('heroicon-o-check')->color('primary');

        $this->label(fn (): string => __('filament-autograph::filament-autograph.actions.done.label'));

        $this->livewireClickHandlerEnabled(false);

        $this->size(ActionSize::Small);

        $this->visible(
            fn (SignaturePad $component): bool => $component->isConfirmable()
        );
    }
}
