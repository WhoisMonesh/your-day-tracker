import { useApp } from '@/contexts/AppContext';
import { TaskCard } from './TaskCard';
import { AnimatePresence, motion } from 'framer-motion';
import { useMemo } from 'react';
import { isToday, isPast, format } from 'date-fns';
import { Sun, Plus } from 'lucide-react';

export function MyDayView() {
  const { tasks, searchQuery, setIsTaskModalOpen, setEditingTask, setSelectedDate } = useApp();

  const todayTasks = useMemo(() => {
    const today = new Date();
    let result = tasks.filter(t => isToday(new Date(t.dueDate)));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q));
    }
    // Show incomplete first, then completed
    return result.sort((a, b) => {
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      return 0;
    });
  }, [tasks, searchQuery]);

  const overdueTasks = useMemo(() => {
    return tasks.filter(t =>
      t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
    );
  }, [tasks]);

  const handleAdd = () => {
    setSelectedDate(new Date());
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const completed = todayTasks.filter(t => t.status === 'completed').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sun size={24} className="text-warning" />
            <h2 className="text-2xl font-bold">My Day</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')} · {completed}/{todayTasks.length} done
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add Task
        </button>
      </div>

      {/* Overdue */}
      {overdueTasks.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse-dot" />
            Overdue ({overdueTasks.length})
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {overdueTasks.map(task => <TaskCard key={task.id} task={task} />)}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Today */}
      <div className="space-y-2">
        <AnimatePresence>
          {todayTasks.length > 0 ? (
            todayTasks.map(task => <TaskCard key={task.id} task={task} />)
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 text-muted-foreground"
            >
              <Sun size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">All clear for today!</p>
              <p className="text-sm">No tasks due today. Enjoy your day or add something new.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
