import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the task to verify it exists and get ownership info
  const task = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
  });

  // Task not found - throw 404
  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Verify the task belongs to the authenticated user
  if (task.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "Access denied - you can only delete your own tasks",
      403,
    );
  }

  // Delete the task - permanent deletion (not soft delete)
  await MyGlobal.prisma.todo_app_tasks.delete({
    where: { id: props.taskId },
  });

  // Return void on successful deletion
  return;
}
