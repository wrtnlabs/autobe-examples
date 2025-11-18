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

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  // 1. Generate new UUID for the todo item
  const todoId = v4();
  const now = toISOStringSafe(new Date());

  // 2. Check for per-user title uniqueness (case-insensitive)
  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      user_id: props.user.id,
      title: props.body.title,
    },
  });

  if (existing) {
    throw new HttpException(
      "A todo with this title already exists for this user.",
      409,
    );
  }

  // 3. Insert new todo row
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: "incomplete",
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Fetch user summary
  const userSummary = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.user.id },
    select: { id: true, email: true },
  });

  if (!userSummary) {
    throw new HttpException("User not found for response embedding.", 500);
  }

  return {
    id: created.id,
    user: {
      id: userSummary.id,
      email: userSummary.email,
    },
    title: created.title,
    description: created.description ?? undefined,
    status: typia.assert<"incomplete" | "complete">(created.status),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
