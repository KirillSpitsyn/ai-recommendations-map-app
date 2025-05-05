'use client';

import React, { createContext, useState, useEffect, useContext } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with a default value that matches SSR (dark mode)
  const [theme, setTheme] = useState<Theme>('dark');
  // Track if component has mounted to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  // Only run client-side code after mount
  useEffect(() => {
    setMounted(true);
    
    // Now it's safe to access localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;
    
    // If there's a stored theme, use it; otherwise default to dark
    if (storedTheme) {
      setTheme(storedTheme);
      applyTheme(storedTheme);
    } else {
      // Default to dark mode
      localStorage.setItem('theme', 'dark');
      applyTheme('dark');
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    // Only apply theme on the client side
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // Remove both classes and add the appropriate one
    root.classList.remove('light-mode', 'dark-mode');
    root.classList.add(`${newTheme}-mode`);
    
    // Also toggle data-theme attribute for components that use it
    root.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {/* Render children only after mounting to avoid hydration mismatch */}
      {mounted ? children : 
        <div style={{ visibility: 'hidden' }}>
          {children}
        </div>
      }
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}