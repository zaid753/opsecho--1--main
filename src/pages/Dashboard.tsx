import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Activity, Search, Filter, ArrowUpRight, Clock, ShieldAlert } from "lucide-react";
import client from "../api/client";
import { IncidentStatus } from "../types";
import { motion } from "motion/react";

interface Incident {
  id: string;
  roomCode: string;
  title: string;
  severity: string;
  status: IncidentStatus;
  createdAt: string;
  createdBy: { name: string; role: string };
  participants: { id: string }[];
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roomCode, setRoomCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchIncidents();
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await client.get("/incidents");
      setIncidents(res.data);
    } catch (err) {
      console.error("Failed to fetch incidents", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode) return;
    
    setIsJoining(true);
    setJoinError("");
    try {
      const res = await client.post("/incidents/join", { roomCode });
      navigate(`/incident/${res.data.id}`);
    } catch (err: any) {
      setJoinError(err.response?.data?.error || "Invalid room code or incident not found");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome & Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl shadow-xl shadow-blue-900/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative">
            <h1 className="text-3xl font-bold mb-2">Ready for Response</h1>
            <p className="text-blue-100 mb-6 max-w-md">Coordinate effectively, analyze evidence, and resolve critical issues faster with OpsEcho.</p>
            <div className="flex gap-3">
              <Link to="/create" className="px-6 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2">
                <Plus className="w-5 h-5" />
                New Incident
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-8 rounded-3xl flex flex-col justify-between">
          <p className="text-sm font-medium text-zinc-400">Active Room</p>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="Room Code (e.g. PAY-4827)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="w-full bg-black border border-white/10 rounded-xl py-3 px-4 focus:ring-2 focus:ring-blue-500/20 outline-none text-center font-mono tracking-widest"
              />
              {joinError && <p className="text-xs text-red-400 mt-2 ml-1">{joinError}</p>}
            </div>
            <button
              disabled={isJoining}
              className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {isJoining ? "Joining..." : "Join Incident Room"}
            </button>
          </form>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Incident Activity
          </h3>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-zinc-900 border border-white/5 rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <button className="p-2 bg-zinc-900 border border-white/5 rounded-lg hover:bg-zinc-800">
              <Filter className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : incidents.length > 0 ? (
          <div className="grid gap-4">
            {incidents.map((incident) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="group relative bg-zinc-900/30 border border-white/5 hover:border-white/10 hover:bg-zinc-900/50 p-6 rounded-2xl transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner ${
                    incident.severity === 'SEV-1' ? 'bg-red-500/20 text-red-400 border border-red-500/20' :
                    incident.severity === 'SEV-2' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/20' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20'
                  }`}>
                    {incident.severity.replace('SEV-', '')}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-white/5 uppercase tracking-wider">
                        {incident.roomCode}
                      </span>
                      <h4 className="font-bold">{incident.title}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(incident.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        {incident.status}
                      </div>
                      <div className="flex items-center gap-1">
                        <Plus className="w-3 h-3" />
                        {incident.participants.length} Participants
                      </div>
                    </div>
                  </div>
                </div>
                <Link
                  to={`/incident/${incident.id}`}
                  className="p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-3xl">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
              <Activity className="w-8 h-8 text-zinc-700" />
            </div>
            <h4 className="font-bold text-zinc-400 mb-1">No active incidents</h4>
            <p className="text-sm text-zinc-600">Great job! Everything seems stable right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
