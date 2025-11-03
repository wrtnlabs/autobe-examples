import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.ICreate;
}): Promise<ITodoTodo> {
  const { user, body } = props;

  // Authorization: ensure the authenticated user exists
  const owner = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: user.id },
  });
  if (!owner) {
    throw new HttpException("Unauthorized: User not found", 403);
  }

  // Timestamps
  const now = toISOStringSafe(new Date());

  // Optional due_date (date-only) -> store as KST midnight date-time
  const storedDueDate =
    body.due_date !== undefined && body.due_date !== null
      ? toISOStringSafe(new Date(`${body.due_date}T00:00:00+09:00`))
      : null;

  // Generate ID (schema has no default for id)
  const id = v4() as string & tags.Format<"uuid">;

  // Create the todo
  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id,
      todo_user_id: user.id,
      title: body.title,
      description: body.description ?? null,
      due_date: storedDueDate,
      completed: false,
      created_at: now,
      updated_at: now,
    },
  });

  // Response DTO using prepared values and owner summary
  return {
    id: id,
    title: created.title,
    description: body.description ?? null,
    due_date: body.due_date ?? null,
    completed: created.completed,
    created_at: now,
    updated_at: now,
    user: {
      id: owner.id as string & tags.Format<"uuid">,
      email: owner.email as string & tags.Format<"email">,
      created_at: toISOStringSafe(owner.created_at),
      updated_at: toISOStringSafe(owner.updated_at),
    },
  };
}
