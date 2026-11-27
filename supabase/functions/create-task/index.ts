// CREATE TASK
import { commit, HttpError, newTaskId, serveTask, taskPath } from "../_shared/firebase.ts";

const PRIORITIES = ["low", "medium", "high"];

// "YYYY-MM-DD" that is a real calendar date.
function isValidDate(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

serveTask(async (uid, data) => {
  const { title, description = "", priority = "medium", dueDate = null } = data;

  // Title: required, 1-100 characters.
  if (typeof title !== "string" || !title.trim() || title.trim().length > 100) {
    throw new HttpError(400, "invalid-argument", "Task title must contain 1-100 characters.");
  }
  // Notes: optional, up to 500 characters.
  if (typeof description !== "string" || description.trim().length > 500) {
    throw new HttpError(400, "invalid-argument", "Notes must be 500 characters or fewer.");
  }
  // Priority: one of low / medium / high.
  if (typeof priority !== "string" || !PRIORITIES.includes(priority)) {
    throw new HttpError(400, "invalid-argument", "Priority must be low, medium or high.");
  }
  // Due date: optional, YYYY-MM-DD.
  if (dueDate !== null && dueDate !== "" && (typeof dueDate !== "string" || !isValidDate(dueDate))) {
    throw new HttpError(400, "invalid-argument", "Due date must be a valid date.");
  }

  const taskId = newTaskId();
  await commit([
    {
      update: {
        name: taskPath(taskId),
        fields: {
          uid: { stringValue: uid }, // always the verified UID, never from the request body
          title: { stringValue: title.trim() },
          description: { stringValue: description.trim() },
          priority: { stringValue: priority },
          dueDate: dueDate ? { stringValue: dueDate } : { nullValue: null },
          completed: { booleanValue: false },
        },
      },
      updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: false },
    },
  ]);

  return { success: true, message: "Task created successfully!", taskId };
});
