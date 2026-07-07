import React from 'react';
import { cn, fuzzyMatch } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollableOverlay } from '@/components/ui/ScrollableOverlay';
import { Icon } from '@/components/icon/Icon';
import { useSkillsStore } from '@/stores/useSkillsStore';

interface SkillMultiselectCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedSkillNames: string[]) => Promise<void> | void;
  /** Mobile renders the card edge-to-edge (full viewport width), breaking
   *  out of the chat-input-column padding. Desktop keeps it pinned to the
   *  composer width via left-0 w-full. */
  isMobile?: boolean;
}

interface SkillItem {
  name: string;
  scope: string;
  source?: string;
  description?: string;
}

const MAX_HEIGHT = 420;

const SkillRow = React.memo(function SkillRow({
  skill,
  selected,
  focused,
  onToggle,
  onMouseEnter,
}: {
  skill: SkillItem;
  selected: boolean;
  focused: boolean;
  onToggle: () => void;
  onMouseEnter: () => void;
}) {
  const isProject = skill.scope === 'project';
  const source = skill.source || 'opencode';

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onToggle}
      onMouseEnter={onMouseEnter}
      className={cn(
        'flex w-full items-start gap-2.5 px-3 py-2 text-left rounded-md transition-colors',
        focused ? 'bg-interactive-selection/50' : 'hover:bg-interactive-hover/30',
        selected ? 'bg-interactive-selection/30' : null,
      )}
    >
      <div className="mt-0.5 shrink-0">
        <Checkbox checked={selected} onChange={onToggle} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-sm break-all',
            selected ? 'text-foreground font-medium' : 'text-foreground/85',
          )}>
            {skill.name}
          </span>
          <span className={cn(
            'text-[10px] leading-none uppercase font-bold tracking-tight px-1.5 py-0.5 rounded border flex-shrink-0',
            isProject
              ? 'bg-[var(--status-info-background)] text-[var(--status-info)] border-[var(--status-info-border)]'
              : 'bg-[var(--status-success-background)] text-[var(--status-success)] border-[var(--status-success-border)]',
          )}>
            {skill.scope}
          </span>
          <span className="text-[10px] leading-none uppercase font-bold tracking-tight px-1.5 py-0.5 rounded border flex-shrink-0 bg-[var(--surface-muted)] text-muted-foreground border-[var(--interactive-border)]/60">
            {source}
          </span>
        </div>
        {skill.description ? (
          <div className="text-xs text-muted-foreground mt-0.5 break-words line-clamp-2">
            {skill.description}
          </div>
        ) : null}
      </div>
    </button>
  );
});

const SkillRowSkeleton = React.memo(function SkillRowSkeleton() {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2">
      <div className="mt-0.5 h-4 w-4 rounded bg-foreground/10 animate-pulse" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-1/3 rounded bg-foreground/10 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-foreground/5 animate-pulse" />
      </div>
    </div>
  );
});

