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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.priority !== undefined && {
        priority: props.body.priority,
      }),
      ...(props.body.due_date !== undefined && {
        due_date: props.body.due_date,
      }),
      ...(props.body.completed !== undefined && {
        completed: props.body.completed,
      }),
      ...(props.body.completed_at !== undefined && {
        completed_at: props.body.completed_at,
      }),
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? null,
    status: typia.assert<"completed" | "pending" | "in_progress" | "cancelled">(
      updated.status,
    ),
    priority:
      updated.priority !== null
        ? typia.assert<"low" | "medium" | "high">(updated.priority)
        : null,
    due_date: updated.due_date ? toISOStringSafe(updated.due_date) : null,
    completed: updated.completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
