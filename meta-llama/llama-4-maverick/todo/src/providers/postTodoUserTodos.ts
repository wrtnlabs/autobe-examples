import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.ICreate;
}): Promise<ITodoTodo> {
  const now = new Date();
  const nowISOString = toISOStringSafe(now);

  // Check for uniqueness: same user, same title, same due_date (null treated as null)
  const exists = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      user_id: props.user.id,
      title: props.body.title,
      due_date: props.body.due_date === undefined ? null : props.body.due_date,
    },
  });
  if (exists !== null) {
    throw new HttpException(
      "A todo with the same title and due date already exists.",
      409,
    );
  }

  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id: v4(), // Will be returned in correct type below
      user_id: props.user.id,
      title: props.body.title,
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      due_date:
        props.body.due_date === undefined ? undefined : props.body.due_date,
      priority:
        props.body.priority === undefined ? undefined : props.body.priority,
      is_completed: false,
      completed_at: null,
      created_at: nowISOString,
      updated_at: nowISOString,
    },
  });

  return {
    id: created.id,
    user_id: created.user_id,
    title: created.title,
    description: created.description ?? undefined,
    due_date:
      created.due_date !== null && created.due_date !== undefined
        ? toISOStringSafe(created.due_date)
        : created.due_date,
    priority:
      created.priority !== undefined && created.priority !== null
        ? typia.assert<"low" | "medium" | "high">(created.priority)
        : created.priority,
    is_completed: created.is_completed,
    completed_at:
      created.completed_at !== null && created.completed_at !== undefined
        ? toISOStringSafe(created.completed_at)
        : created.completed_at,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
