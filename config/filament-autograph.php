<?php

return [
    /**
     * Enable or disable the default theme styles provided by Filament Autograph.
     * Filament V4 is using a class-based strategy for styling, which doesn't
     * work well with packages providing a copy of the CSS-classes as well.
     * Therefore, the package should not load any CSS at all, but rather
     * be included in the main application custom theme. In order not
     * to break compatibility within a minor version, the CSS can
     * be disabled using this config option. This config option
     * and the asset should be removed in the next major tag.
     */
    'filament_autograph_styles_enabled' => true,
];
