<?php

namespace Saade\FilamentAutograph\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @see \Saade\FilamentAutograph\FilamentAutograph
 */
class FilamentAutograph extends Facade
{
    protected static function getFacadeAccessor()
    {
        return \Saade\FilamentAutograph\FilamentAutograph::class;
    }
}
