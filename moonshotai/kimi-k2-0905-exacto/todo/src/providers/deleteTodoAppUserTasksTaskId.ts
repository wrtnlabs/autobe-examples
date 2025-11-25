import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTask> {
  // Fetch task to verify existence and ownership
  const task = await MyGlobal.prisma.todo_app_tasks.findUnique({
    where: { id: props.taskId },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Verify user owns the task
  if (task.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Fetch user summary using the task's user_id for consistency
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: task.todo_app_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Delete the task permanently and store the deleted data
  const deletedTask = await MyGlobal.prisma.todo_app_tasks.delete({
    where: { id: props.taskId },
  });

  // Return formatted task with user summary
  return {
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : undefined,
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
    user: {
      id: user.id as string & tags.Format<"uuid">,
      email: user.email,
      name: user.name ?? undefined,
      status: user.status,
      created_at: toISOStringSafe(user.created_at),
    },
  };
}
