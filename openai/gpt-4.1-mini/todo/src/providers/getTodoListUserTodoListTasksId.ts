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

export async function getTodoListUserTodoListTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListTask> {
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.id },
  });

  if (!task) {
    throw new HttpException("Todo task not found", 404);
  }

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: task.id,
    title: task.title,
    description: task.description === null ? undefined : task.description,
    is_completed: task.is_completed,
    completed_at: task.completed_at ? toISOStringSafe(task.completed_at) : null,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
  };
}
