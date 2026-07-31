/**
 * QuoteGlyph — shared quotation-mark icon (24×24 viewBox, matches the icon
 * sprite style). Drawn bold so it reads clearly at small button sizes.
 *
 * Extracted to a single file to avoid triplicate copies across MessageBody,
 * QuoteButton, and QuotedMessagePreview (DRY).
 */

import React from 'react';

export const QuoteGlyph = React.memo(({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M7 7c-2.2 0-4 1.8-4 4v6h6v-6H5.5c0-1.7 1.3-3 3-3V7zm10 0c-2.2 0-4 1.8-4 4v6h6v-6h-3.5c0-1.7 1.3-3 3-3V7z" />
    </svg>
));
QuoteGlyph.displayName = 'QuoteGlyph';
