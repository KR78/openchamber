import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SimpleMarkdownRenderer } from './MarkdownRenderer';
import { Icon } from '@/components/icon/Icon';
import { cn } from '@/lib/utils';

interface SkillPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillName: string;
  skillContent?: string;
  skillScope?: string;
  skillSource?: string;
}

/**
 * Modal previewing a skill's markdown content.
 *
 * Renders via SimpleMarkdownRenderer (the lightweight variant — no streaming,
 * no file references, no message context needed). Frontmatter is stripped so
 * the YAML header doesn't render as ugly raw text.
 *
 * Layout:
 *  - Header: icon + name (flex-1, truncates) + scope/source badges + close
 *    button. All in one row, properly aligned. The default DialogContent close
 *    button is disabled (showCloseButton={false}) because it's absolutely
 *    positioned + would overlap the badges.
 *  - Body: scrollable markdown render, tight padding so more chars fit per line.
 *    Mobile padding matches desktop via [--pwa-dialog-padding:0px] (overrides
 *    the .pwa-dialog-content mobile rule that adds clamp(0.75rem, 3vw, 1.25rem)).
 */
export const SkillPreviewDialog: React.FC<SkillPreviewDialogProps> = ({
  open,
  onOpenChange,
  skillName,
  skillContent,
  skillScope,
  skillSource,
}) => {
  const hasContent = typeof skillContent === 'string' && skillContent.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          // Wider than the default max-w-lg — skill docs are long + benefit
          // from horizontal room. p-0 + gap-0: we render our own header/body
          // padding (tighter than the default p-6 gap-4) so more characters
          // fit per line.
          'sm:max-w-2xl max-h-[85dvh] p-0 gap-0',
          // Override the mobile .pwa-dialog-content padding (which adds
          // clamp(0.75rem, 3vw, 1.25rem) on PWA standalone). We want the
          // modal to match desktop padding (px-4 py-3 on the body) so the
          // same amount of content fits per line on mobile + desktop.
          '[--pwa-dialog-padding:0px]',
        )}
        // Hide the default absolute-positioned close button — it overlaps
        // the header badges. We render our own inside the header row instead.
        showCloseButton={false}
      >
        <DialogHeader className="px-4 py-2.5 border-b border-border/20 flex-row items-center gap-2 space-y-0">
          <Icon name="book-open" className="h-4 w-4 text-primary shrink-0" />
          <DialogTitle className="text-sm font-medium truncate flex-1 min-w-0">
            {skillName}
          </DialogTitle>
          <div className="flex items-center gap-1.5 shrink-0">
            {skillScope ? (
              <span className="text-[10px] leading-none uppercase font-bold tracking-tight px-1.5 py-0.5 rounded border bg-[var(--status-info-background)] text-[var(--status-info)] border-[var(--status-info-border)]">
                {skillScope}
              </span>
            ) : null}
            {skillSource ? (
              <span className="text-[10px] leading-none uppercase font-bold tracking-tight px-1.5 py-0.5 rounded border bg-[var(--surface-muted)] text-muted-foreground border-[var(--interactive-border)]/60">
                {skillSource}
              </span>
            ) : null}
          </div>
          {/* Close button — rendered inside the header so it sits cleanly at
              the top-right of the modal, aligned with the title + badges. */}
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-interactive-hover/30 transition-colors shrink-0"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {hasContent ? (
            <SimpleMarkdownRenderer
              content={skillContent}
              variant="assistant"
              frontmatter="hide"
              className="text-sm"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="error-warning" className="h-6 w-6 text-muted-foreground/40 mb-2" />
              <div className="text-sm text-muted-foreground">
                No content available for this skill.
              </div>
              <div className="text-xs text-muted-foreground/60 mt-1">
                The skill file may be empty or unreadable.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
