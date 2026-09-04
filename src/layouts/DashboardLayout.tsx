import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Zap, LayoutDashboard, History, Settings, LogOut, PlusCircle, UserCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BackButton from "../components/BackButton";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Create Incident", path: "/create", icon: PlusCircle },
    { label: "History", path: "/history", icon: History },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-white flex transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-200 dark:border-white/5 bg-white dark:bg-transparent flex flex-col shrink-0 transition-colors duration-200">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-blue-600 fill-blue-600" />
            <span className="text-xl font-bold tracking-tight">OpsEcho</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                location.pathname === item.path
                  ? "bg-blue-50 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-600/20"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 border border-transparent"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 bg-zinc-100 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-white/5 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-600/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-600/20">
              {user?.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.name}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold truncate">
                {user?.role.replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">

        <header className="h-16 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-8 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md transition-colors duration-200">
          <div className="flex items-center">
            {location.pathname !== '/dashboard' && <BackButton className="mr-4" />}
            <h2 className="font-bold text-lg text-zinc-900 dark:text-white">
              {navItems.find(item => item.path === location.pathname)?.label || "Incident Detail"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <UserCircle className="w-6 h-6" />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
