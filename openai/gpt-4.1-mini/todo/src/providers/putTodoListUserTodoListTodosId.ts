import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodoListTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("Todo item not found", 404);
  }

  if (existing.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.id },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description:
      updated.description === null ? null : (updated.description ?? undefined),
    status: typia.assert<"pending" | "completed" | "deleted">(updated.status),
    due_date:
      updated.due_date === null
        ? null
        : updated.due_date
          ? toISOStringSafe(updated.due_date)
          : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
