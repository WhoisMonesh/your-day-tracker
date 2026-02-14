import { useState, useEffect, useCallback } from 'react';
import { Task, Category, DEFAULT_CATEGORIES, TaskReminder, Subtask } from '@/types/task';
import { loadTasks, loadCategories, insertTask, updateTaskRow, deleteTaskRow, insertCategory, deleteCategoryRow, loadSettings, setSetting, type SettingsMap, loadAllSubtasks, insertSubtask, deleteSubtaskRow } from '@/db/sqlite';
import { addDays, addWeeks, addMonths, addMinutes, format } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import React from 'react';
import { ToastAction, type ToastActionElement } from '@/components/ui/toast';
 

const TASKS_KEY = 'tasktracker_tasks';
const CATEGORIES_KEY = 'tasktracker_categories';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// Convert reminder type to minutes before due
function reminderMinutes(reminder: TaskReminder): number | null {
  switch (reminder.type) {
    case '30sec': return 0.5;
    case '5min': return 5;
    case '15min': return 15;
    case '30min': return 30;
    case '1hour': return 60;
    case '1day': return 1440;
    case 'custom': return reminder.customMinutes ?? null;
    default: return null;
  }
}

export function useTaskStore() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<SettingsMap>({
    opfsEnabled: true,
    defaultPriority: 'medium',
    defaultCategoryId: 'personal',
    use24h: false,
    defaultReminderType: 'none',
    reminderSound: 'beep',
  });
  const [subtasks, setSubtasks] = useState<Record<string, Subtask[]>>({});

  useEffect(() => {
    (async () => {
      const cats = await loadCategories();
      setCategories(cats.length ? cats : DEFAULT_CATEGORIES);
      const ts = await loadTasks();
      setTasks(
        ts.map(t => ({
          ...t,
          reminder: t.reminder || { type: 'none' as const, notified: false },
        }))
      );
      const s = await loadSettings();
      setSettings(s);
      const sts = await loadAllSubtasks();
      const map: Record<string, Subtask[]> = {};
      sts.forEach(st => {
        if (!map[st.taskId]) map[st.taskId] = [];
        map[st.taskId].push(st);
      });
      setSubtasks(map);
    })();
  }, [settings.reminderSound]);

  useEffect(() => {
    const handler = () => {
      (async () => {
        const cats = await loadCategories();
        setCategories(cats.length ? cats : DEFAULT_CATEGORIES);
        const ts = await loadTasks();
        setTasks(
          ts.map(t => ({
            ...t,
            reminder: t.reminder || { type: 'none' as const, notified: false },
          }))
        );
        const sts = await loadAllSubtasks();
        const map: Record<string, Subtask[]> = {};
        sts.forEach(st => {
          if (!map[st.taskId]) map[st.taskId] = [];
          map[st.taskId].push(st);
        });
        setSubtasks(map);
      })();
    };
    window.addEventListener('tasktracker:db-saved', handler as EventListener);
    return () => window.removeEventListener('tasktracker:db-saved', handler as EventListener);
  }, [settings.reminderSound]);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    const current = tasks.find(t => t.id === id);
    if (current) {
      const nextStatus = updates.status ?? current.status;
      const next: Task = {
        ...current,
        ...updates,
        updatedAt: new Date().toISOString(),
        completedAt:
          nextStatus === 'completed' && current.status !== 'completed'
            ? new Date().toISOString()
            : nextStatus !== 'completed' ? null : current.completedAt,
      };
      updateTaskRow(next);
      setTasks(prev => prev.map(t => (t.id === id ? next : t)));
    }
  }, [tasks]);

  

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      setTasks(prev => {
        let changed = false;
        const updated = prev.map(task => {
          if (task.status === 'completed' || task.reminder.type === 'none' || task.reminder.notified) return task;
          if (!task.dueDate || !task.dueTime) return task;
          const dueDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
          const mins = reminderMinutes(task.reminder);
          if (mins === null) return task;
          const reminderTime = new Date(dueDateTime.getTime() - mins * 60000);
          if (now >= reminderTime && now <= dueDateTime) {
            changed = true;
            const notifyTitle = `⏰ Task Reminder: ${task.title}`;
            const notifyOpts: NotificationOptions = {
              body: `Due at ${task.dueTime} on ${task.dueDate}`,
              icon: '/favicon.ico',
              tag: task.id,
            };
            if (Notification.permission === 'granted') {
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready
                    .then(reg => reg.showNotification(notifyTitle, notifyOpts))
                    .catch(() => new Notification(notifyTitle, notifyOpts));
                } else {
                  new Notification(notifyTitle, notifyOpts);
                }
              } catch {
                try { new Notification(notifyTitle, notifyOpts); } catch { void 0; }
              }
            }
            {
              const snooze = () => {
                const next = addMinutes(new Date(), 5);
                updateTask(task.id, {
                  dueDate: format(next, 'yyyy-MM-dd'),
                  dueTime: format(next, 'HH:mm'),
                  reminder: { type: 'custom', customMinutes: 0, notified: false },
                });
              };
              const actionEl = React.createElement(ToastAction, { altText: 'Snooze 5m', onClick: snooze }, 'Snooze 5m') as unknown as ToastActionElement;
              toast({
                title: 'Task Reminder',
                description: `Due at ${task.dueTime} on ${task.dueDate}`,
                action: actionEl,
              });
            }
            if (settings.reminderSound !== 'none') {
              try {
                const audioCtx = new AudioContext();
                const oscillator = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                oscillator.connect(gain);
                gain.connect(audioCtx.destination);
                oscillator.frequency.value = settings.reminderSound === 'chime' ? 600 : 800;
                oscillator.type = 'sine';
                gain.gain.value = 0.25;
                oscillator.start();
                const durationMs = task.reminder.type === '30sec' ? 30000 : 500;
                setTimeout(() => {
                  oscillator.stop();
                  audioCtx.close();
                }, durationMs);
              } catch { void 0; }
            }
            return { ...task, reminder: { ...task.reminder, notified: true } };
          }
          return task;
        });
        return changed ? updated : prev;
      });
    };
    const interval = setInterval(checkReminders, 5000);
    checkReminders();
    return () => clearInterval(interval);
  }, [settings.reminderSound, updateTask]);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      ...task,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      repeatType: task.repeatType ?? 'none',
      repeatInterval: task.repeatInterval,
      seriesId: task.seriesId,
    };
    insertTask(newTask);
    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  

  const deleteTask = useCallback((id: string) => {
    deleteTaskRow(id);
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    const current = tasks.find(t => t.id === id);
    if (!current) return;
    const newStatus = current.status === 'completed' ? 'todo' : 'completed';
    const next: Task = {
      ...current,
      status: newStatus,
      updatedAt: new Date().toISOString(),
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null,
    };
    updateTaskRow(next);
    setTasks(prev => prev.map(t => (t.id === id ? next : t)));

    if (newStatus === 'completed' && (current.repeatType && current.repeatType !== 'none')) {
      const baseDate = new Date(current.dueDate);
      let nextDate = baseDate;
      if (current.repeatType === 'daily') nextDate = addDays(baseDate, 1);
      else if (current.repeatType === 'weekly') nextDate = addWeeks(baseDate, 1);
      else if (current.repeatType === 'monthly') nextDate = addMonths(baseDate, 1);
      else if (current.repeatType === 'custom') nextDate = addDays(baseDate, Math.max(1, current.repeatInterval || 1));
      const nextTask: Task = {
        ...current,
        id: generateId(),
        status: 'todo',
        completedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: nextDate.toISOString().slice(0, 10),
        seriesId: current.seriesId ?? current.id,
        reminder: { ...current.reminder, notified: false },
      };
      insertTask(nextTask);
      setTasks(prev => [nextTask, ...prev]);
    }
  }, [tasks]);

  // Category CRUD
  const addCategory = useCallback((cat: Omit<Category, 'id'>) => {
    const newCat: Category = { ...cat, id: generateId() };
    insertCategory(newCat);
    setCategories(prev => [...prev, newCat]);
    return newCat;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => {
      const next = prev.map(c => (c.id === id ? { ...c, ...updates } as Category : c));
      const updated = next.find(c => c.id === id);
      if (updated) insertCategory(updated);
      return next;
    });
  }, []);

  const deleteCategory = useCallback((id: string) => {
    deleteCategoryRow(id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setTasks(prev => prev.map(t => (t.categoryId === id ? { ...t, categoryId: 'personal' } : t)));
  }, []);

  const updateSetting = useCallback(async (key: keyof SettingsMap, value: string) => {
    await setSetting(key, value);
    setSettings(prev => ({ ...prev, [key]: key === 'opfsEnabled' || key === 'use24h' ? value === 'true' : value } as SettingsMap));
  }, []);

  const getSubtasks = useCallback((taskId: string): Subtask[] => {
    return subtasks[taskId] || [];
  }, [subtasks]);

  const addSubtaskToTask = useCallback(async (taskId: string, title: string) => {
    const now = new Date().toISOString();
    const current = subtasks[taskId] || [];
    const st: Subtask = { id: generateId(), taskId, title, completed: false, createdAt: now, updatedAt: now, position: current.length };
    await insertSubtask(st);
    setSubtasks(prev => {
      const list = prev[taskId] ? [...prev[taskId], st] : [st];
      return { ...prev, [taskId]: list };
    });
    return st;
  }, [subtasks]);

  const toggleSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    const list = subtasks[taskId] || [];
    const st = list.find(s => s.id === subtaskId);
    if (!st) return;
    const updated: Subtask = { ...st, completed: !st.completed, updatedAt: new Date().toISOString() };
    await insertSubtask(updated);
    setSubtasks(prev => {
      const next = (prev[taskId] || []).map(s => s.id === subtaskId ? updated : s);
      return { ...prev, [taskId]: next };
    });
  }, [subtasks]);

  const deleteSubtask = useCallback(async (taskId: string, subtaskId: string) => {
    await deleteSubtaskRow(subtaskId);
    setSubtasks(prev => {
      const next = (prev[taskId] || []).filter(s => s.id !== subtaskId);
      const reseq = next.map((s, idx) => ({ ...s, position: idx }));
      reseq.forEach(async s => await insertSubtask(s));
      return { ...prev, [taskId]: reseq };
    });
  }, []);

  const reorderSubtasks = useCallback(async (taskId: string, fromIndex: number, toIndex: number) => {
    const list = [...(subtasks[taskId] || [])];
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return;
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    const reseq = list.map((s, idx) => ({ ...s, position: idx, updatedAt: new Date().toISOString() }));
    for (const s of reseq) {
      await insertSubtask(s);
    }
    setSubtasks(prev => ({ ...prev, [taskId]: reseq }));
  }, [subtasks]);

  return {
    tasks,
    categories,
    setCategories,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    addCategory,
    updateCategory,
    deleteCategory,
    settings,
    updateSetting,
    getSubtasks,
    addSubtaskToTask,
    toggleSubtask,
    deleteSubtask,
    reorderSubtasks,
  };
}
