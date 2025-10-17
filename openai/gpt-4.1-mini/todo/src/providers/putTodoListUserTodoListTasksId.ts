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

export async function putTodoListUserTodoListTasksId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListTask.IUpdate;
}): Promise<ITodoListTask> {
  const { user, id, body } = props;

  const existingTask = await MyGlobal.prisma.todo_list_tasks.findUniqueOrThrow({
    where: { id },
  });

  if (existingTask.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  if (existingTask.todo_list_user_id !== user.id) {
    throw new HttpException("Forbidden: You do not own this task", 403);
  }

  const updatedTask = await MyGlobal.prisma.todo_list_tasks.update({
    where: { id },
    data: {
      description: body.description ?? undefined,
      is_completed: body.is_completed ?? undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updatedTask.id,
    todo_list_user_id: updatedTask.todo_list_user_id,
    description: updatedTask.description,
    is_completed: updatedTask.is_completed,
    created_at: toISOStringSafe(updatedTask.created_at),
    updated_at: toISOStringSafe(updatedTask.updated_at),
    deleted_at: updatedTask.deleted_at
      ? toISOStringSafe(updatedTask.deleted_at)
      : null,
  };
}