export const SkillMultiselectCard: React.FC<SkillMultiselectCardProps> = ({
  open,
  onOpenChange,
  onConfirm,
  isMobile = false,
}) => {
  const skills = useSkillsStore((s) => s.skills);
  const loadSkills = useSkillsStore((s) => s.loadSkills);
  const isLoadingSkills = useSkillsStore((s) => s.isLoading);

  const [query, setQuery] = React.useState('');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);
  const itemRefs = React.useRef<(HTMLButtonElement | null)[]>([]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(new Set());
      setFocusedIndex(0);
      void loadSkills();
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, loadSkills]);

  const filtered = React.useMemo(() => {
    const normalized = query.trim();
    const matches = normalized.length
      ? skills.filter((s) => fuzzyMatch(s.name, normalized) || (s.description ? fuzzyMatch(s.description.slice(0, 80), normalized) : false))
      : skills;

    // Sort by scope (project first) then name. Do NOT reorder by selection
    // state — that would move items when toggled, throwing the user off.
    // The selected state is shown via the checkbox + a subtle highlight on the
    // row itself, which is enough signal without rearranging the list.
    return [...matches].sort((a, b) => {
      if (a.scope === 'project' && b.scope !== 'project') return -1;
      if (a.scope !== 'project' && b.scope === 'project') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [skills, query]);

  React.useEffect(() => {
    setFocusedIndex(0);
  }, [query]);

  React.useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  React.useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (containerRef.current && target && !containerRef.current.contains(target)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [open, onOpenChange]);

  const toggleSkill = React.useCallback((name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleConfirm = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(Array.from(selected));
      onOpenChange(false);
    } catch {
      // onConfirm surfaces its own toast
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onOpenChange(false);
      return;
    }
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((i) => (i + 1) % filtered.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !(e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const skill = filtered[focusedIndex];
      if (skill) toggleSkill(skill.name);
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (selected.size > 0 && !submitting) {
        void handleConfirm();
      }
      return;
    }
  };

  if (!open) return null;

  const selectedCount = selected.size;

  return (
    <div
      ref={containerRef}
      className={cn(
        'z-[200] bg-background border border-border/60 rounded-xl shadow-lg flex flex-col',
        // Desktop: anchor to the composer column (left-0 w-full fills the
        //   chat-input-column width, which is what we want on tablet/desktop).
        // Mobile: break out of the chat-input-column padding by going full
        //   viewport width (calc(100vw) with -left offset cancelling the parent
        //   padding). This makes the card edge-to-edge like a bottom sheet,
        //   matching MobileOverlayPanel behavior.
        isMobile
          ? 'fixed left-0 right-0 bottom-0 w-full max-h-[70dvh] rounded-b-none border-x-0 border-b-0'
          : 'absolute left-0 w-full max-w-[calc(100vw-2rem)]',
      )}
      style={{ maxHeight: isMobile ? undefined : MAX_HEIGHT }}
      role="dialog"
      aria-modal="true"
      aria-label="Load skills"
    >
      <div className="px-3 py-2 border-b border-border/20 flex items-center gap-2">
        <Icon name="book-open" className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Load skills</span>
        <span className="ml-auto typography-micro text-muted-foreground px-1.5 py-0.5 rounded bg-muted/30 border border-border/20">
          {selectedCount > 0 ? `${selectedCount} selected` : 'Select to load'}
        </span>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-interactive-hover/30 transition-colors"
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-3 py-2 border-b border-border/20">
        <div className="relative">
          <Icon name="search" className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search skills..."
            className="w-full bg-transparent border border-border/30 focus:border-primary rounded pl-7 pr-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors"
          />
          {query ? (
            <button
              type="button"
              onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
              aria-label="Clear"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <Icon name="close" className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>

      <ScrollableOverlay preventOverscroll outerClassName="flex-1 min-h-0" className="px-1 py-1">
        {isLoadingSkills && skills.length === 0 ? (
          <div className="space-y-0">
            {Array.from({ length: 6 }).map((_, i) => <SkillRowSkeleton key={i} />)}
          </div>
        ) : filtered.length ? (
          <div role="listbox">
            {filtered.map((skill, index) => (
              <SkillRow
                key={`${skill.name}-${skill.scope}`}
                skill={skill}
                selected={selected.has(skill.name)}
                focused={index === focusedIndex}
                onToggle={() => toggleSkill(skill.name)}
                onMouseEnter={() => setFocusedIndex(index)}
              />
            ))}
          </div>
        ) : (
          <div className="px-3 py-6 text-center">
            <Icon name="search" className="h-5 w-5 text-muted-foreground/40 mx-auto mb-2" />
            <div className="text-sm text-muted-foreground">
              {query ? `No skills match "${query}"` : 'No skills available'}
            </div>
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Clear search
              </button>
            ) : null}
          </div>
        )}
      </ScrollableOverlay>

      <div className={cn(
        'border-t border-border/20 flex items-center gap-2.5',
        // Mobile: bigger touch targets + no keyboard hints (touch has no keyboard)
        // Desktop: compact row with hints pushed to the right
        isMobile ? 'px-4 py-3' : 'px-3 py-2',
      )}>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={selectedCount === 0 || submitting}
          className={cn(
            'flex items-center gap-1.5 font-medium rounded transition-colors',
            // Touch-friendly: min 40px height on mobile, standard on desktop
            isMobile ? 'flex-1 justify-center py-2.5 text-sm' : 'px-3 py-1.5 text-sm',
            'bg-[rgb(var(--status-success)/0.1)] text-[var(--status-success)] hover:bg-[rgb(var(--status-success)/0.2)]',
            'disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]',
          )}
        >
          {submitting ? (
            <div className="animate-spin h-3.5 w-3.5 border border-current border-t-transparent rounded-full" />
          ) : (
            <Icon name="check" className="h-3.5 w-3.5" />
          )}
          {selectedCount > 0 ? `Load ${selectedCount} skill${selectedCount === 1 ? '' : 's'}` : 'Load'}
        </button>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          disabled={submitting}
          className={cn(
            'flex items-center gap-1.5 font-medium rounded transition-colors text-muted-foreground hover:text-foreground hover:bg-interactive-hover/30 disabled:opacity-50 active:scale-[0.98]',
            isMobile ? 'py-2.5 px-4 text-sm' : 'px-3 py-1.5 text-sm',
          )}
        >
          Cancel
        </button>
        {/* Keyboard hints are desktop-only — touch users have no keyboard */}
        {!isMobile ? (
          <div className="ml-auto text-[11px] text-muted-foreground/70 whitespace-nowrap">
            ↑↓ navigate • Enter toggle • <kbd className="px-1 py-0.5 rounded bg-muted/40 border border-border/30">⌘</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted/40 border border-border/30">↵</kbd> confirm
          </div>
        ) : null}
      </div>
    </div>
  );
};
