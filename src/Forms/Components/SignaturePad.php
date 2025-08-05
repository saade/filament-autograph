<?php

namespace Saade\FilamentAutograph\Forms\Components;

use Closure;
use Filament\Actions\Action;
use Filament\Forms\Components\Field;
use Saade\FilamentAutograph\Forms\Components\Concerns\HasActions;
use Saade\FilamentAutograph\Forms\Components\Concerns\HasOptions;

class SignaturePad extends Field
{
    use HasActions;
    use HasOptions;

    protected string $view = 'filament-autograph::signature-pad';

    protected function setUp(): void
    {
        parent::setUp();

        $this->registerActions([
            fn (SignaturePad $component): Action => $component->getClearAction(),
            fn (SignaturePad $component): Action => $component->getDownloadAction(),
            fn (SignaturePad $component): Action => $component->getUndoAction(),
            fn (SignaturePad $component): Action => $component->getDoneAction(),
        ]);
    }
}
