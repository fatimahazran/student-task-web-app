// TOGGLE TASK STATUS
import { commit, getOwnedTask, serveTask } from "../_shared/firebase.ts";

serveTask(async (uid, data) => {
  const task = await getOwnedTask(uid, data.taskId);

  const newStatus = !task.completed;
  await commit([
    {
      update: { name: task.name, fields: { completed: { booleanValue: newStatus } } },
      updateMask: { fieldPaths: ["completed"] },
      // Only apply if nobody changed the task since we checked ownership.
      currentDocument: { updateTime: task.updateTime },
    },
  ]);

  return { success: true, completed: newStatus };
});
