export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in-progress' | 'completed';
export type ReminderType = 'none' | '30sec' | '5min' | '15min' | '30min' | '1hour' | '1day' | 'custom';
export type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';

export interface TaskReminder {
  type: ReminderType;
  customMinutes?: number;
  notified: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO date string
  dueTime: string; // HH:mm
  priority: Priority;
  status: TaskStatus;
  categoryId: string;
  reminder: TaskReminder;
  repeatType?: RepeatType;
  repeatInterval?: number;
  seriesId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface Category {
  id: string;
  name: string;
  color: string; // hex
  icon: string; // lucide icon name
}

export type ViewType = 'dashboard' | 'calendar' | 'list' | 'my-day';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'work', name: 'JIRA', color: '#0d9488', icon: 'Briefcase' },
  { id: 'personal', name: 'Personal', color: '#6366f1', icon: 'User' },
  { id: 'health', name: 'Health', color: '#22c55e', icon: 'Heart' },
  { id: 'shopping', name: 'Shopping', color: '#f59e0b', icon: 'ShoppingCart' },
  { id: 'learning', name: 'Learning', color: '#ec4899', icon: 'BookOpen' },
];

export const ICON_OPTIONS = [
  'Briefcase', 'User', 'Heart', 'ShoppingCart', 'BookOpen',
  'Home', 'Star', 'Zap', 'Target', 'Rocket',
  'Music', 'Camera', 'Globe', 'Coffee', 'Gift',
  'Folder', 'Code', 'Gamepad2', 'Plane', 'Car',
];

export const COLOR_OPTIONS = [
  '#0d9488', '#6366f1', '#22c55e', '#f59e0b', '#ec4899',
  '#ef4444', '#3b82f6', '#8b5cf6', '#14b8a6', '#f97316',
  '#06b6d4', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7',
];

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  position: number;
}
