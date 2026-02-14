import { useApp } from '@/contexts/AppContext';
import { CommandDialog } from '@/components/ui/command';
import { useState } from 'react';

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { setIsTaskModalOpen, setView, setSearchQuery, setEditingTask, setSelectedDate } = useApp();

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="p-2">
        <div className="text-xs text-muted-foreground px-2 pb-2">Actions</div>
        <div className="space-y-1">
          <button
            className="w-full text-left px-2 py-1.5 rounded hover:bg-accent"
            onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); onOpenChange(false); }}
          >
            New Task
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { setView('dashboard'); onOpenChange(false); }}>
            Go to Dashboard
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { setView('calendar'); onOpenChange(false); }}>
            Go to Calendar
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { setView('list'); onOpenChange(false); }}>
            Go to All Tasks
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { setView('my-day'); onOpenChange(false); }}>
            Go to My Day
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { const el = document.querySelector<HTMLInputElement>('input[placeholder="Search tasks..."]'); el?.focus(); onOpenChange(false); }}>
            Focus Search
          </button>
          <button className="w-full text-left px-2 py-1.5 rounded hover:bg-accent" onClick={() => { setSelectedDate(new Date()); setView('calendar'); onOpenChange(false); }}>
            Jump to Today
          </button>
        </div>
      </div>
    </CommandDialog>
  );
}
