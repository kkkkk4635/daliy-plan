import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useScheduleStore } from './store/useScheduleStore';
import { useTheme } from './hooks/useTheme';
import { useSync } from './hooks/useSync';
import { useAchievementChecker } from './hooks/useAchievements';
import { useReminderScheduler } from './hooks/useReminder';
import { Sidebar, MobileNav, TopBar } from './components/Layout';
import { ToastContainer } from './components/Toast';
import { Home } from './pages/Home';
import { WeekView } from './pages/WeekView';
import { MonthView } from './pages/MonthView';
import { YearView } from './pages/YearView';
import { TodoView } from './pages/TodoView';
import { Goals } from './pages/Goals';
import { Statistics } from './pages/Statistics';
import { Achievements } from './pages/Achievements';
import { Settings } from './pages/Settings';
import { Onboarding } from './pages/Onboarding';

function AppContent() {
  const initialized = useScheduleStore((s) => s.initialized);
  const init = useScheduleStore((s) => s.init);
  const location = useLocation();
  const isOnboarding = location.pathname === '/onboarding';

  useTheme();
  useSync();
  useAchievementChecker();
  useReminderScheduler();

  useEffect(() => {
    if (!initialized) {
      void init();
    }
  }, [initialized, init]);

  if (!initialized && !isOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center paper-texture">
        <div className="text-center">
          <div className="font-display text-2xl font-bold mb-2">课表</div>
          <div className="text-sm text-[var(--ink-soft)] font-mono">loading...</div>
        </div>
      </div>
    );
  }

  if (isOnboarding) {
    return (
      <>
        <Onboarding />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="min-h-screen flex paper-texture">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pb-16 lg:pb-0">
        <TopBar onAdd={() => {}} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/week" element={<WeekView />} />
            <Route path="/month" element={<MonthView />} />
            <Route path="/year" element={<YearView />} />
            <Route path="/todo" element={<TodoView />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <MobileNav />
      </div>
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
