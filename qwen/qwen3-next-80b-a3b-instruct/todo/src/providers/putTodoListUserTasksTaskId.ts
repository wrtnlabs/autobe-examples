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

export async function putTodoListUserTasksTaskId(props: {
  user: UserPayload;
  taskId: string;
  body: ITodoListTask.IUpdate;
}): Promise<ITodoListTask> {
  const task = await MyGlobal.prisma.todo_list_task.findUnique({
    where: { id: props.taskId, user_id: props.user.id, deleted_at: null },
  });

  if (!task) {
    throw new HttpException("Task not found", 404);
  }

  // Since IUpdate is string, body is the new description
  // Check if description is provided and non-empty
  if (props.body !== undefined) {
    const trimmed = props.body.trim();
    if (trimmed.length === 0) {
      throw new HttpException("Description cannot be empty", 400);
    }
  }

  const updated = await MyGlobal.prisma.todo_list_task.update({
    where: { id: props.taskId },
    data: {
      description:
        props.body !== undefined ? props.body.trim() : task.description,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    description: updated.description,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
  };
}
