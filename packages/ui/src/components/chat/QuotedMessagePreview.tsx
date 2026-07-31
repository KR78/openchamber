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
import { QuoteGlyph } from './message/QuoteGlyph';
import type { QuotedMessage } from '@/sync/session-ui-store';

interface QuotedMessagePreviewProps {
    quotes: QuotedMessage[];
    onRemove: (messageId: string) => void;
}

const PREVIEW_MAX_CHARS = 120;

function truncate(text: string, max: number): string {
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean;
}

export const QuotedMessagePreview = React.memo(({ quotes, onRemove }: QuotedMessagePreviewProps) => {
    const [expandedIndex, setExpandedIndex] = React.useState<string | null>(null);
    const chipRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());
    const [popoverPos, setPopoverPos] = React.useState<{ top: number; left: number } | null>(null);

    const openPopover = React.useCallback((messageId: string) => {
        const chip = chipRefs.current.get(messageId);
        if (!chip) return;
        const rect = chip.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - 360));
        const top = Math.max(8, rect.top - 8);
        setPopoverPos({ top, left });
        setExpandedIndex(index);
    }, []);

    const handleClick = React.useCallback((messageId: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        if (expandedIndex === messageId) {
            setExpandedIndex(null);
        } else {
            openPopover(messageId);
        }
    }, [expandedIndex, openPopover]);

    const handleRemove = React.useCallback((messageId: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        onRemove(messageId);
    }, [onRemove]);

    React.useEffect(() => {
        if (expandedIndex === null) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpandedIndex(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [expandedIndex]);

    if (quotes.length === 0) return null;

    const activeQuote = expandedIndex !== null ? quotes.find((q) => q.messageId === expandedIndex) ?? null : null;

    return (
        <>
            <div className="flex flex-wrap items-center gap-1 max-w-full">
                {quotes.map((quote, index) => (
                    <div
                        key={quote.messageId}
                        ref={(el) => {
                            if (el) chipRefs.current.set(quote.messageId, el);
                            else chipRefs.current.delete(quote.messageId);
                        }}
                        className="relative flex items-center gap-1 rounded-md border border-[var(--status-info)]/30 bg-[var(--status-info)]/5 pl-1.5 pr-0.5 py-0.5 max-w-[280px]"
                    >
                        <QuoteGlyph className="h-3.5 w-3.5 flex-shrink-0 text-[var(--status-info)]" />
                        <button
                            type="button"
                            onClick={handleClick(quote.messageId)}
                            className="flex min-w-0 items-center gap-1 text-left typography-ui-label text-[var(--surface-mutedForeground)] hover:text-[var(--surface-foreground)] transition-colors"
                            aria-expanded={expandedIndex === quote.messageId}
                            aria-label="Expand quoted message"
                        >
                            <span className="truncate">{truncate(quote.text, PREVIEW_MAX_CHARS)}</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleRemove(quote.messageId)}
                            className="ml-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[var(--surface-mutedForeground)] hover:bg-[var(--interactive-hover)] hover:text-[var(--surface-foreground)]"
                            aria-label="Remove quote"
                            title="Remove quote"
                        >
                            <Icon name="close" className="h-3 w-3" />
                        </button>
                    </div>
                ))}
            </div>

            {activeQuote && popoverPos && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setExpandedIndex(null)}
                        aria-hidden
                    />
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
                            <QuoteGlyph className="h-3 w-3 text-[var(--status-info)]" />
                            <span>Quoting {activeQuote.role === 'user' ? 'your message' : 'assistant'}</span>
                        </div>
                        <div className="max-h-[40vh] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {activeQuote.fullText}
                        </div>
                    </div>
                </>
            )}
        </>
    );
});

QuotedMessagePreview.displayName = 'QuotedMessagePreview';
