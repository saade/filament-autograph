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
        
        $clearAction = $getAction('clear');
        $downloadAction = $getAction('download');
        $undoAction = $getAction('undo');
        $doneAction = $getAction('done');
    @endphp

    <div
        ax-load="visible"
        ax-load-src="{{ \Filament\Support\Facades\FilamentAsset::getAlpineComponentSrc('filament-autograph', 'saade/filament-autograph') }}"
        ax-load-css="{{ \Filament\Support\Facades\FilamentAsset::getStyleHref('filament-autograph-styles', 'saade/filament-autograph') }}"
        x-data="signaturePad({
            backgroundColor: @js($getBackgroundColor()),
            backgroundColorOnDark: @js($getBackgroundColorOnDark()),
            confirmable: @js($isConfirmable),
            disabled: @js($isDisabled),
            dotSize: {{ $getDotSize() }},
            exportBackgroundColor: @js($getExportBackgroundColor()),
            exportPenColor: @js($getExportPenColor()),
            filename: '{{ $getFilename() }}',
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
            @class([
                'w-full h-36 rounded-lg border border-gray-300',
                'dark:bg-gray-900 dark:border-white/10',
                'opacity-75 bg-gray-50' => $isDisabled,
            ])
        ></canvas>

        <div class="flex items-center justify-end m-1 space-x-2">
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
