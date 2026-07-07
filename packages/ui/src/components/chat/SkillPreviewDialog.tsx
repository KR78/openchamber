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
 * Mobile: DialogContent defaults to max-w-lg (centered). On mobile the base
 * Dialog component already handles full-screen behavior via its responsive
 * styling, so no extra isMobile logic is needed here.
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
          // Wider than the default max-w-lg — skill docs can be long + benefit
          // from horizontal room. Cap at max-w-2xl so it stays readable.
          'sm:max-w-2xl max-h-[85dvh] p-0',
        )}
      >
        <DialogHeader className="px-5 py-3 border-b border-border/20 flex-row items-center gap-2 space-y-0">
          <Icon name="book-open" className="h-4 w-4 text-primary shrink-0" />
          <DialogTitle className="text-sm font-medium truncate">{skillName}</DialogTitle>
          <div className="ml-auto flex items-center gap-1.5 shrink-0">
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
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          {hasContent ? (
            <SimpleMarkdownRenderer
              content={skillContent}
              variant="assistant"
              stripFrontmatter
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
