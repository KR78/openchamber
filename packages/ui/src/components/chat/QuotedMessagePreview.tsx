/**
 * QuotedMessagePreview — a compact chip shown above the chat textarea when a
 * message is quoted for the next send.
 *
 * Behaviour:
 *  - Clicking the chip opens a popover with the full quoted text.
 *  - A close button clears the quote (calls clearQuotedMessage).
 *  - The quote is injected as a blockquote prefix into the next prompt by
 *    ChatInput.handleSubmit, then auto-cleared on send.
 *
 * Design notes (design-taste-frontend / vercel-react-best-practices):
 *  - Single accent colour (var(--status-info)) mirrors the existing context-pin
 *    pattern — no new palette introduced.
 *  - The popover uses fixed positioning to escape the chat-input's
 *    overflow-hidden container (an absolute-positioned popover would be clipped).
 *  - All state is local to this leaf component; the parent only passes the
 *    quote + handlers. No prop-drilling beyond one level.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/icon/Icon';
import type { QuotedMessage } from '@/sync/session-ui-store';

interface QuotedMessagePreviewProps {
    quote: QuotedMessage;
    onClear: () => void;
}

const PREVIEW_MAX_CHARS = 120;

function truncate(text: string, max: number): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

// Quotation-mark glyph — 24×24 viewBox matches the icon sprite for visual
// consistency with the other action-bar icons.
const QuoteMark = React.memo(({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M7 7c-2.2 0-4 1.8-4 4v6h6v-6H5.5c0-1.7 1.3-3 3-3V7zm10 0c-2.2 0-4 1.8-4 4v6h6v-6h-3.5c0-1.7 1.3-3 3-3V7z" />
    </svg>
));
QuoteMark.displayName = 'QuoteMark';

export const QuotedMessagePreview = React.memo(({ quote, onClear }: QuotedMessagePreviewProps) => {
    const [expanded, setExpanded] = React.useState(false);
    const chipRef = React.useRef<HTMLDivElement>(null);
    const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);
    const preview = React.useMemo(() => truncate(quote.text, PREVIEW_MAX_CHARS), [quote.text]);

    const openPopover = React.useCallback(() => {
        const chip = chipRef.current;
        if (!chip) return;
        const rect = chip.getBoundingClientRect();
        // Position above the chip, clamped to the viewport.
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
        const top = Math.max(8, rect.top - 8); // popover height is dynamic; CSS flips it above
        setPopoverPos({ top, left });
        setExpanded(true);
    }, []);

    const handleClick = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        if (expanded) {
            setExpanded(false);
        } else {
            openPopover();
        }
    }, [expanded, openPopover]);

    const handleClear = React.useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onClear();
    }, [onClear]);

    // Close popover on Escape or outside click
    React.useEffect(() => {
        if (!expanded) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpanded(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [expanded]);

    return (
        <>
            <div
                ref={chipRef}
                className="relative flex items-center gap-1 rounded-md border border-[var(--status-info)]/30 bg-[var(--status-info)]/5 pl-1.5 pr-0.5 py-0.5 max-w-[280px]"
            >
                <QuoteMark className="h-3.5 w-3.5 flex-shrink-0 text-[var(--status-info)]" />

                <button
                    type="button"
                    onClick={handleClick}
                    className="flex min-w-0 items-center gap-1 text-left typography-ui-label text-[var(--surface-mutedForeground)] hover:text-[var(--surface-foreground)] transition-colors"
                    aria-expanded={expanded}
                    aria-label="Expand quoted message"
                >
                    <span className="truncate">{preview}</span>
                </button>

                <button
                    type="button"
                    onClick={handleClear}
                    className="ml-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[var(--surface-mutedForeground)] hover:bg-[var(--interactive-hover)] hover:text-[var(--surface-foreground)]"
                    aria-label="Remove quote"
                    title="Remove quote"
                >
                    <Icon name="close" className="h-3 w-3" />
                </button>
            </div>

            {expanded && popoverPos && (
                <>
                    {/* Click-away backdrop */}
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setExpanded(false)}
                        aria-hidden
                    />
                    {/* Popover — fixed positioning escapes overflow-hidden ancestors */}
                    <div
                        role="dialog"
                        aria-label="Quoted message"
                        style={{
                            position: 'fixed',
                            top: `${popoverPos.top}px`,
                            left: `${popoverPos.left}px`,
                            transform: 'translateY(-100%)',
                            zIndex: 50,
                        }}
                        className={cn(
                            'w-[min(32rem,calc(100vw-16px))]',
                            'rounded-xl p-3',
                            'border border-[var(--interactive-border)] bg-[var(--surface-elevated)] text-[var(--surface-elevated-foreground)]',
                            'shadow-[0_4px_8px_-2px_rgba(0,0,0,0.08),0_12px_20px_-4px_rgba(0,0,0,0.08)]',
                            'animate-in fade-in-0 zoom-in-95 duration-150',
                        )}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-1.5 flex items-center gap-1.5 typography-ui-label font-medium text-muted-foreground">
                            <QuoteMark className="h-3 w-3 text-[var(--status-info)]" />
                            <span>Quoting {quote.role === 'user' ? 'your message' : 'assistant'}</span>
                        </div>
                        <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {quote.fullText}
                        </div>
                    </div>
                </>
            )}
        </>
    );
});

QuotedMessagePreview.displayName = 'QuotedMessagePreview';
