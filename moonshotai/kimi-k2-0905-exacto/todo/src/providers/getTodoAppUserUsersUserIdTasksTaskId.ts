import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTask";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserUsersUserIdTasksTaskId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTask> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "User ID mismatch - you can only access your own tasks",
      403,
    );
  }

  const task = await MyGlobal.prisma.todo_app_tasks.findFirst({
    where: {
      id: props.taskId,
      todo_app_user_id: props.userId,
      deleted_at: null,
    },
    include: {
      user: true,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : undefined,
    user: {
      id: task.user.id,
      email: task.user.email,
      name: task.user.name ?? undefined,
      status: task.user.status,
      created_at: toISOStringSafe(task.user.created_at),
    },
  };
}
