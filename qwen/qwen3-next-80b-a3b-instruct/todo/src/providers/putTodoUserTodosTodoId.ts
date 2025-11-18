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

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  // 1. Fetch the todo and enforce ownership
  const existing = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      todo_user_id: props.user.id,
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found or forbidden", 404);
  }

  // 2. Title uniqueness within user's todos (excluding self)
  const titleCandidate = props.body.title;
  const duplicate = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      todo_user_id: props.user.id,
      title: titleCandidate,
      id: { not: props.todoId },
    },
  });
  if (duplicate) {
    throw new HttpException("Title must be unique per user", 409);
  }

  // 3. Prepare data for update
  const prevCompleted = Boolean(existing.completed);
  const nextCompleted =
    props.body.completed === undefined ? prevCompleted : props.body.completed;

  let nextCompletedAt: Date | null = null;
  if (nextCompleted) {
    if (!prevCompleted) {
      nextCompletedAt = new Date();
    } else {
      nextCompletedAt = existing.completed_at
        ? existing.completed_at
        : new Date();
    }
  } else {
    nextCompletedAt = null;
  }

  // 4. Update
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? (props.body.description ?? null)
        : existing.description,
      completed: nextCompleted,
      updated_at: new Date(),
      completed_at: nextCompletedAt,
    },
  });

  // 5. Fetch user info for summary
  const user = await MyGlobal.prisma.todo_user.findUnique({
    where: { id: updated.todo_user_id },
    select: { id: true, email: true, created_at: true, deleted_at: true },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : undefined,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
  };
}
