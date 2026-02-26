import { useEffect } from 'react';

/** Theme is permanently fixed to light mode. */
export function useTheme() {
  useEffect(() => {
    // Remove any previously saved dark preference and enforce light mode.
    localStorage.removeItem('theme');
    document.documentElement.classList.remove('dark');
  }, []);

  return { theme: 'light' as const, toggleTheme: () => {} };
}
