import { AppProvider, useApp } from '@/contexts/AppContext';
import { useEffect, useRef } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { TaskModal } from '@/components/TaskModal';
import { DashboardView } from '@/components/DashboardView';
import { CalendarView } from '@/components/CalendarView';
import { TaskListView } from '@/components/TaskListView';
import { MyDayView } from '@/components/MyDayView';
import { CommandPalette } from '@/components/CommandPalette';
import { useState } from 'react';

function AppContent() {
  const { view, setIsTaskModalOpen } = useApp();
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'n') {
        setIsTaskModalOpen(true);
      }
      if (e.key === '/') {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>('input[placeholder="Search tasks..."]');
        el?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === 'k' && !e.ctrlKey && !e.metaKey) {
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setIsTaskModalOpen]);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {view === 'dashboard' && <DashboardView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'list' && <TaskListView />}
        {view === 'my-day' && <MyDayView />}
      </main>
      <TaskModal />
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
