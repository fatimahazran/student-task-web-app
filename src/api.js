import { auth } from "./firebase";

// Supabase project URL, e.g. https://abcdefgh.supabase.co (set in .env)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Calls a Supabase Edge Function with the signed-in user's Firebase ID token.
// The function verifies this token on the server to know who the caller is.
async function callFunction(name, data) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please login first.");
  if (!SUPABASE_URL) throw new Error("VITE_SUPABASE_URL is not set in .env");

  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify(data),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || `Request failed (${res.status})`);
  return body;
}

// task: { title, description?, priority?: "low"|"medium"|"high", dueDate?: "YYYY-MM-DD" }
export const createTask = (task) => callFunction("create-task", task);
export const toggleTask = (taskId) => callFunction("toggle-task", { taskId });
export const deleteTask = (taskId) => callFunction("delete-task", { taskId });
