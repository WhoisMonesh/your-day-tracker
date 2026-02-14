import { useApp } from '@/contexts/AppContext';
import { useMemo } from 'react';
import { isToday, isPast, isThisWeek, subDays, format, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, ListTodo, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export function DashboardView() {
  const { tasks, categories, setView, updateTask, toggleComplete } = useApp();

  const stats = useMemo(() => {
    const today = new Date();
    const completed = tasks.filter(t => t.status === 'completed');
    const completedToday = completed.filter(t => t.completedAt && isToday(new Date(t.completedAt)));
    const completedThisWeek = completed.filter(t => t.completedAt && isThisWeek(new Date(t.completedAt)));
    const overdue = tasks.filter(t => t.status !== 'completed' && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)));
    const upcoming = tasks.filter(t => t.status !== 'completed' && !isPast(new Date(t.dueDate)));
    const dueToday = tasks.filter(t => t.status !== 'completed' && isToday(new Date(t.dueDate)));

    return {
      total: tasks.length,
      completed: completed.length,
      completedToday: completedToday.length,
      completedThisWeek: completedThisWeek.length,
      overdue: overdue.length,
      upcoming: upcoming.length,
      dueToday: dueToday.length,
      completionRate: tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
    };
  }, [tasks]);

  // Last 7 days completion data
  const weeklyData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayStr = startOfDay(day).toISOString();
      const count = tasks.filter(t =>
        t.completedAt && format(new Date(t.completedAt), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      ).length;
      data.push({ day: format(day, 'EEE'), count });
    }
    return data;
  }, [tasks]);

  // Category distribution
  const categoryData = useMemo(() => {
    return categories
      .map(cat => ({
        name: cat.name,
        value: tasks.filter(t => t.categoryId === cat.id && t.status !== 'completed').length,
        color: cat.color,
      }))
      .filter(d => d.value > 0);
  }, [tasks, categories]);

  const statCards = [
    { icon: ListTodo, label: 'Total Tasks', value: stats.total, color: 'text-primary' },
    { icon: CheckCircle2, label: 'Completed', value: stats.completed, color: 'text-success' },
    { icon: Clock, label: 'Due Today', value: stats.dueToday, color: 'text-warning' },
    { icon: AlertTriangle, label: 'Overdue', value: stats.overdue, color: 'text-destructive' },
  ];

  const missedReminders = useMemo(() => {
    const now = new Date();
    return tasks.filter(t => {
      if (t.status === 'completed') return false;
      if (!t.reminder || t.reminder.type === 'none') return false;
      if (!t.dueDate) return false;
      const target = new Date(t.dueDate + (t.dueTime ? 'T' + t.dueTime : 'T23:59'));
      return isPast(target) && !isToday(target);
    });
  }, [tasks]);

  const snoozeMissed = (mins: number) => {
    const now = new Date();
    missedReminders.forEach(t => {
      const base = t.dueTime ? new Date(`${t.dueDate}T${t.dueTime}`) : new Date(`${t.dueDate}T09:00`);
      const next = new Date(now.getTime() + mins * 60000);
      updateTask(t.id, {
        dueDate: format(next, 'yyyy-MM-dd'),
        dueTime: format(next, 'HH:mm'),
        reminder: { type: '15min', notified: false },
      });
    });
  };

  return (
    <div className="space-y-8">
      {missedReminders.length > 0 && (
        <div className="glass rounded-xl p-4 border-l-4 border-warning">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-warning">Missed reminders</p>
              <p className="text-xs text-muted-foreground">{missedReminders.length} tasks have past due reminders</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => snoozeMissed(15)}
                className="px-3 py-1.5 text-xs rounded-md bg-accent hover:bg-accent/80"
              >
                Snooze 15m
              </button>
              <button
                onClick={() => missedReminders.forEach(t => toggleComplete(t.id))}
                className="px-3 py-1.5 text-xs rounded-md border hover:bg-accent/50"
              >
                Mark done
              </button>
            </div>
          </div>
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold mb-1">Dashboard</h2>
        <p className="text-muted-foreground text-sm">
          {stats.completionRate}% completion rate · {stats.completedToday} completed today
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon size={20} className={stat.color} />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 text-sm">Completed This Week</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Category Pie */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass rounded-xl p-5"
        >
          <h3 className="font-semibold mb-4 text-sm">Tasks by Category</h3>
          {categoryData.length > 0 ? (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    innerRadius={45}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={2}
                    stroke="hsl(var(--card))"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {categoryData.map(d => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              No active tasks yet
            </div>
          )}
        </motion.div>
      </div>

      {/* Completion Progress */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Overall Progress</h3>
          <span className="text-sm font-bold text-primary">{stats.completionRate}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${stats.completionRate}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {stats.completed} of {stats.total} tasks completed
        </p>
      </motion.div>
    </div>
  );
}
