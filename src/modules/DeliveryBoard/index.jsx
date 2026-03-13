import { useState, useEffect, useMemo } from "react";
import { CLIENT_PROFILES, STATUSES } from "../../data/clients.js";
import { getDayLabel, isToday, isPast } from "../../lib/utils.js";
import { monoStyle, labelStyle, cardStyle, chipStyle, smallBtnStyle, primaryBtnStyle, inputStyle, textareaStyle, selectStyle } from "../../components/ui/index.jsx";

export default function DeliveryBoard({ activeClient }) {
  const [tasks, setTasks] = useState(() => {
    const d = (o) => { const dt = new Date(); dt.setDate(dt.getDate()+o); return dt.toISOString().split("T")[0]; };
    return [
      { id:"1", client:"aura", title:"Call diária comunidade", platform:"Discord", status:"scheduled", date:d(0), time:"08:30", recurrence:"daily", notes:"Pauta: notícias + Q&A" },
      { id:"2", client:"base-brasil", title:"Post educativo: O que é Base?", platform:"Twitter/X", status:"draft", date:d(0), time:"12:00", recurrence:"none", notes:"Thread 5 tweets" },
      { id:"3", client:"base-brasil", title:"Calendário semanal", platform:"Twitter/X", status:"review", date:d(1), time:"10:00", recurrence:"weekly", notes:"" },
      { id:"4", client:"zero-ledger", title:"Post sobre stablecoins", platform:"Twitter/X", status:"approved", date:d(1), time:"14:00", recurrence:"none", notes:"Compliance revisado" },
      { id:"5", client:"aco-labs", title:"Thread: Building Web3", platform:"Twitter/X", status:"draft", date:d(2), time:"15:00", recurrence:"none", notes:"" },
      { id:"6", client:"pessoal-tiktok", title:"TikTok: Bitcoin iniciantes", platform:"TikTok", status:"idea", date:d(0), time:"18:00", recurrence:"none", notes:"HCTE" },
      { id:"7", client:"pessoal-x", title:"Thread Alpha semanal", platform:"Twitter/X", status:"scheduled", date:d(3), time:"09:00", recurrence:"weekly", notes:"" },
      { id:"8", client:"maya-ig", title:"Revisão feed semanal", platform:"Instagram", status:"review", date:d(1), time:"16:00", recurrence:"weekly", notes:"" },
      { id:"9", client:"base-brasil", title:"Relatório mensal", platform:"Twitter/X", status:"idea", date:d(7), time:"10:00", recurrence:"monthly", notes:"" },
    ];
  });
  const [view, setView] = useState("timeline");
  const [filterClient, setFilterClient] = useState("all");
  const [editTask, setEditTask] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [dragTask, setDragTask] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  const effectiveFilter = activeClient || filterClient;
  const filtered = useMemo(() => tasks.filter(t => effectiveFilter === "all" || t.client === effectiveFilter), [tasks, effectiveFilter]);
  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    const g = {}; sorted.forEach(t => { if (!g[t.date]) g[t.date] = []; g[t.date].push(t); }); return g;
  }, [filtered]);

  const advanceStatus = (id, newStatus) => setTasks(p => p.map(t => t.id === id ? {...t, status: newStatus} : t));
  const saveTask = (task) => { setTasks(p => { const ex = p.find(t=>t.id===task.id); return ex ? p.map(t=>t.id===task.id?task:t) : [...p,task]; }); setEditTask(null); setShowNew(false); };
  const deleteTask = (id) => { setTasks(p => p.filter(t=>t.id!==id)); setEditTask(null); };

  const todayCount = filtered.filter(t => isToday(t.date)).length;
  const overdueCount = filtered.filter(t => isPast(t.date) && t.status !== "published").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {!activeClient && <>
            <span style={{ ...monoStyle, fontSize: 10, color: "#333" }}>CLIENTE:</span>
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)} style={selectStyle}>
              <option value="all">Todos</option>
              {CLIENT_PROFILES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </>}
          <span style={{ ...monoStyle, fontSize: 11, color: "#444", marginLeft: 10 }}>
            {todayCount} hoje{overdueCount > 0 && <span style={{ color: "#EF4444" }}> · {overdueCount} atrasadas</span>}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["timeline", "kanban"].map(v => (
            <button key={v} onClick={() => setView(v)} style={chipStyle(view === v)}>
              {v === "timeline" ? "📅 Timeline" : "◫ Kanban"}
            </button>
          ))}
          <button onClick={() => setShowNew(true)} style={{ ...primaryBtnStyle(false), padding: "6px 16px", fontSize: 12 }}>+ Nova</button>
        </div>
      </div>

      {/* Status bar */}
      <div style={{ display: "flex", gap: 1, marginBottom: 20 }}>
        {STATUSES.map(s => {
          const pct = filtered.length > 0 ? (filtered.filter(t=>t.status===s.id).length / filtered.length) * 100 : 0;
          return <div key={s.id} style={{ height: 3, background: s.color, opacity: 0.5, flex: `${pct} 0 0`, borderRadius: 2, minWidth: pct > 0 ? 3 : 0, transition: "flex 0.4s" }} />;
        })}
      </div>

      {view === "timeline" && Object.keys(grouped).length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 14, color: "#555" }}>
            {activeClient
              ? `Nenhuma entrega para ${CLIENT_PROFILES.find(c => c.id === activeClient)?.name}`
              : "Nenhuma entrega encontrada"
            }
          </div>
          <button onClick={() => setShowNew(true)} style={{ ...smallBtnStyle, marginTop: 16 }}>+ Criar entrega</button>
        </div>
      )}
      {view === "timeline" && Object.entries(grouped).map(([date, dateTasks]) => (
        <div key={date} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ ...monoStyle, fontSize: 12, fontWeight: 600, color: isToday(date) ? "#0052FF" : isPast(date) ? "#EF4444" : "#555" }}>{getDayLabel(date)}</span>
            <div style={{ flex: 1, height: 1, background: "#0f0f18" }} />
          </div>
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            {dateTasks.map(task => {
              const client = CLIENT_PROFILES.find(c=>c.id===task.client);
              const status = STATUSES.find(s=>s.id===task.status);
              const next = STATUSES[STATUSES.findIndex(s=>s.id===task.status)+1];
              const overdue = isPast(task.date) && task.status !== "published";
              return (
                <div key={task.id} onClick={() => setEditTask(task)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #0d0d14", cursor: "pointer", background: overdue ? "rgba(239,68,68,0.03)" : "transparent" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: client?.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: overdue ? "#EF4444" : "#D4D4D8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{task.title}</div>
                      <div style={{ ...monoStyle, fontSize: 10, color: "#444" }}>{client?.emoji} {client?.name} · {task.platform} · {task.time}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ ...monoStyle, fontSize: 10, color: status?.color, background: status?.color+"15", padding: "3px 8px", borderRadius: 4 }}>{status?.icon} {status?.label}</span>
                    {next && <button onClick={e => { e.stopPropagation(); advanceStatus(task.id, next.id); }}
                      style={{ ...smallBtnStyle, width: 24, height: 24, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>→</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUSES.length}, minmax(160px, 1fr))`, gap: 10, overflowX: "auto" }}>
          {STATUSES.map(status => {
            const items = filtered.filter(t => t.status === status.id);
            const isOver = dragOverCol === status.id;
            return (
              <div key={status.id}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverCol(status.id); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverCol(null); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverCol(null);
                  if (dragTask && dragTask.status !== status.id) {
                    advanceStatus(dragTask.id, status.id);
                  }
                  setDragTask(null);
                }}
                style={{
                  borderRadius: 10, padding: 6, minHeight: 120,
                  transition: "all 0.2s",
                  background: isOver ? `${status.color}08` : "transparent",
                  outline: isOver ? `2px dashed ${status.color}44` : "2px dashed transparent",
                }}>
                <div style={{ ...monoStyle, fontSize: 11, color: status.color, marginBottom: 10 }}>{status.icon} {status.label} <span style={{ color: "#333" }}>{items.length}</span></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {items.map(task => {
                    const client = CLIENT_PROFILES.find(c=>c.id===task.client);
                    const isDragging = dragTask?.id === task.id;
                    return (
                      <div key={task.id}
                        draggable
                        onDragStart={(e) => {
                          setDragTask(task);
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", task.id);
                          // Ghost opacity via setTimeout (browser needs a frame)
                          requestAnimationFrame(() => e.target.style.opacity = "0.4");
                        }}
                        onDragEnd={(e) => { e.target.style.opacity = "1"; setDragTask(null); setDragOverCol(null); }}
                        onClick={() => setEditTask(task)}
                        style={{
                          ...cardStyle, padding: 12, borderLeft: `3px solid ${client?.color}`, cursor: "grab",
                          opacity: isDragging ? 0.4 : 1,
                          transition: "opacity 0.15s, transform 0.15s",
                          transform: isDragging ? "scale(0.97)" : "scale(1)",
                        }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#D4D4D8", marginBottom: 6 }}>{task.title}</div>
                        <div style={{ ...monoStyle, fontSize: 10, color: "#444" }}>{client?.emoji} {getDayLabel(task.date)}</div>
                      </div>
                    );
                  })}
                  {items.length === 0 && isOver && (
                    <div style={{ ...monoStyle, fontSize: 10, color: status.color, textAlign: "center", padding: 16, opacity: 0.6 }}>
                      Soltar aqui
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(editTask || showNew) && <TaskModal task={editTask} activeClient={activeClient} onSave={saveTask} onDelete={deleteTask} onClose={() => { setEditTask(null); setShowNew(false); }} />}
    </div>
  );
}

function TaskModal({ task, activeClient, onSave, onDelete, onClose }) {
  const allPlatforms = ["Twitter/X","Instagram","TikTok","Discord","LinkedIn","YouTube","Stories"];
  const defaultClient = activeClient || CLIENT_PROFILES[0].id;
  const [form, setForm] = useState(task || {
    id: Date.now().toString(), client: defaultClient, title: "", platform: allPlatforms[0],
    status: "idea", date: new Date().toISOString().split("T")[0], time: "12:00", recurrence: "none", notes: ""
  });
  const isNew = !task;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#0c0c12", border: "1px solid #1a1a2e", borderRadius: 18, padding: 28, width: "100%", maxWidth: 480, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={labelStyle}>{isNew ? "NOVA ENTREGA" : "EDITAR"}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#444", fontSize: 16, cursor: "pointer" }}>✕</button>
        </div>
        <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Título..." style={inputStyle} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
          <select value={form.client} onChange={e => setForm({...form, client: e.target.value})} style={selectStyle}>
            {CLIENT_PROFILES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} style={selectStyle}>
            {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
          <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={selectStyle} />
          <input type="time" value={form.time} onChange={e => setForm({...form, time: e.target.value})} style={selectStyle} />
          <select value={form.recurrence} onChange={e => setForm({...form, recurrence: e.target.value})} style={selectStyle}>
            <option value="none">Única</option><option value="daily">Diário</option><option value="weekly">Semanal</option><option value="monthly">Mensal</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
          {STATUSES.map(s => (
            <button key={s.id} onClick={() => setForm({...form, status: s.id})}
              style={{ ...chipStyle(form.status === s.id), color: form.status === s.id ? s.color : "#444", fontSize: 11 }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notas..." rows={2} style={{ ...textareaStyle, minHeight: 60 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          {!isNew && <button onClick={() => onDelete(form.id)} style={{ ...smallBtnStyle, color: "#EF4444", borderColor: "#EF444433" }}>Excluir</button>}
          <button onClick={() => onSave(form)} disabled={!form.title.trim()} style={{ ...primaryBtnStyle(!form.title.trim()), marginLeft: "auto" }}>{isNew ? "Criar" : "Salvar"}</button>
        </div>
      </div>
    </div>
  );
}
