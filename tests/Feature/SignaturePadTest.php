<?php

use Livewire\Livewire;
use Saade\FilamentAutograph\Forms\Components\SignaturePad;
use Saade\FilamentAutograph\Tests\Fixtures\SignatureForm;

afterEach(fn () => SignatureForm::$configureUsing = null);

function signatureForm(?Closure $configureUsing = null)
{
    SignatureForm::$configureUsing = $configureUsing;

    return Livewire::test(SignatureForm::class);
}

it('renders the pad with its Alpine component and a canvas', function () {
    signatureForm()
        ->assertOk()
        ->assertSeeHtml(['signaturePadFormComponent(', 'x-ref="canvas"', 'filament-autograph']);
});

it('passes its options to the browser', function () {
    signatureForm(fn (SignaturePad $field) => $field
        ->dotSize(3.5)
        ->lineMinWidth(1.5)
        ->lineMaxWidth(4.5)
        ->throttle(8)
        ->minDistance(2)
        ->velocityFilterWeight(0.5)
        ->penColor('#123456')
        ->backgroundColor('#abcdef'))
        ->assertSeeHtml([
            'dotSize: 3.5',
            'minWidth: 1.5',
            'maxWidth: 4.5',
            'throttle: 8',
            'minDistance: 2',
            'velocityFilterWeight: 0.5',
            "penColor: '#123456'",
            "backgroundColor: '#abcdef'",
        ]);
});

it('shows the clear and undo actions by default, and neither download nor done', function () {
    $field = signatureForm()->instance()->form->getFlatFields()['signature'];

    expect($field->isClearable())->toBeTrue()
        ->and($field->isUndoable())->toBeTrue()
        ->and($field->isDownloadable())->toBeFalse()
        ->and($field->isConfirmable())->toBeFalse();
});

it('offers the download formats it is given', function () {
    signatureForm(fn (SignaturePad $field) => $field->downloadable())
        ->assertSeeHtml(["downloadAs('image/png', 'png')", "'svg')"]);
});

it('keeps the signature as the state of the field', function () {
    $signature = 'data:image/png;base64,' . base64_encode('signature');

    signatureForm()
        ->fillForm(['signature' => $signature])
        ->call('save')
        ->assertSet('data.signature', $signature);
});

it('can be required', function () {
    signatureForm(fn (SignaturePad $field) => $field->required())
        ->call('save')
        ->assertHasFormErrors(['signature' => 'required']);
});

it('has its labels in every language it ships', function (string $locale) {
    app()->setLocale($locale);

    foreach (['actions.clear.label', 'actions.undo.label', 'actions.download.label', 'actions.done.label'] as $key) {
        expect(__("filament-autograph::filament-autograph.{$key}"))->not->toStartWith('filament-autograph::');
    }
})->with(['en', 'pt_BR']);

it('loads the pad without waiting for it to be visible or for a modal event', function () {
    signatureForm()
        ->assertSeeHtml('x-load')
        ->assertDontSeeHtml(['ax-modal-opened', 'x-load="visible']);
});

it('still accepts a load strategy, which no longer does anything', function () {
    signatureForm(fn (SignaturePad $field) => $field->loadStrategy('idle'))
        ->assertOk()
        ->assertDontSeeHtml('x-load="idle"');
});
