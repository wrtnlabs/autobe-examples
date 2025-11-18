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
  // Step 1: Retrieve the todo for this user
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }

  if (existing.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Step 2: Prepare changes
  const nowIso = toISOStringSafe(new Date());
  let completedAt: string | null = existing.completed_at
    ? toISOStringSafe(existing.completed_at)
    : null;
  let completed = existing.completed;

  if ("completed" in props.body && typeof props.body.completed === "boolean") {
    if (props.body.completed !== existing.completed) {
      completed = props.body.completed;
      completedAt = completed ? nowIso : null;
    }
  }

  const updateData: Record<string, unknown> = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.completed !== undefined && { completed: completed }),
    ...(props.body.completed !== undefined && { completed_at: completedAt }),
    updated_at: nowIso,
  };

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? null : updated.description,
    completed: updated.completed,
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
