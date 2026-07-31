/**
 * QuoteButton — a hover-action button that toggles a quoted-message draft.
 *
 * Mirrors the existing context-pin button pattern (icon + active state colour)
 * so the two sit naturally side-by-side. The quote state lives in the
 * session-ui-store so it survives re-renders + is consumed on send.
 *
 * Design: single accent colour (var(--status-info)) matches the pin; the only
 * visual difference is the quotation-mark glyph. No new dependencies.
 */

import React from 'react';
import { QuoteGlyph } from './QuoteGlyph';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n/useI18n';
import { useSessionUIStore } from '@/sync/session-ui-store';
import type { QuotedMessage } from '@/sync/session-ui-store';

interface QuoteButtonProps {
    /** Stable id of the message being quoted. */
    messageId: string;
    /** Session the message belongs to. */
    sessionId: string | null | undefined;
    /** Plain-text excerpt for the chip preview + the injected quote. */
    text: string;
    /** Full text for the expand popover (falls back to text if absent). */
    fullText?: string;
    /** Who authored the quoted message — drives the chip label. */
    role: 'user' | 'assistant';
    /** ISO timestamp of the original message. */
    createdAt?: string;
    /** Size variant — assistant buttons are h-8 w-8, user buttons are h-6 w-6. */
    size?: 'sm' | 'md';
    /** Hide the button entirely (e.g. mini-chat surfaces). */
    hidden?: boolean;
}

export const QuoteButton = React.memo(({
    messageId,
    sessionId,
    text,
    fullText,
    role,
    createdAt,
    size = 'md',
    hidden = false,
}: QuoteButtonProps) => {
    const { t } = useI18n();
    const isActive = useSessionUIStore((state) => {
        if (!sessionId) return false;
        const list = state.quotedMessages.get(sessionId);
        return list ? list.some((q) => q.messageId === messageId) : false;
    });
    const toggleQuotedMessage = useSessionUIStore((state) => state.toggleQuotedMessage);

    const canQuote = Boolean(sessionId) && text.trim().length > 0;

    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        event.preventDefault();
        if (!sessionId || !canQuote) return;

        const quote: QuotedMessage = {
            messageId,
            sessionId,
            text: text.trim(),
            fullText: (fullText ?? text).trim(),
            role,
            createdAt,
        };
        toggleQuotedMessage(sessionId, quote);
    }, [canQuote, createdAt, fullText, messageId, role, sessionId, text, toggleQuotedMessage]);

    if (hidden || !canQuote) return null;

    const sizeClass = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
    const glyphClass = size === 'sm' ? 'h-5 w-5' : 'h-[22px] w-[22px]';

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'bg-transparent hover:text-foreground hover:!bg-transparent active:!bg-transparent focus-visible:!bg-transparent focus-visible:ring-2 focus-visible:ring-primary/50',
                        sizeClass,
                        isActive
                            ? 'text-[var(--status-info)]'
                            : 'text-muted-foreground',
                        !canQuote && 'opacity-50',
                    )}
                    disabled={!canQuote}
                    aria-pressed={isActive}
                    aria-label={t(isActive ? 'chat.messageBody.actions.removeQuote' : 'chat.messageBody.actions.quoteMessage')}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={handleClick}
                >
                    <QuoteGlyph className={glyphClass} />
                </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>
                {t(isActive ? 'chat.messageBody.actions.removeQuote' : 'chat.messageBody.actions.quoteMessage')}
            </TooltipContent>
        </Tooltip>
    );
});

QuoteButton.displayName = 'QuoteButton';
