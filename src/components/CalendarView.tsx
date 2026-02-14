import React from 'react';
import { useApp } from '@/contexts/AppContext';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameMonth, isSameDay, isToday, addMonths, subMonths, addHours, isWithinInterval, compareDesc,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCard } from './TaskCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function CalendarView() {
  const { tasks, selectedDate, setSelectedDate, setIsTaskModalOpen, setEditingTask, searchQuery, updateTask } = useApp();
  const [mode, setMode] = React.useState<'month' | 'week' | 'day'>('month');
  const [plannerOpen, setPlannerOpen] = React.useState(false);
  const [maxPerDay, setMaxPerDay] = React.useState(5);
  const [assignTimes, setAssignTimes] = React.useState(true);
  const [planPreview, setPlanPreview] = React.useState<Record<string, string[]>>({});

  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const tasksForDay = (day: Date) =>
    tasks.filter(t => isSameDay(new Date(t.dueDate), day));

  const selectedDayTasks = tasks
    .filter(t => isSameDay(new Date(t.dueDate), selectedDate))
    .filter(t => !searchQuery || t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const handlePrev = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNext = () => setSelectedDate(addMonths(selectedDate, 1));

  const handleAddOnDate = (day: Date) => {
    setSelectedDate(day);
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const buildWeekPlan = () => {
    const start = startOfWeek(selectedDate);
    const end = endOfWeek(selectedDate);
    const weekDays = eachDayOfInterval({ start, end });
    const inWeek = tasks.filter(t => t.status === 'todo' && isWithinInterval(new Date(t.dueDate), { start, end }));
    const sorted = [...inWeek].sort((a, b) => {
      const prio = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
      const diff = prio(b.priority) - prio(a.priority);
      if (diff !== 0) return diff;
      return compareDesc(new Date(a.createdAt), new Date(b.createdAt));
    });
    const counts: Record<string, number> = {};
    weekDays.forEach(d => {
      const key = d.toISOString().slice(0, 10);
      counts[key] = tasks.filter(t => t.status === 'todo' && t.dueDate === key).length;
    });
    const assignments: Array<{ id: string; date: string; index: number }> = [];
    for (const task of sorted) {
      let targetDate = task.dueDate;
      if (counts[targetDate] >= maxPerDay) {
        const best = weekDays
          .map(d => d.toISOString().slice(0, 10))
          .sort((a, b) => counts[a] - counts[b])[0];
        targetDate = best;
      }
      const idx = counts[targetDate];
      counts[targetDate] = Math.min(maxPerDay, counts[targetDate] + 1);
      assignments.push({ id: task.id, date: targetDate, index: idx });
    }
    const preview: Record<string, string[]> = {};
    weekDays.forEach(d => {
      const key = d.toISOString().slice(0, 10);
      preview[key] = [];
    });
    assignments.forEach(a => {
      const t = sorted.find(x => x.id === a.id);
      if (t) {
        preview[a.date].push(t.title);
      }
    });
    setPlanPreview(preview);
    setPlannerOpen(true);
    return assignments;
  };

  const applyWeekPlan = () => {
    const plans = buildWeekPlan();
    const timeBase = 9; // 9am
    plans.forEach((p) => {
      const t = tasks.find(x => x.id === p.id);
      if (!t) return;
      const dueTime = assignTimes ? `${String(Math.min(23, timeBase + p.index)).padStart(2, '0')}:00` : t.dueTime || '';
      if (t.dueDate !== p.date || t.dueTime !== dueTime) {
        updateTask(t.id, { dueDate: p.date, dueTime });
      }
    });
  };
  const planDay = () => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const list = tasks
      .filter(t => t.status === 'todo' && t.dueDate === dateKey)
      .sort((a, b) => {
        const prio = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);
        const diff = prio(b.priority) - prio(a.priority);
        if (diff !== 0) return diff;
        return compareDesc(new Date(a.createdAt), new Date(b.createdAt));
      });
    const base = 9;
    list.forEach((t, i) => {
      const hour = Math.min(23, base + i);
      const time = `${String(hour).padStart(2, '0')}:00`;
      if (t.dueTime !== time) {
        updateTask(t.id, { dueTime: time });
      }
    });
  };
  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      {/* Calendar Grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">
            {mode === 'month' && format(selectedDate, 'MMMM yyyy')}
            {mode === 'week' && `${format(startOfWeek(selectedDate), 'MMM d')} - ${format(endOfWeek(selectedDate), 'MMM d')}`}
            {mode === 'day' && format(selectedDate, 'PPP')}
          </h2>
          <div className="flex items-center gap-1">
            <div className="flex gap-1 mr-2">
              <button onClick={() => setMode('month')} className={cn('px-2 py-1 rounded-md text-sm', mode === 'month' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                Month
              </button>
              <button onClick={() => setMode('week')} className={cn('px-2 py-1 rounded-md text-sm', mode === 'week' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                Week
              </button>
              <button onClick={() => setMode('day')} className={cn('px-2 py-1 rounded-md text-sm', mode === 'day' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
                Day
              </button>
            </div>
            {mode === 'week' && (
              <button onClick={buildWeekPlan} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm mr-2 hover:opacity-90">
                Plan Week
              </button>
            )}
            {mode === 'day' && (
              <button onClick={planDay} className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-sm mr-2 hover:opacity-90">
                Plan Day
              </button>
            )}
            <button onClick={handlePrev} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-accent transition-colors"
            >
              Today
            </button>
            <button onClick={handleNext} className="p-2 rounded-lg hover:bg-accent transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {mode === 'month' && (
          <>
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-xs font-semibold text-muted-foreground text-center py-2">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map(day => {
                const dayTasks = tasksForDay(day);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData('text/task-id');
                      if (id) {
                        updateTask(id, { dueDate: format(day, 'yyyy-MM-dd') });
                      }
                    }}
                    className={cn(
                      'relative aspect-square p-1.5 rounded-xl text-sm transition-all flex flex-col items-center',
                      isCurrentMonth ? 'text-foreground' : 'text-muted-foreground/40',
                      isSelected && 'bg-primary text-primary-foreground',
                      !isSelected && isToday(day) && 'bg-accent font-bold',
                      !isSelected && !isToday(day) && 'hover:bg-accent/50'
                    )}
                  >
                    <span className={cn('text-sm', isToday(day) && !isSelected && 'text-primary font-bold')}>
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                        {dayTasks.slice(0, 3).map(t => (
                          <div
                            key={t.id}
                            className={cn('w-1.5 h-1.5 rounded-full', isSelected ? 'bg-primary-foreground/70' : '')}
                            style={!isSelected ? {
                              background: t.priority === 'high' ? 'hsl(0 72% 51%)' : t.priority === 'medium' ? 'hsl(38 92% 50%)' : 'hsl(152 60% 40%)'
                            } : undefined}
                          />
                        ))}
                        {dayTasks.length > 3 && (
                          <span className={cn('text-[8px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                            +{dayTasks.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {mode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {eachDayOfInterval({ start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) }).map(day => (
              <div key={day.toISOString()} className="rounded-xl border border-border overflow-hidden">
                <div className="px-2 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
                  <button onClick={() => setSelectedDate(day)} className="hover:underline">{format(day, 'EEE d')}</button>
                  <button onClick={() => handleAddOnDate(day)} className="p-1 rounded hover:bg-accent">
                    <Plus size={12} />
                  </button>
                </div>
                <div className="grid grid-rows-12">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const hour = i + 8;
                    return (
                      <div
                        key={hour}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const id = e.dataTransfer.getData('text/task-id');
                          if (!id) return;
                          const time = `${String(hour).padStart(2, '0')}:00`;
                          updateTask(id, { dueDate: format(day, 'yyyy-MM-dd'), dueTime: time });
                        }}
                        className="h-10 border-t border-border/60 px-2 text-[11px] text-muted-foreground flex items-center"
                      >
                        {format(addHours(new Date().setHours(hour,0,0,0) as unknown as Date, 0), 'HH:00')}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === 'day' && (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-muted-foreground flex items-center justify-between">
              <span>{format(selectedDate, 'EEEE, PPP')}</span>
              <button onClick={() => handleAddOnDate(selectedDate)} className="p-1 rounded hover:bg-accent">
                <Plus size={12} />
              </button>
            </div>
            <div className="grid grid-rows-14">
              {Array.from({ length: 14 }).map((_, i) => {
                const hour = i + 8;
                return (
                  <div
                    key={hour}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData('text/task-id');
                      if (!id) return;
                      const time = `${String(hour).padStart(2, '0')}:00`;
                      updateTask(id, { dueDate: format(selectedDate, 'yyyy-MM-dd'), dueTime: time });
                    }}
                    className="h-10 border-t border-border/60 px-3 text-[11px] text-muted-foreground flex items-center"
                  >
                    {format(addHours(new Date().setHours(hour,0,0,0) as unknown as Date, 0), 'HH:00')}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Day Tasks */}
      <div className="lg:w-80 lg:border-l lg:pl-6 border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">{format(selectedDate, 'EEEE')}</h3>
            <p className="text-sm text-muted-foreground">{format(selectedDate, 'MMMM d, yyyy')}</p>
          </div>
          <button
            onClick={() => handleAddOnDate(selectedDate)}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <AnimatePresence>
            {selectedDayTasks.length > 0 ? (
              selectedDayTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/task-id', task.id);
                  }}
                >
                  <TaskCard task={task} />
                </div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 text-muted-foreground"
              >
                <p className="text-sm">No tasks for this day</p>
                <button
                  onClick={() => handleAddOnDate(selectedDate)}
                  className="text-sm text-primary font-medium mt-2 hover:underline"
                >
                  Add a task
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    <Dialog open={plannerOpen} onOpenChange={setPlannerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Plan Week</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Max tasks/day</Label>
                <input
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  type="number"
                  min={1}
                  max={20}
                  value={maxPerDay}
                  onChange={(e) => setMaxPerDay(parseInt(e.target.value) || 5)}
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={assignTimes} onChange={e => setAssignTimes(e.target.checked)} />
                  Assign times starting 9:00
                </label>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-accent/50 text-sm">
              {Object.entries(planPreview).map(([date, list]) => (
                <div key={date} className="mb-2">
                  <strong className="text-muted-foreground">{format(new Date(date), 'EEE d')}</strong>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {list.map((t, i) => (
                      <span key={`${date}-${i}`} className="px-2 py-0.5 rounded bg-background border border-border text-xs">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={applyWeekPlan} className="flex-1">Apply Plan</Button>
              <Button variant="outline" onClick={() => setPlannerOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
