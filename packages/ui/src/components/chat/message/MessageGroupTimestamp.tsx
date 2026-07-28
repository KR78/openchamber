import React from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { Icon } from '@/components/icon/Icon';
import { formatTimestampForDisplay } from './timeFormat';

/**
 * Hover-revealed timestamp shown on the far right of a message group.
 *
 * Why: the only persistent timestamp in the chat is the turn-completion footer
 * at the very end of a session. There is no way to see when an individual
 * message or tool call was sent mid-conversation. This component surfaces the
 * message's creation time on hover, positioned at the right edge of the group
 * so it never overlaps the message content.
 *
 * Respects the user's 12h/24h time format preference (Settings → Chat) via the
 * shared `formatTimestampForDisplay` utility — same formatter the existing
 * message footer uses, so the two always agree.
 *
 * Performance:
 *   - Memoized (React.memo) with a custom comparator on the timestamp only —
 *     the formatted string is derived from the timestamp + preference, so we
 *     skip re-renders when neither changes (rerender-memo).
 *   - No React state, no effects, no event listeners — the hover reveal is
 *     pure CSS (opacity transition on group-hover), so it costs nothing when
 *     idle and never triggers parent re-renders (rendering-animate-svg-wrapper
 *     spirit: animate via CSS, not JS).
 *   - pointer-events-none so it never intercepts clicks meant for the message.
 *
 * Placement: rendered inside the `group` div in ChatMessage, absolutely
 * positioned to the right edge, vertically centered on the first line. The
 * parent group already has `position: relative` via `chat-message-column`, but
 * this element is anchored to the outer group div (which is `position: static`
 * by default — we add `relative` to it in ChatMessage so the absolute child
 * resolves against it).
 */
export interface MessageGroupTimestampProps {
    /** Epoch ms when the message was created. */
    timestamp: number;
}

const MessageGroupTimestampComponent: React.FC<MessageGroupTimestampProps> = ({ timestamp }) => {
    const timeFormatPreference = useUIStore((state) => state.timeFormatPreference);
    // Derive during render (rerender-derived-state-no-effect). Cheap pure call;
    // no need for useMemo — the comparator below prevents re-renders when the
    // inputs are unchanged.
    const formatted = formatTimestampForDisplay(timestamp, timeFormatPreference);
    if (!formatted) return null;

    return (
        <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-0 z-10 flex items-center gap-1 select-none whitespace-nowrap text-xs tabular-nums text-muted-foreground/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        >
            <Icon name="time" className="h-3 w-3" />
            {formatted}
        </span>
    );
};

// Custom comparator: only re-render when the timestamp or preference changes.
// The formatted string is a pure function of these two inputs, so this is
// sufficient + avoids re-renders from parent state churn (rerender-memo).
export const MessageGroupTimestamp = React.memo(
    MessageGroupTimestampComponent,
    (prev, next) => prev.timestamp === next.timestamp,
);
