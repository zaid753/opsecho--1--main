                    <div className="glass-panel flex flex-col h-[calc(100vh-14rem)] rounded-3xl border border-zinc-200 dark:border-white/10 relative overflow-hidden bg-white dark:bg-zinc-900/40">
                      <div className="h-16 px-6 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/50 dark:bg-black/20">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <h2 className="font-bold">Post-Mortem Report</h2>
                        </div>
                        {isEditingSummary ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setIsEditingSummary(false);
                                setEditedSummary(incident.summary || "");
                              }}
                              className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveSummary}
                              disabled={isSavingSummary}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                            >
                              {isSavingSummary ? (
                                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Save Changes
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setIsEditingSummary(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-lg transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit Report
                          </button>
                        )}
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        {isEditingSummary ? (
                          <textarea
                            value={editedSummary}
                            onChange={(e) => setEditedSummary(e.target.value)}
                            className="w-full h-full bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-xl p-6 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none font-mono"
                            placeholder="Write post-mortem summary here..."
                          />
                        ) : (
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {incident.summary ? (
                              <ReactMarkdown>{incident.summary}</ReactMarkdown>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4 mt-20">
                                <div className="w-8 h-8 border-2 border-zinc-300 dark:border-white/20 border-t-zinc-600 dark:border-t-white/60 rounded-full animate-spin" />
                                <p>Generating AI summary...</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
