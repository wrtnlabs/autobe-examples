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
    },
    include: {
      user: true,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  return {
    id: task.id as string & tags.Format<"uuid">,
    title: task.title,
    description: task.description ?? undefined,
    status: task.status,
    priority: task.priority ?? undefined,
    due_date: task.due_date ? toISOStringSafe(task.due_date) : null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : undefined,
    user: {
      id: task.user.id as string & tags.Format<"uuid">,
      email: task.user.email,
      name: task.user.name ?? undefined,
      status: task.user.status,
      created_at: toISOStringSafe(task.user.created_at),
    },
  };
}
