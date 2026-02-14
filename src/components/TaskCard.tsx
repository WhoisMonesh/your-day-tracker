import { Task, Priority } from '@/types/task';
import { useApp } from '@/contexts/AppContext';
import { Bell, Check, Clock, Flag, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, addMinutes, addHours, addDays } from 'date-fns';
import { motion } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const priorityConfig: Record<Priority, { label: string; class: string }> = {
  high: { label: 'High', class: 'priority-high' },
  medium: { label: 'Medium', class: 'priority-medium' },
  low: { label: 'Low', class: 'priority-low' },
};

export function TaskCard({ task }: { task: Task }) {
  const { toggleComplete, deleteTask, setEditingTask, setIsTaskModalOpen, categories, updateTask, settings, getSubtasks } = useApp();

  const category = categories.find(c => c.id === task.categoryId);
  const dueDate = new Date(task.dueDate);
  const isOverdue = isPast(dueDate) && !isToday(dueDate) && task.status !== 'completed';
  const isDueToday = isToday(dueDate);
  const isCompleted = task.status === 'completed';
  const subs = getSubtasks(task.id);
  const subCount = subs.length;
  const subDone = subs.filter(s => s.completed).length;

  const handleEdit = () => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const applySnooze = (d: Date) => {
    const newDate = format(d, 'yyyy-MM-dd');
    const newTime = format(d, 'HH:mm');
    updateTask(task.id, {
      dueDate: newDate,
      dueTime: newTime,
      reminder: { type: '15min', notified: false },
    });
  };

  const snooze15m = () => {
    const base = task.dueTime ? new Date(`${task.dueDate}T${task.dueTime}`) : addMinutes(new Date(task.dueDate), 9 * 60); // default 9:00
    applySnooze(addMinutes(base, 15));
  };
  const snooze1h = () => {
    const base = task.dueTime ? new Date(`${task.dueDate}T${task.dueTime}`) : addMinutes(new Date(task.dueDate), 9 * 60);
    applySnooze(addHours(base, 1));
  };
  const snoozeTomorrow = () => {
    const base = task.dueTime ? new Date(`${task.dueDate}T${task.dueTime}`) : addMinutes(new Date(task.dueDate), 9 * 60);
    const next = addDays(base, 1);
    updateTask(task.id, {
      dueDate: format(next, 'yyyy-MM-dd'),
      dueTime: format(next, 'HH:mm'),
      reminder: { type: '1day', notified: false },
    });
  };

  const formatTime = (t: string) => {
    if (!t) return '';
    if (settings.use24h) return t;
    const [h, m] = t.split(':').map(Number);
    const am = h < 12;
    const hh = h % 12 || 12;
    return `${hh}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'group glass-hover rounded-xl p-4 cursor-pointer',
        isCompleted && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={() => toggleComplete(task.id)}
          className={cn(
            'mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0',
            isCompleted
              ? 'bg-primary border-primary'
              : 'border-muted-foreground/30 hover:border-primary'
          )}
        >
          {isCompleted && <Check size={12} className="text-primary-foreground" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3
              className={cn(
                'font-medium text-sm truncate',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>
            <Flag size={12} className={cn('flex-shrink-0', priorityConfig[task.priority].class)} />
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{task.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {category && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `${category.color}15`,
                  color: category.color,
                }}
              >
                {category.name}
              </span>
            )}

            <span
              className={cn(
                'text-xs flex items-center gap-1',
                isOverdue ? 'text-destructive font-medium' : isDueToday ? 'text-warning font-medium' : 'text-muted-foreground'
              )}
            >
              <Clock size={10} />
              {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(dueDate, 'MMM d')}
              {task.dueTime && ` · ${formatTime(task.dueTime)}`}
            </span>

            {subCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/50 text-muted-foreground">
                {subDone}/{subCount} subtasks
              </span>
            )}

            {task.reminder && task.reminder.type !== 'none' && (
              <span className="text-xs flex items-center gap-1 text-primary">
                <Bell size={10} />
                {task.reminder.notified ? 'Sent' : 'Set'}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-accent transition-all">
              <MoreHorizontal size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil size={14} className="mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={snooze15m}>
              <Clock size={14} className="mr-2" /> Snooze 15m
            </DropdownMenuItem>
            <DropdownMenuItem onClick={snooze1h}>
              <Clock size={14} className="mr-2" /> Snooze 1h
            </DropdownMenuItem>
            <DropdownMenuItem onClick={snoozeTomorrow}>
              <Clock size={14} className="mr-2" /> Snooze Tomorrow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteTask(task.id)} className="text-destructive">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}
