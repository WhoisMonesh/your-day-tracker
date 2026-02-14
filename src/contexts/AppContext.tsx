import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ViewType, Task, Category } from '@/types/task';
import { type SettingsMap } from '@/db/sqlite';
import { useTaskStore } from '@/hooks/useTaskStore';

interface AppContextType {
  view: ViewType;
  setView: (v: ViewType) => void;
  tasks: Task[];
  categories: Category[];
  setCategories: (c: Category[]) => void;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleComplete: (id: string) => void;
  addCategory: (cat: Omit<Category, 'id'>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  settings: SettingsMap;
  updateSetting: (key: keyof SettingsMap, value: string) => Promise<void> | void;
  getSubtasks: (taskId: string) => import('@/types/task').Subtask[];
  addSubtaskToTask: (taskId: string, title: string) => Promise<import('@/types/task').Subtask>;
  toggleSubtask: (taskId: string, subtaskId: string) => Promise<void> | void;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void> | void;
  reorderSubtasks: (taskId: string, fromIndex: number, toIndex: number) => Promise<void> | void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  isTaskModalOpen: boolean;
  setIsTaskModalOpen: (open: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  priorityFilter: string;
  setPriorityFilter: (p: string) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const store = useTaskStore();
  const [view, setView] = useState<ViewType>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  return (
    <AppContext.Provider
      value={{
        view, setView,
        ...store,
        searchQuery, setSearchQuery,
        selectedDate, setSelectedDate,
        isTaskModalOpen, setIsTaskModalOpen,
        editingTask, setEditingTask,
        statusFilter, setStatusFilter,
        priorityFilter, setPriorityFilter,
        categoryFilter, setCategoryFilter,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
