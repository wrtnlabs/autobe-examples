import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTasks } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTasks";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodoListTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListTasks> {
  const task = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.id },
  });

  if (!task || task.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (task.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden: Cannot access others' tasks", 403);
  }

  return {
    id: task.id,
    todo_list_user_id: task.todo_list_user_id,
    description: task.description,
    is_completed: task.is_completed,
    created_at: toISOStringSafe(task.created_at),
    updated_at: toISOStringSafe(task.updated_at),
    deleted_at: task.deleted_at ? toISOStringSafe(task.deleted_at) : null,
  };
}
