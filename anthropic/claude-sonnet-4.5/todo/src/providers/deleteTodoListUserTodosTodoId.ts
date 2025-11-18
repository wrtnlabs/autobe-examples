import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  // Retrieve the todo item ensuring it belongs to the requesting user and is not already deleted
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
    include: { user: true },
  });

  if (!todo || todo.user_id !== props.user.id) {
    throw new HttpException("Todo not found or forbidden", 404);
  }

  if (todo.deleted_at !== null) {
    // Already deleted: idempotent, still return the state
    // But update updated_at timestamp in case of audit trail requirement
    const updated = await MyGlobal.prisma.todo_list_todos.update({
      where: { id: props.todoId },
      data: { updated_at: toISOStringSafe(new Date()) },
      include: { user: true },
    });
    return {
      id: updated.id,
      user: {
        id: updated.user.id,
        email: updated.user.email,
        created_at: toISOStringSafe(updated.user.created_at),
        updated_at: toISOStringSafe(updated.user.updated_at),
        disabled_at:
          updated.user.disabled_at !== null
            ? toISOStringSafe(updated.user.disabled_at)
            : undefined,
      },
      title: updated.title,
      description: updated.description ?? undefined,
      status: typia.assert<"pending" | "completed" | "deleted">(updated.status),
      due_date:
        updated.due_date !== null
          ? toISOStringSafe(updated.due_date)
          : undefined,
      completed_at:
        updated.completed_at !== null
          ? toISOStringSafe(updated.completed_at)
          : undefined,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at !== null
          ? toISOStringSafe(updated.deleted_at)
          : undefined,
    };
  }

  const now = toISOStringSafe(new Date());
  const deleted = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: { deleted_at: now, updated_at: now },
    include: { user: true },
  });
  return {
    id: deleted.id,
    user: {
      id: deleted.user.id,
      email: deleted.user.email,
      created_at: toISOStringSafe(deleted.user.created_at),
      updated_at: toISOStringSafe(deleted.user.updated_at),
      disabled_at:
        deleted.user.disabled_at !== null
          ? toISOStringSafe(deleted.user.disabled_at)
          : undefined,
    },
    title: deleted.title,
    description: deleted.description ?? undefined,
    status: typia.assert<"pending" | "completed" | "deleted">(deleted.status),
    due_date:
      deleted.due_date !== null ? toISOStringSafe(deleted.due_date) : undefined,
    completed_at:
      deleted.completed_at !== null
        ? toISOStringSafe(deleted.completed_at)
        : undefined,
    created_at: toISOStringSafe(deleted.created_at),
    updated_at: toISOStringSafe(deleted.updated_at),
    deleted_at:
      deleted.deleted_at !== null
        ? toISOStringSafe(deleted.deleted_at)
        : undefined,
  };
}
