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

export async function getTodoAppUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTask> {
  const task = await MyGlobal.prisma.todo_app_tasks.findFirst({
    where: {
      id: props.taskId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.user.id },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description ? task.description : undefined,
    status: task.status,
    user: {
      id: user.id,
      email: user.email,
    },
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
  };
}
