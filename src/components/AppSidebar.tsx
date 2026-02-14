import { LayoutDashboard, Calendar, List, Sun, Plus, Search, ChevronLeft, ChevronRight, Settings, Download } from 'lucide-react';
import * as Icons from 'lucide-react';
import React from 'react';
const icons = Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>;
const getIcon = (name: string) => icons[name] || icons['Star'];
import { useApp } from '@/contexts/AppContext';
import { ViewType, Priority } from '@/types/task';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CategorySettingsModal } from './CategorySettingsModal';
import { ExportModal } from './ExportModal';
import { AppSettingsModal } from './AppSettingsModal';
import { addDays, startOfWeek } from 'date-fns';

const navItems: { icon: typeof LayoutDashboard; label: string; view: ViewType }[] = [
  { icon: LayoutDashboard, label: 'Dashboard', view: 'dashboard' },
  { icon: Sun, label: 'My Day', view: 'my-day' },
  { icon: Calendar, label: 'Calendar', view: 'calendar' },
  { icon: List, label: 'All Tasks', view: 'list' },
];

export function AppSidebar() {
  const { view, setView, tasks, categories, searchQuery, setSearchQuery, setIsTaskModalOpen, setEditingTask, addTask, settings } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [categorySettingsOpen, setCategorySettingsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [appSettingsOpen, setAppSettingsOpen] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');

  const todoCount = tasks.filter(t => t.status === 'todo').length;
  const overdueCount = tasks.filter(t => {
    if (t.status === 'completed') return false;
    const due = new Date(t.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  }).length;

  const handleNewTask = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const parseQuickAdd = (s: string) => {
    let title = s.trim();
    let dueDate = '';
    let dueTime = '';
    let categoryId = settings.defaultCategoryId || categories[0]?.id || 'personal';
    let priority: Priority = settings.defaultPriority;
    const lower = s.toLowerCase();
    const nextMatch = /next\s+(sun|mon|tue|wed|thu|fri|sat)/i.exec(lower);
    if (nextMatch) {
      const map: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
      const target = map[nextMatch[1].slice(0,3)];
      const now = new Date();
      const todayIdx = now.getDay();
      const delta = (target - todayIdx + 7) % 7 || 7;
      const next = addDays(now, delta);
      dueDate = next.toISOString().slice(0,10);
    }
    const nextWeekMatch = /next\s+week\s+(sun|mon|tue|wed|thu|fri|sat)/i.exec(lower);
    if (nextWeekMatch) {
      const map: Record<string, number> = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 };
      const target = map[nextWeekMatch[1].slice(0,3)];
      const now = new Date();
      const sw = startOfWeek(now);
      const nextWeekStart = addDays(sw, 7);
      const next = addDays(nextWeekStart, target);
      dueDate = next.toISOString().slice(0,10);
    }
    const inMatch = /in\s+(\d+)\s*(m|h|d|w)\b/i.exec(lower);
    if (inMatch) {
      const amt = parseInt(inMatch[1], 10);
      const unit = inMatch[2].toLowerCase();
      const now = new Date();
      if (unit === 'd') {
        const next = addDays(now, amt);
        dueDate = next.toISOString().slice(0,10);
      } else if (unit === 'w') {
        const next = addDays(now, amt * 7);
        dueDate = next.toISOString().slice(0,10);
      } else {
        const ms = unit === 'h' ? amt * 3600000 : amt * 60000;
        const next = new Date(now.getTime() + ms);
        dueDate = next.toISOString().slice(0,10);
        dueTime = `${String(next.getHours()).padStart(2,'0')}:${String(next.getMinutes()).padStart(2,'0')}`;
      }
    }
    const words = s.split(/\s+/);
    for (const w of words) {
      if (/^#\w+$/i.test(w)) {
        const name = w.slice(1).toLowerCase();
        const match = categories.find(c => c.name.toLowerCase() === name || c.id.toLowerCase() === name);
        if (match) categoryId = match.id;
      } else if (/^!?(high|medium|low)$/i.test(w)) {
        const p = w.replace('!', '').toLowerCase();
        if (p === 'high' || p === 'medium' || p === 'low') priority = p as Priority;
      } else if (/^\d{1,2}(:\d{2})?(am|pm)?$/i.test(w)) {
        let t = w.toLowerCase();
        const ampm = /(am|pm)$/.exec(t)?.[0] || '';
        t = t.replace(/(am|pm)$/,'');
        const [h, m] = t.split(':');
        let hh = parseInt(h, 10);
        if (ampm === 'pm' && hh < 12) hh += 12;
        if (ampm === 'am' && hh === 12) hh = 0;
        dueTime = `${String(hh).padStart(2,'0')}:${String(m ? parseInt(m,10) : 0).padStart(2,'0')}`;
      } else if (/^(today|tomorrow)$/i.test(w)) {
        const base = w.toLowerCase() === 'today' ? new Date() : new Date(Date.now() + 86400000);
        dueDate = base.toISOString().slice(0,10);
      } else if (/^\d{4}-\d{2}-\d{2}$/.test(w)) {
        dueDate = w;
      }
    }
    title = title
      .replace(/#\w+/g,'')
      .replace(/!?(high|medium|low)/ig,'')
      .replace(/\b(today|tomorrow)\b/ig,'')
      .replace(/\bnext\s+(sun|mon|tue|wed|thu|fri|sat)\b/ig,'')
      .replace(/\bnext\s+week\s+(sun|mon|tue|wed|thu|fri|sat)\b/ig,'')
      .replace(/\bin\s+\d+\s*(m|h|d|w)\b/ig,'')
      .replace(/\b\d{1,2}(:\d{2})?(am|pm)?\b/ig,'')
      .trim();
    return { title, dueDate, dueTime, categoryId, priority };
  };

  const handleQuickAdd = () => {
    if (!quickTitle.trim()) return;
    const parsed = parseQuickAdd(quickTitle);
    const nowDate = new Date().toISOString().slice(0,10);
    const task = addTask({
      title: parsed.title || quickTitle.trim(),
      description: '',
      dueDate: parsed.dueDate || nowDate,
      dueTime: parsed.dueTime || '',
      priority: parsed.priority,
      status: 'todo',
      categoryId: parsed.categoryId,
      reminder: { type: settings.defaultReminderType, notified: false },
      repeatType: 'none',
    });
    setQuickTitle('');
  };

  return (
    <>
      <aside
        className={cn(
          'h-screen sticky top-0 flex flex-col border-r border-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          {!collapsed && (
            <h1 className="text-lg font-bold text-primary tracking-tight">Your Day Tracker</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground transition-colors"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-3 mb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm bg-accent/50 border-0"
              />
            </div>
          </div>
        )}

        {/* New Task Button */}
        <div className="px-3 mb-4">
          <Button
            onClick={handleNewTask}
            className={cn('w-full gap-2', collapsed && 'px-0')}
            size="sm"
          >
            <Plus size={16} />
            {!collapsed && 'New Task'}
          </Button>
        </div>

        {!collapsed && (
          <div className="px-3 mb-4">
            <div className="flex gap-2">
              <Input
                placeholder="Quick add: Pay bill tomorrow 9am #personal !high"
                value={quickTitle}
                onChange={e => setQuickTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd(); }}
                className="h-8 text-sm bg-accent/50 border-0 flex-1"
              />
              <Button size="sm" onClick={handleQuickAdd}>Add</Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-0.5">
          {navItems.map(item => (
            <button
              key={item.view}
              onClick={() => setView(item.view)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                view === item.view
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.view === 'list' && todoCount > 0 && (
                    <span className="text-xs bg-accent/50 px-1.5 py-0.5 rounded-full">
                      {todoCount}
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>

        {/* Categories */}
        {!collapsed && (
          <div className="px-3 pb-3">
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categories
              </p>
              <button
                onClick={() => setCategorySettingsOpen(true)}
                className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                title="Manage categories"
              >
                <Settings size={12} />
              </button>
            </div>
            <div className="space-y-0.5">
              {categories.map(cat => {
                const count = tasks.filter(t => t.categoryId === cat.id && t.status !== 'completed').length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground rounded-md"
                  >
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: cat.color }} />
                    {React.createElement(getIcon(cat.icon), { size: 14, className: 'opacity-60' })}
                    <span className="flex-1">{cat.name}</span>
                    {count > 0 && <span className="text-xs">{count}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Overdue badge */}
        {!collapsed && overdueCount > 0 && (
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
              {overdueCount} overdue
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="px-3 pb-4">
          <button
            onClick={() => setExportOpen(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <Download size={16} />
            {!collapsed && 'Export Tasks'}
          </button>
          <button
            onClick={() => setAppSettingsOpen(true)}
            className={cn(
              'mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
              collapsed && 'justify-center'
            )}
          >
            <Settings size={16} />
            {!collapsed && 'App Settings'}
          </button>
        </div>
      </aside>

      <CategorySettingsModal open={categorySettingsOpen} onOpenChange={setCategorySettingsOpen} />
      <ExportModal open={exportOpen} onOpenChange={setExportOpen} />
      <AppSettingsModal open={appSettingsOpen} onOpenChange={setAppSettingsOpen} />
    </>
  );
}
