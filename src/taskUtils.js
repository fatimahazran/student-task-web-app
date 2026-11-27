export const PRIORITIES = [
  { value: "low", label: "Low", hint: "A small crumb" },
  { value: "medium", label: "Medium", hint: "A good-sized leaf" },
  { value: "high", label: "High", hint: "Heavy load, do it first" }
];

export const TITLE_MAX = 100;
export const NOTES_MAX = 500;

// Today's date as YYYY-MM-DD in the user's own timezone.
export function todayISO() {
  return new Date().toLocaleDateString("en-CA");
}

// "2026-12-03" -> { text: "Due 3 Dec", overdue, today }
export function describeDue(dueDate) {
  if (!dueDate) return null;
  const today = todayISO();
  const [y, m, d] = dueDate.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString(undefined, { day: "numeric", month: "short" });
  if (dueDate === today) return { text: "Due today", overdue: false, today: true };
  if (dueDate < today) return { text: `Overdue · ${label}`, overdue: true, today: false };
  return { text: `Due ${label}`, overdue: false, today: false };
}
