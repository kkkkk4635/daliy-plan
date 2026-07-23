// 主题管理 - 亮 / 暗 / 纸质
import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';

export function useTheme() {
  const theme = useScheduleStore((s) => s.preferences.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);
}
