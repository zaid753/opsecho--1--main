import { motion } from "motion/react";
import { ArrowRight, Blocks, Check, Database, MessageSquare, TicketCheck } from "lucide-react";
import { Link } from "react-router-dom";
import PublicPageShell from "../components/PublicPageShell";

const integrations = [
  { name: "Slack", mark: "S", icon: MessageSquare, color: "purple", description: "Keep your incident channel informed with timely notifications and response updates." },
  { name: "Jira", mark: "J", icon: TicketCheck, color: "blue", description: "Turn incident follow-up into traceable Jira work without copying context by hand." },
];

export default function IntegrationsPage() {
  return (
    <PublicPageShell
      eyebrow="Integrations"
      title={<>Bring the tools your response already depends on.</>}
      description="OpsEcho connects the conversation in your incident room to the systems where teams coordinate, document, and follow through."
    >
      <div className="mt-16 grid gap-5 md:grid-cols-2">
        {integrations.map((integration, index) => {
          const Icon = integration.icon;
          const isPurple = integration.color === "purple";
          return (
            <motion.article
              key={integration.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: index * 0.1, duration: 0.45 }}
              className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold ${isPurple ? "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400" : "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"}`}>
                  {integration.mark}
                </div>
                <Icon className={`h-5 w-5 ${isPurple ? "text-purple-500" : "text-blue-500"}`} />
              </div>
              <h2 className="mt-7 text-xl font-bold">{integration.name}</h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{integration.description}</p>
              <div className="mt-6 space-y-3 border-t border-zinc-200 pt-5 text-sm text-zinc-600 dark:border-white/10 dark:text-zinc-400">
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> OAuth connection from Settings</div>
                <div className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Incident context stays attached</div>
              </div>
            </motion.article>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-blue-200 bg-blue-50 p-7 dark:border-blue-500/20 dark:bg-blue-500/[0.07] md:flex-row md:items-center md:justify-between md:p-9">
        <div className="flex gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm dark:bg-blue-500/10 dark:text-blue-400"><Blocks className="h-5 w-5" /></div>
          <div><h2 className="font-bold">Connect from your workspace</h2><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Once you are signed in, manage connections and disconnect them at any time in Settings.</p></div>
        </div>
        <Link to="/register" className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500">Get started <ArrowRight className="h-4 w-4" /></Link>
      </div>

      <div className="mt-10 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"><Database className="h-4 w-4 text-blue-500" /> More operational connections can be added as your workflow grows.</div>
    </PublicPageShell>
  );
}