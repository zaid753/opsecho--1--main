import React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Moon, Sun, Zap } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function PublicPageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  const { theme, setTheme } = useTheme();
  const location = useLocation();

  const navItems = [
    { label: "Features", href: "/#features" },
    { label: "How it Works", href: "/how-it-works" },
    { label: "Integrations", href: "/integrations" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-200/80 bg-white/80 backdrop-blur-md transition-colors duration-300 dark:border-white/5 dark:bg-[#0a0a0a]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Zap className="h-5 w-5 fill-white text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">OpsEcho</span>
          </Link>

          <div className="hidden items-center gap-8 text-sm font-medium text-zinc-500 dark:text-zinc-400 md:flex">
            {navItems.map((item) => {
              const active = item.href === location.pathname;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={active ? "text-blue-600 dark:text-blue-400" : "transition-colors hover:text-zinc-900 dark:hover:text-white"}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              aria-label="Toggle theme"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full p-2 text-zinc-600 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <Link to="/login" className="hidden text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white sm:block">
              Login
            </Link>
            <Link to="/register" className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] overflow-hidden">
          <div className="absolute left-1/4 top-16 h-72 w-72 rounded-full bg-blue-600/15 blur-[110px] dark:bg-blue-600/20" />
          <div className="absolute right-1/4 top-28 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px] dark:bg-emerald-500/15" />
        </div>
        <section className="relative mx-auto max-w-7xl px-6 pb-16 pt-20 md:pb-24 md:pt-28">
          <div className="max-w-3xl">
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">{eyebrow}</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">{title}</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">{description}</p>
          </div>
          {children}
        </section>
      </main>

      <footer className="border-t border-zinc-200 px-6 py-10 dark:border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 text-sm text-zinc-500 md:flex-row md:items-center">
          <Link to="/" className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
            <Zap className="h-5 w-5 text-blue-600" /> OpsEcho
          </Link>
          <div className="flex gap-6">
            <Link to="/how-it-works" className="transition-colors hover:text-zinc-900 dark:hover:text-white">How it Works</Link>
            <Link to="/integrations" className="transition-colors hover:text-zinc-900 dark:hover:text-white">Integrations</Link>
            <Link to="/register" className="flex items-center gap-1 text-blue-600 dark:text-blue-400">Start responding <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}