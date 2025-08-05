<?php

namespace Saade\FilamentAutograph\Forms\Components\Actions;

use Filament\Actions\Action;
use Filament\Support\Enums\Size;
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

class DownloadAction extends Action
{
    public static function getDefaultName(): ?string
    {
        return 'download';
    }

    protected function setUp(): void
    {
        parent::setUp();

        $this->iconButton()->icon('heroicon-o-arrow-down-tray')->color('gray');

        $this->label(fn (): string => __('filament-autograph::filament-autograph.actions.download.label'));

        $this->livewireClickHandlerEnabled(false);

        $this->size(Size::Small);

        $this->visible(
            fn (SignaturePad $component): bool => $component->isDownloadable()
        );
    }
}
