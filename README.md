# Filament Autograph

[![Latest Version on Packagist](https://img.shields.io/packagist/v/saade/filament-autograph.svg?style=flat-square)](https://packagist.org/packages/saade/filament-autograph)
[![Total Downloads](https://img.shields.io/packagist/dt/saade/filament-autograph.svg?style=flat-square)](https://packagist.org/packages/saade/filament-autograph)

<p align="center">
    <img src="https://raw.githubusercontent.com/saade/filament-autograph/3.x/art/cover.png" alt="Banner" style="width: 100%; max-width: 800px; border-radius: 10px" />
</p>

## Installation

You can install the package via composer:

```bash
composer require saade/filament-autograph
```

## Usage

```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

SignaturePad::make('signature')
```

## Configuration
### SignaturePad options.
> For reference: [https://github.com/szimek/signature_pad#options](https://github.com/szimek/signature_pad#options)
```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

SignaturePad::make('signature')
    ->label(__('Sign here'))
    ->dotSize(2.0)
    ->lineMinWidth(0.5)
    ->lineMaxWidth(2.5)
    ->throttle(16)
    ->minDistance(5)
    ->velocityFilterWeight(0.7)
```

### Customizing the pad background and pen color.
```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

SignaturePad::make('signature')
    ->backgroundColor('rgba(0,0,0,0)')  // Background color on light mode
    ->backgroundColorOnDark('#f0a')     // Background color on dark mode (defaults to backgroundColor)
    ->exportBackgroundColor('#f00')     // Background color on export (defaults to backgroundColor)
    ->penColor('#000')                  // Pen color on light mode
    ->penColorOnDark('#fff')            // Pen color on dark mode (defaults to penColor)
    ->exportPenColor('#0f0')            // Pen color on export (defaults to penColor)
```

### Allow download of the signature.
```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;
use Saade\FilamentAutograph\Forms\Components\Enums\DownloadableFormat;

SignaturePad::make('signature')
    ->filename('autograph')             // Filename of the downloaded file (defaults to 'signature')
    ->downloadable()                    // Allow download of the signature (defaults to false)
    ->downloadableFormats([             // Available formats for download (defaults to all)
        DownloadableFormat::PNG,
        DownloadableFormat::JPG,
        DownloadableFormat::SVG,
    ])
    ->downloadActionDropdownPlacement('center-end')     // Dropdown placement of the download action (defaults to 'bottom-end')
```

### Disabling clear, download, undo and done actions.
```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;

SignaturePad::make('signature')
    ->clearable(false)
    ->downloadable(false)
    ->undoable(false)
    ->confirmable(false)
```

### Requiring confirmation (Done button).
```php
SignaturePad::make('signature')
    ->confirmable()                 // Requires user to click on 'Done' (defaults to false)
```

### Customizing actions
```php
use Saade\FilamentAutograph\Forms\Components\SignaturePad;
use Filament\Forms\Actions\Action;

SignaturePad::make('signature')
    ->clearAction(fn (Action $action) => $action->button())
    ->downloadAction(fn (Action $action) => $action->color('primary'))
    ->undoAction(fn (Action $action) => $action->icon('heroicon-o-ctrl-z'))
    ->confirmAction(fn (Action $action) => $action->iconButton()->icon('heroicon-o-thumbs-up'))
```
## Changelog

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](.github/CONTRIBUTING.md) for details.

## Security Vulnerabilities

Please review [our security policy](../../security/policy) on how to report security vulnerabilities.

## Credits

- [Saade](https://github.com/saade)
- [All Contributors](../../contributors)

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

<br><br>
<p align="center">
    <a href="https://github.com/sponsors/saade">
        <img src="https://raw.githubusercontent.com/saade/filament-autograph/3.x/art/sponsor.png" alt="Sponsor Saade" style="width: 100%; max-width: 800px;" />
    </a>
</p>
