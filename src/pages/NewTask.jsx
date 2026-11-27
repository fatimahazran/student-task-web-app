import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { createTask } from "../api";
import { Ant } from "../components/Ant";
import { PRIORITIES, TITLE_MAX, NOTES_MAX, todayISO, describeDue } from "../taskUtils";

const EMPTY = { title: "", description: "", priority: "medium", dueDate: "" };

export default function NewTask() {
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState([]); // titles saved with "Save & add another"

  useEffect(() => { titleRef.current?.focus(); }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const canSave = form.title.trim().length > 0 && !saving;
  const due = describeDue(form.dueDate);

  // stay=true: keep the page open for another task.
  const save = async (stay) => {
    if (!canSave) return;
    setError("");
    setSaving(true);
    try {
      await createTask({
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate || null
      });
      if (stay) {
        setAdded((a) => [form.title.trim(), ...a]);
        setForm((f) => ({ ...EMPTY, priority: f.priority, dueDate: f.dueDate }));
        titleRef.current?.focus();
      } else {
        navigate("/", { state: { added: form.title.trim() } });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="new-task">
      <Link to="/" className="back-link">← Back to my tasks</Link>

      <div className="new-grid">
        <form className="card new-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
          <div>
            <p className="eyebrow">New task</p>
            <h1>What will you carry?</h1>
            <p className="muted">Give your task a name. Notes, priority and due date are optional.</p>
          </div>

          <label className="field">
            <span className="field-row">
              Title <em className="req">required</em>
              <span className={`counter ${form.title.length > TITLE_MAX - 10 ? "warn" : ""}`}>
                {form.title.length}/{TITLE_MAX}
              </span>
            </span>
            <input ref={titleRef} value={form.title} onChange={set("title")} maxLength={TITLE_MAX}
              placeholder="e.g. Finish SSE3308 lab report" />
          </label>

          <label className="field">
            <span className="field-row">
              Notes
              <span className={`counter ${form.description.length > NOTES_MAX - 30 ? "warn" : ""}`}>
                {form.description.length}/{NOTES_MAX}
              </span>
            </span>
            <textarea value={form.description} onChange={set("description")} maxLength={NOTES_MAX} rows={4}
              placeholder="Any details: links, page numbers, who to ask…" />
          </label>

          <fieldset className="field">
            <legend>Priority</legend>
            <div className="priority-picker">
              {PRIORITIES.map((p) => (
                <label key={p.value} className={`prio-option prio-${p.value} ${form.priority === p.value ? "selected" : ""}`}>
                  <input type="radio" name="priority" value={p.value}
                    checked={form.priority === p.value} onChange={set("priority")} />
                  <span className="prio-dot" aria-hidden="true" />
                  <span className="prio-text"><b>{p.label}</b><small>{p.hint}</small></span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-row">
              Due date
              {form.dueDate && (
                <button type="button" className="link-btn small" onClick={() => setForm((f) => ({ ...f, dueDate: "" }))}>
                  Clear
                </button>
              )}
            </span>
            <input type="date" value={form.dueDate} min={todayISO()} onChange={set("dueDate")} />
          </label>

          {error && <p className="alert" role="alert">{error}</p>}

          <div className="form-actions">
            <button type="submit" className="btn primary" disabled={!canSave}>
              {saving ? <><Ant size={22} walking /> Saving…</> : "Save task"}
            </button>
            <button type="button" className="btn ghost" disabled={!canSave} onClick={() => save(true)}>
              Save &amp; add another
            </button>
            <Link to="/" className="btn ghost cancel">Cancel</Link>
          </div>
        </form>

        <aside className="preview">
          <p className="eyebrow">Preview</p>
          <div className="card preview-card">
            <span className="check" aria-hidden="true" />
            <div className="task-body">
              <span className="task-title">{form.title.trim() || "Your task title"}</span>
              {form.description.trim() && <span className="task-notes">{form.description.trim()}</span>}
              <span className="task-meta">
                <em className={`prio-tag prio-${form.priority}`}>{form.priority} priority</em>
                {due && <span className={due.overdue ? "due overdue" : due.today ? "due today" : "due"}>{due.text}</span>}
              </span>
            </div>
          </div>

          {added.length > 0 && (
            <div className="added-list" role="status">
              <p className="eyebrow">Added just now</p>
              <ul>
                {added.map((t, i) => <li key={i}><span className="tick">✓</span> {t}</li>)}
              </ul>
              <Link to="/" className="link-btn">See them on your dashboard →</Link>
            </div>
          )}

          {added.length === 0 && (
            <div className="preview-tip muted">
              <Ant size={44} carrying />
              <p>Tip: split big jobs into small tasks. Ants carry one crumb at a time, and they always get there.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
