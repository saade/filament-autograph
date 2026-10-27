@php
    use Saade\FilamentAutograph\Forms\Components\Enums\DownloadableFormat;
@endphp

<x-dynamic-component
    :component="$getFieldWrapperView()"
    :field="$field"
>
    @php
        $isDisabled = $isDisabled();
        $isClearable = $isClearable();
        $isDownloadable = $isDownloadable();
        $downloadableFormats = $getDownloadableFormats();
        $downloadActionDropdownPlacement = $getDownloadActionDropdownPlacement() ?? 'bottom-start';
        $isUndoable = $isUndoable();
        $isConfirmable = $isConfirmable();

        $canvasWidth = $getCanvasWidth();
        $canvasHeight = $getCanvasHeight();
        $hasFixedCanvasResolution = $canvasWidth !== null && $canvasHeight !== null;
        $isCropSignatureEnabled = $isCropSignatureEnabled();
        $cropPadding = $getCropPadding();

        $clearAction = $getAction('clear');
        $downloadAction = $getAction('download');
        $undoAction = $getAction('undo');
        $doneAction = $getAction('done');
    @endphp

    <div
        wire:ignore
        wire:key="{{ $getLivewireKey() }}.{{ md5(serialize([$isDisabled, $isClearable, $isConfirmable, $canvasWidth, $canvasHeight, $isCropSignatureEnabled, $cropPadding])) }}"
        x-load
        x-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('filament-autograph-alpine', 'saade/filament-autograph') }}"
        x-data="signaturePadFormComponent({
            backgroundColor: @js($getBackgroundColor()),
            backgroundColorOnDark: @js($getBackgroundColorOnDark()),
            canvasHeight: @js($canvasHeight),
            canvasWidth: @js($canvasWidth),
            clearable: @js($isClearable),
            confirmable: @js($isConfirmable),
            cropPadding: {{ $cropPadding }},
            cropSignature: @js($isCropSignatureEnabled),
            disabled: @js($isDisabled),
            dotSize: {{ $getDotSize() }},
            exportBackgroundColor: @js($getExportBackgroundColor()),
            exportPenColor: @js($getExportPenColor()),
            filename: @js($getFilename()),
            maxWidth: {{ $getLineMaxWidth() }},
            minDistance: {{ $getMinDistance() }},
            minWidth: {{ $getLineMinWidth() }},
            penColor: @js($getPenColor()),
            penColorOnDark: @js($getPenColorOnDark()),
            state: $wire.{{ $applyStateBindingModifiers("\$entangle('{$getStatePath()}')") }},
            throttle: {{ $getThrottle() }},
            velocityFilterWeight: {{ $getVelocityFilterWeight() }},
        })"
    >
        <canvas
            x-ref="canvas"
            wire:ignore
            id="{{ $getId() }}"
            role="img"
            aria-label="{{ strip_tags((string) $getLabel()) }}"
            @if ($hasFixedCanvasResolution)
                {{-- The backing store starts at the fixed resolution, and the element keeps its ratio, so the strokes are drawn on the full backing store whatever the screen. --}}
                width="{{ $canvasWidth }}"
                height="{{ $canvasHeight }}"
                style="aspect-ratio: {{ $canvasWidth }} / {{ $canvasHeight }};"
            @endif
            {{-- Tailwind's `dark:` variant follows the browser unless the application's stylesheet is set up otherwise, which can disagree with the theme the pad draws in. --}}
            x-bind:class="{
                'border-gray-300': ! isDark,
                'bg-gray-900 border-white/10': isDark,
                'bg-gray-50': ! isDark && @js($isDisabled),
            }"
            @class([
                'w-full rounded-lg border',
                'h-36' => ! $hasFixedCanvasResolution,
                'opacity-75' => $isDisabled,
            ])
        ></canvas>

        <div class="flex items-center justify-end mt-3 space-x-2">
            @if ($isClearable)
                {{ $clearAction }}
            @endif

            @if ($isUndoable)
                {{ $undoAction }}
            @endif

            @if ($isDownloadable)
                <x-filament::dropdown placement="{{ $downloadActionDropdownPlacement }}">
                    <x-slot name="trigger">
                        {{ $downloadAction }}
                    </x-slot>

                    <x-filament::dropdown.list>
                        @if (in_array(DownloadableFormat::PNG, $downloadableFormats))
                            <x-filament::dropdown.list.item
                                x-on:click="downloadAs('{{ DownloadableFormat::PNG->getMime() }}', '{{ DownloadableFormat::PNG->getExtension() }}')"
                            >
                                {{ DownloadableFormat::PNG->getLabel() }}
                            </x-filament::dropdown.list.item>
                        @endif

                        @if (in_array(DownloadableFormat::JPG, $downloadableFormats))
                            <x-filament::dropdown.list.item
                                x-on:click="downloadAs('{{ DownloadableFormat::JPG->getMime() }}', '{{ DownloadableFormat::JPG->getExtension() }}')"
                            >
                                {{ DownloadableFormat::JPG->getLabel() }}
                            </x-filament::dropdown.list.item>
                        @endif

                        @if (in_array(DownloadableFormat::SVG, $downloadableFormats))
                            <x-filament::dropdown.list.item
                                x-on:click="downloadAs('{{ DownloadableFormat::SVG->getMime() }}', '{{ DownloadableFormat::SVG->getExtension() }}')"
                            >
                                {{ DownloadableFormat::SVG->getLabel() }}
                            </x-filament::dropdown.list.item>
                        @endif
                    </x-filament::dropdown.list>
                </x-filament::dropdown>
            @endif

            @if ($isConfirmable)
                {{ $doneAction }}
            @endif
        </div>
    </div>
</x-dynamic-component>
