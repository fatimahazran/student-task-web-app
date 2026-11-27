// DELETE TASK
import { commit, getOwnedTask, serveTask } from "../_shared/firebase.ts";

serveTask(async (uid, data) => {
  const task = await getOwnedTask(uid, data.taskId);

  await commit([{ delete: task.name, currentDocument: { updateTime: task.updateTime } }]);

  return { success: true, message: "Task deleted successfully!" };
});
