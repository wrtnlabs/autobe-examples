import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTask } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTask";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string;
}): Promise<ITodoListTask> {
  const task = await MyGlobal.prisma.todo_list_task.findUnique({
    where: {
      id: props.taskId,
      user_id: props.user.id,
    },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  return {
    id: task.id,
    description: task.description,
    completed: task.completed, // Database schema says required boolean, DTO must reflect this
    created_at: toISOStringSafe(task.created_at),
    completed_at: task.completed_at
      ? toISOStringSafe(task.completed_at)
      : undefined,
  };
}
