import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
// Supabase Edge Functions: all writes go through the server.
import { toggleTask, deleteTask } from "../api";
import { Ant } from "../components/Ant";
import { describeDue } from "../taskUtils";

const FILTERS = ["all", "pending", "completed"];

function progressMessage(total, done) {
  if (total === 0) return "Every colony starts with one crumb. Add your first task.";
  if (done === total) return "Colony fed! Every task has been carried home.";
  if (done === 0) return `${total} crumb${total > 1 ? "s" : ""} on the trail. Pick one up and start marching.`;
  return `${total - done} more to carry. Keep marching, the nest is close!`;
}

function formatDate(ts) {
  const d = ts?.toDate?.();
  return d ? d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "Just now";
}

export default function Dashboard({ user }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState(new Set());
  const [confirmId, setConfirmId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(location.state?.added ?? "");

  // Show "Task added" once, then clear it from history so refresh doesn't repeat it.
  useEffect(() => {
    if (!location.state?.added) return;
    navigate(".", { replace: true, state: null });
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [location.state, navigate]);

  // Read only this user's tasks, in real time.
  useEffect(() => {
    const q = query(collection(db, "tasks"), where("uid", "==", user.uid));

    return onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Newest first (sorted here to avoid needing a composite index).
        list.sort((a, b) => (b.createdAt?.toMillis?.() ?? Infinity) - (a.createdAt?.toMillis?.() ?? Infinity));
        setTasks(list);
        setLoaded(true);
      },
      (err) => {
        console.error("Task listener error:", err);
        setError("Unable to load tasks.");
        setLoaded(true);
      }
    );
  }, [user.uid]);

  const setBusy = (id, on) =>
    setBusyIds((prev) => {
      const next = new Set(prev);
      on ? next.add(id) : next.delete(id);
      return next;
    });

  const runOnTask = async (id, fn) => {
    setError("");
    setBusy(id, true);
    try {
      await fn(id);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(id, false);
      setConfirmId(null);
    }
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pending = total - done;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const counts = { all: total, pending, completed: done };
  const visible = tasks.filter((t) =>
    filter === "all" ? true : filter === "completed" ? t.completed : !t.completed
  );
  const name = user.email.split("@")[0];

  return (
    <>
      {toast && (
        <p className="toast" role="status">
          <Ant size={26} carrying /> “{toast}” added to your trail.
          <button className="link-btn" onClick={() => setToast("")}>Close</button>
        </p>
      )}

      <section className="colony card">
        <div className="colony-head">
          <div>
            <p className="eyebrow">Colony progress</p>
            <h1>Hi, {name}!</h1>
            <p className="muted">{progressMessage(total, done)}</p>
          </div>
          <div className="pct" aria-label={`${pct}% complete`}>{pct}<small>%</small></div>
        </div>

        <div className="trail" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="trail-fill" style={{ width: `${pct}%` }} />
          <div className="trail-ant" style={{ left: `${pct}%` }}>
            <Ant size={34} walking={pct > 0 && pct < 100} carrying={pct < 100} />
          </div>
          <span className="nest" title="Nest">⌂</span>
        </div>

        <div className="stats">
          <div className="stat"><b>{total}</b><span>Total tasks</span></div>
          <div className="stat done"><b>{done}</b><span>Carried home</span></div>
          <div className="stat pending"><b>{pending}</b><span>On the trail</span></div>
        </div>
      </section>

      <Link to="/new" className="new-task-cta card">
        <span className="plus" aria-hidden="true">+</span>
        <span>
          <b>New task</b>
          <small>Add a title, notes, priority and due date</small>
        </span>
        <span className="arrow" aria-hidden="true">→</span>
      </Link>

      {error && (
        <p className="alert" role="alert">
          {error}
          <button className="link-btn" onClick={() => setError("")}>Dismiss</button>
        </p>
      )}

      <section className="tasks card">
        <div className="tasks-head">
          <h2>My tasks</h2>
          <div className="filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f}
                className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
                {f[0].toUpperCase() + f.slice(1)} <span>{counts[f]}</span>
              </button>
            ))}
          </div>
        </div>

        {!loaded ? (
          <div className="empty"><Ant size={48} walking /><p>Gathering your tasks…</p></div>
        ) : visible.length === 0 ? (
          <div className="empty">
            <Ant size={56} carrying={filter !== "completed"} />
            <p>
              {total === 0
                ? "No tasks yet. The colony is waiting for its first job."
                : filter === "completed"
                ? "Nothing carried home yet. You've got this!"
                : "All done! Time for a well-earned rest."}
            </p>
            {total === 0 && <Link to="/new" className="btn primary">+ Add your first task</Link>}
          </div>
        ) : (
          <ul className="task-list">
            {visible.map((task) => {
              const busy = busyIds.has(task.id);
              const due = !task.completed ? describeDue(task.dueDate) : null;
              return (
                <li key={task.id} className={`task ${task.completed ? "is-done" : ""} ${busy ? "is-busy" : ""}`}>
                  <button
                    className="check"
                    role="checkbox"
                    aria-checked={task.completed}
                    aria-label={`Mark "${task.title}" as ${task.completed ? "pending" : "completed"}`}
                    disabled={busy}
                    onClick={() => runOnTask(task.id, toggleTask)}
                  >
                    <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" /></svg>
                  </button>

                  <div className="task-body">
                    <span className="task-title">{task.title}</span>
                    {task.description && <span className="task-notes">{task.description}</span>}
                    <span className="task-meta">
                      {task.priority && <em className={`prio-tag prio-${task.priority}`}>{task.priority}</em>}
                      {due && <span className={due.overdue ? "due overdue" : due.today ? "due today" : "due"}>{due.text}</span>}
                      <span>Added {formatDate(task.createdAt)}</span>
                      <em className={task.completed ? "tag done" : "tag pending"}>
                        {task.completed ? "Completed" : "Pending"}
                      </em>
                    </span>
                  </div>

                  {confirmId === task.id ? (
                    <div className="confirm">
                      <span>Delete?</span>
                      <button className="btn danger small" disabled={busy}
                        onClick={() => runOnTask(task.id, deleteTask)}>Yes</button>
                      <button className="btn ghost small" disabled={busy}
                        onClick={() => setConfirmId(null)}>No</button>
                    </div>
                  ) : (
                    <button className="icon-btn" aria-label={`Delete "${task.title}"`}
                      disabled={busy} onClick={() => setConfirmId(task.id)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
                      </svg>
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="footer-note muted small center">Tip: like an ant, focus on one task at a time.</p>
    </>
  );
}
