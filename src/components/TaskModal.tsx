import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Task, Priority, TaskStatus, ReminderType, TaskReminder, RepeatType } from '@/types/task';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bell, ChevronDown, ChevronUp, Check } from 'lucide-react';

export function TaskModal() {
  const { isTaskModalOpen, setIsTaskModalOpen, editingTask, setEditingTask, addTask, updateTask, categories, selectedDate, settings, getSubtasks, addSubtaskToTask, toggleSubtask, deleteSubtask, reorderSubtasks } = useApp();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [categoryId, setCategoryId] = useState('work');
  const [reminderType, setReminderType] = useState<ReminderType>('none');
  const [customMinutes, setCustomMinutes] = useState(10);
  const [repeatType, setRepeatType] = useState<RepeatType>('none');
  const [repeatInterval, setRepeatInterval] = useState(1);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [pendingSubtasks, setPendingSubtasks] = useState<string[]>([]);
  const [subsCollapsed, setSubsCollapsed] = useState(true);

  useEffect(() => {
    if (editingTask) {
      setTitle(editingTask.title);
      setDescription(editingTask.description);
      setDueDate(editingTask.dueDate);
      setDueTime(editingTask.dueTime);
      setPriority(editingTask.priority);
      setStatus(editingTask.status);
      setCategoryId(editingTask.categoryId);
      setReminderType(editingTask.reminder?.type || 'none');
      setCustomMinutes(editingTask.reminder?.customMinutes || 10);
      setRepeatType(editingTask.repeatType || 'none');
      setRepeatInterval(editingTask.repeatInterval || 1);
    } else {
      setTitle('');
      setDescription('');
      setDueDate(format(selectedDate, 'yyyy-MM-dd'));
      setDueTime('');
      setPriority(settings.defaultPriority);
      setStatus('todo');
      setCategoryId(settings.defaultCategoryId || categories[0]?.id || 'work');
      setReminderType('none');
      setCustomMinutes(10);
      setRepeatType('none');
      setRepeatInterval(1);
      setPendingSubtasks([]);
      setSubtaskInput('');
    }
  }, [editingTask, isTaskModalOpen, selectedDate, categories, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Request notification permission if reminder is set
    if (reminderType !== 'none' && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const reminder: TaskReminder = {
      type: reminderType === 'none' ? settings.defaultReminderType : reminderType,
      customMinutes: reminderType === 'custom' ? customMinutes : undefined,
      notified: false,
    };

    if (editingTask) {
      updateTask(editingTask.id, { title, description, dueDate, dueTime, priority, status, categoryId, reminder, repeatType, repeatInterval });
    } else {
      const newTask = addTask({ title, description, dueDate, dueTime, priority, status, categoryId, reminder, repeatType, repeatInterval });
      for (const t of pendingSubtasks) {
        addSubtaskToTask(newTask.id, t);
      }
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsTaskModalOpen(false);
      setEditingTask(null);
    }
  };

  return (
    <Dialog open={isTaskModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="mt-1"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add details..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="dueTime">Time</Label>
              <Input
                id="dueTime"
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={priority} onValueChange={v => setPriority(v as Priority)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">🔴 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as TaskStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reminder Section */}
          <div className="border-t border-border pt-4">
            <Label className="flex items-center gap-2 mb-2">
              <Bell size={14} /> Reminder
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={reminderType} onValueChange={v => setReminderType(v as ReminderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Reminder</SelectItem>
                  <SelectItem value="30sec">30 seconds before</SelectItem>
                  <SelectItem value="5min">5 minutes before</SelectItem>
                  <SelectItem value="15min">15 minutes before</SelectItem>
                  <SelectItem value="30min">30 minutes before</SelectItem>
                  <SelectItem value="1hour">1 hour before</SelectItem>
                  <SelectItem value="1day">1 day before</SelectItem>
                  <SelectItem value="custom">Custom...</SelectItem>
                </SelectContent>
              </Select>
              {reminderType === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={10080}
                    value={customMinutes}
                    onChange={e => setCustomMinutes(parseInt(e.target.value) || 10)}
                    className="w-20"
                  />
                  <span className="text-xs text-muted-foreground">min before</span>
                </div>
              )}
            </div>
            {reminderType !== 'none' && !dueTime && (
              <p className="text-xs text-warning mt-1">⚠ Set a due time for the reminder to work</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <Label className="mb-2">Repeat</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={repeatType} onValueChange={v => setRepeatType(v as RepeatType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom days</SelectItem>
                </SelectContent>
              </Select>
              {repeatType === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={repeatInterval}
                    onChange={e => setRepeatInterval(parseInt(e.target.value) || 1)}
                    className="w-24"
                  />
                  <span className="text-xs text-muted-foreground">day interval</span>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-2">
              <Label>Subtasks</Label>
              {editingTask && (
                <button
                  type="button"
                  className="text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
                  onClick={() => setSubsCollapsed(!subsCollapsed)}
                >
                  {subsCollapsed ? <span className="flex items-center gap-1"><ChevronDown size={12} /> Show</span> : <span className="flex items-center gap-1"><ChevronUp size={12} /> Hide</span>}
                </button>
              )}
            </div>
            {editingTask ? (
              <div className="space-y-2">
                {!subsCollapsed && getSubtasks(editingTask.id).map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex items-center gap-2"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/subtask-index', String(idx));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = parseInt(e.dataTransfer.getData('text/subtask-index'), 10);
                      const to = idx;
                      if (!Number.isNaN(from) && from !== to) {
                        reorderSubtasks(editingTask.id, from, to);
                      }
                    }}
                  >
                    <button
                      className={cn('w-4 h-4 rounded border flex items-center justify-center', st.completed ? 'bg-primary border-primary' : 'border-muted-foreground/30')}
                      onClick={() => toggleSubtask(editingTask.id, st.id)}
                      type="button"
                      aria-label="Toggle subtask"
                    >
                      {st.completed && <Check size={10} className="text-primary-foreground" />}
                    </button>
                    <span className={cn('text-xs flex-1', st.completed && 'line-through text-muted-foreground')}>{st.title}</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="sm" disabled={idx === 0} onClick={() => reorderSubtasks(editingTask.id, idx, idx - 1)}>
                        Up
                      </Button>
                      <Button type="button" variant="ghost" size="sm" disabled={idx === getSubtasks(editingTask.id).length - 1} onClick={() => reorderSubtasks(editingTask.id, idx, idx + 1)}>
                        Down
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => deleteSubtask(editingTask.id, st.id)}>
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSubtasks.map((t, i) => (
                  <div key={`${t}-${i}`} className="flex items-center gap-2">
                    <span className="text-xs flex-1">{t}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPendingSubtasks(prev => prev.filter((_, idx) => idx !== i))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Input
                placeholder="Add a subtask"
                value={subtaskInput}
                onChange={e => setSubtaskInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const t = subtaskInput.trim();
                  if (!t) return;
                  if (editingTask) {
                    addSubtaskToTask(editingTask.id, t);
                  } else {
                    setPendingSubtasks(prev => [...prev, t]);
                  }
                  setSubtaskInput('');
                }}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
