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

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  // Business rules: title present, due_date today or future if provided
  const { title, description, due_date } = props.body;

  // Explicit check: Prisma unique constraint (user, title, due_date)
  const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      todo_list_user_id: props.user.id,
      title,
      due_date: due_date ?? null,
    },
  });
  if (duplicate) {
    throw new HttpException(
      "A todo with this title and due date already exists for this user.",
      409,
    );
  }

  // Validate due_date is today or future (if present)
  if (due_date) {
    const now = new Date();
    const requested = new Date(due_date);
    if (requested.getTime() < now.setHours(0, 0, 0, 0)) {
      throw new HttpException("Due date must be today or a future date.", 400);
    }
  }

  const nowIso = toISOStringSafe(new Date());
  const newId = v4();
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: newId,
      todo_list_user_id: props.user.id,
      title,
      description: typeof description === "string" ? description : null,
      completed: false,
      due_date: due_date ?? null,
      created_at: nowIso,
      updated_at: nowIso,
    },
  });
  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    completed: created.completed,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    todo_list_user_id: created.todo_list_user_id,
  };
}
