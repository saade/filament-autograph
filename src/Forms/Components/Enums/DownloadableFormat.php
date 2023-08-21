<?php

namespace Saade\FilamentAutograph\Forms\Components\Enums;

enum DownloadableFormat: string
{
    case PNG = 'png';
    case JPG = 'jpg';
    case SVG = 'svg';

    public function getLabel(): string
    {
        return match ($this) {
            self::PNG => __('filament-autograph::filament-autograph.actions.download.formats.png'),
            self::JPG => __('filament-autograph::filament-autograph.actions.download.formats.jpg'),
            self::SVG => __('filament-autograph::filament-autograph.actions.download.formats.svg'),
        };
    }

    public function getMime(): string
    {
        return match ($this) {
            self::PNG => 'image/png',
            self::JPG => 'image/jpg',
            self::SVG => 'image/svg+xml',
        };
    }

    public function getExtension(): string
    {
        return match ($this) {
            self::PNG => 'png',
            self::JPG => 'jpg',
            self::SVG => 'svg',
        };
    }
}
