"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function LoginThemeSwitch() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("life-tracker-theme");
    const nextTheme = saved === "light" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("life-tracker-theme", nextTheme);
  };

  return <button type="button" role="switch" aria-checked={theme === "light"} aria-label={theme === "dark" ? "Turn light mode on" : "Turn dark mode on"} title={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme} className="theme-switch"><span className="theme-switch-thumb">{theme === "dark" ? <Moon size={13}/> : <Sun size={13}/>}</span></button>;
}
