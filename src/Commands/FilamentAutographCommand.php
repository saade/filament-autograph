<?php

namespace Saade\FilamentAutograph\Commands;

use Illuminate\Console\Command;

class FilamentAutographCommand extends Command
{
    public $signature = 'filament-autograph';

    public $description = 'My command';

    public function handle(): int
    {
        $this->comment('All done');

        return self::SUCCESS;
    }
}
