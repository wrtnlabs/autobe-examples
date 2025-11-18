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
  // Check for per-user uniqueness (title must be unique per user and not blank/whitespace-only)
  const existing = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      todo_user_id: props.user.id,
      title: props.body.title,
    },
  });
  if (existing) {
    throw new HttpException(
      "A todo with this title already exists for this user.",
      409,
    );
  }

  // Insert todo
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      completed: false,
      created_at: now,
      updated_at: now,
      completed_at: null,
    },
    include: {
      user: true,
    },
  });
  return {
    id: created.id,
    title: created.title,
    description: created.description ?? undefined,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    completed_at: created.completed_at
      ? toISOStringSafe(created.completed_at)
      : undefined,
    user: {
      id: created.user.id,
      email: created.user.email,
      created_at: toISOStringSafe(created.user.created_at),
      deleted_at: created.user.deleted_at
        ? toISOStringSafe(created.user.deleted_at)
        : undefined,
    },
  };
}
