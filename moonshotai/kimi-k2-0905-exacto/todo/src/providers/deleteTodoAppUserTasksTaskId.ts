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
  // Verify the task exists and belongs to the authenticated user
  const task = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Check if the task belongs to the authenticated user
  if (task.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden - Task does not belong to user", 403);
  }

  // Delete the task permanently
  await MyGlobal.prisma.todo_app_tasks.delete({
    where: { id: props.taskId },
  });
}
