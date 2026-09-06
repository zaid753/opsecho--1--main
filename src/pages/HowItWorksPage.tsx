import { motion } from "motion/react";
import { Activity, CheckCircle2, MessageSquare, ShieldCheck, Sparkles, Users } from "lucide-react";
import PublicPageShell from "../components/PublicPageShell";

const steps = [
  { number: "01", icon: Activity, title: "Open an incident room", text: "Create a room with a focused objective and invite responders with a shareable code." },
  { number: "02", icon: MessageSquare, title: "Talk naturally", text: "Your team uses the live voice room while OpsEcho listens for decisions, symptoms, and next actions." },
  { number: "03", icon: Sparkles, title: "Build shared state", text: "Gemini turns conversation into a structured feed of facts, hypotheses, owners, and risks." },
  { number: "04", icon: ShieldCheck, title: "Approve critical actions", text: "High-impact actions stay under human control with explicit approval and a complete audit trail." },
];

export default function HowItWorksPage() {
  return (
    <PublicPageShell
      eyebrow="How it works"
      title={<>A calmer incident room, from first signal to resolution.</>}
      description="OpsEcho gives responders one shared operational picture while the incident is still moving. Voice, AI, and accountable action tracking work together in real time."
    >
      <div className="mt-16 grid gap-4 md:grid-cols-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.article
              key={step.number}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.08, duration: 0.45 }}
              className="group rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm transition-colors hover:border-blue-300 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-500/40"
            >
              <div className="mb-8 flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="font-mono text-xs font-bold tracking-widest text-zinc-400">{step.number}</span>
              </div>
              <h2 className="text-xl font-bold">{step.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{step.text}</p>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-zinc-200 bg-zinc-900 p-7 text-white dark:border-white/10 dark:bg-[#11131a] md:grid-cols-[1fr_auto] md:items-center md:p-9">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">The response loop</p>
          <h2 className="mt-3 text-2xl font-bold">Observe. Decide. Act. Learn.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">Every message becomes useful incident context, so responders spend less time reconstructing what happened and more time moving the system forward.</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-300"><Users className="h-5 w-5 text-blue-400" /> One room, one source of truth</div>
      </div>

      <div className="mt-10 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Built for human-led response</div>
    </PublicPageShell>
  );
}