import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  const userId = props.user.id;
  const description = props.body.description;

  // Uniqueness check (case-insensitive description, exact due_date or null)
  const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      user_id: userId,
      // description match, case-insensitive
      description: { equals: description, mode: "insensitive" },
      // due_date both null or both equal
      ...(props.body.due_date === null || props.body.due_date === undefined
        ? { due_date: null }
        : { due_date: props.body.due_date }),
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Duplicate todo: each (description, due_date) pair must be unique per user.",
      409,
    );
  }

  // Enforce max 1000 items per user
  const totalCount = await MyGlobal.prisma.todo_list_todos.count({
    where: { user_id: userId },
  });
  if (totalCount >= 1000) {
    throw new HttpException(
      "Maximum todo limit (1000) reached for this user.",
      429,
    );
  }

  // Generate all required fields, no use of native Date
  const now = toISOStringSafe(new Date());
  const todoId = v4();

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      user_id: userId,
      description: description,
      due_date: props.body.due_date === undefined ? null : props.body.due_date,
      completed: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    include: {
      user: true,
    },
  });

  // Compose output, strictly following null vs undefined for optional fields
  return {
    id: created.id,
    description: created.description,
    due_date:
      created.due_date === null || created.due_date === undefined
        ? undefined
        : toISOStringSafe(created.due_date),
    completed: created.completed,
    completed_at: undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    user: {
      id: created.user.id,
    },
  };
}
