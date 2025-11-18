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
  const existing = await MyGlobal.prisma.todo_list_tasks.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Todo list task not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_tasks.update({
    where: { id: props.id },
    data: {
      title: props.body.title ?? undefined,
      description: Object.hasOwn(props.body, "description")
        ? (props.body.description ?? null)
        : undefined,
      is_completed: props.body.is_completed ?? undefined,
      completed_at: Object.hasOwn(props.body, "completed_at")
        ? (props.body.completed_at ?? null)
        : undefined,
      deleted_at: Object.hasOwn(props.body, "deleted_at")
        ? (props.body.deleted_at ?? null)
        : undefined,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    is_completed: updated.is_completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
