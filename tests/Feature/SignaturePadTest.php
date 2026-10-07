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

it('tells the browser whether a saved signature can be cleared', function () {
    signatureForm()->assertSeeHtml('clearable: true');

    signatureForm(fn (SignaturePad $field) => $field->clearable(false))->assertSeeHtml('clearable: false');
});

it('keys the pad so that it is built again when an option that shapes it changes', function () {
    $enabled = signatureForm()->html();
    $disabled = signatureForm(fn (SignaturePad $field) => $field->disabled())->html();

    preg_match('/wire:key="([^"]+)"[^>]*x-load/s', $enabled, $enabledKey);
    preg_match('/wire:key="([^"]+)"[^>]*x-load/s', $disabled, $disabledKey);

    expect($enabledKey[1] ?? null)->not->toBeNull()
        ->and($disabledKey[1] ?? null)->not->toBeNull()
        ->and($enabledKey[1])->not->toBe($disabledKey[1]);
});

it('makes a confirmable pad required, and leaves one that is not confirmable alone', function () {
    $isRequired = fn (?Closure $configureUsing): bool => signatureForm($configureUsing)->instance()->form->getFlatFields()['signature']->isRequired();

    expect($isRequired(fn (SignaturePad $field) => $field->confirmable()))->toBeTrue()
        ->and($isRequired(fn (SignaturePad $field) => $field->confirmable(false)))->toBeFalse()
        ->and($isRequired(fn (SignaturePad $field) => $field->required()->confirmable(false)))->toBeTrue()
        ->and($isRequired(fn (SignaturePad $field) => $field->confirmable(shouldMakeComponentRequired: false)))->toBeFalse();
});

it('survives a filename with a quote in it', function () {
    signatureForm(fn (SignaturePad $field) => $field->filename("O'Brien"))
        ->assertOk()
        ->assertDontSeeHtml("filename: 'O'Brien'")
        ->assertSeeHtml('filename: ');
});

it('downloads a JPEG as a JPEG', function () {
    signatureForm(fn (SignaturePad $field) => $field->downloadable())
        ->assertSeeHtml("downloadAs('image/jpeg', 'jpg')")
        ->assertDontSeeHtml('image/jpg');
});

it('gives the canvas the id its label points at, and a name for assistive technology', function () {
    signatureForm(fn (SignaturePad $field) => $field->label('Customer signature'))
        ->assertSeeHtml(['role="img"', 'aria-label="Customer signature"', 'id="form.signature"']);
});
