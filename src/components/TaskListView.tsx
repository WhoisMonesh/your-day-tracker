import { useApp } from '@/contexts/AppContext';
import { TaskCard } from './TaskCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { isToday, isPast, isThisWeek, compareAsc, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, ListFilter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function TaskListView() {
  const {
    tasks, searchQuery, categories,
    statusFilter, setStatusFilter,
    priorityFilter, setPriorityFilter,
    categoryFilter, setCategoryFilter,
    setIsTaskModalOpen, setEditingTask,
  } = useApp();

  const filtered = useMemo(() => {
    let result = tasks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);
    if (categoryFilter !== 'all') result = result.filter(t => t.categoryId === categoryFilter);

    return result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return compareAsc(new Date(a.dueDate), new Date(b.dueDate));
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter, categoryFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">All Tasks</h2>
        <button
          onClick={() => { setEditingTask(null); setIsTaskModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <ListFilter size={16} className="text-muted-foreground" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {filtered.length > 0 ? (
            filtered.map(task => <TaskCard key={task.id} task={task} />)
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-muted-foreground"
            >
              <p className="text-lg font-medium mb-1">No tasks found</p>
              <p className="text-sm">Try adjusting your filters or create a new task</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
