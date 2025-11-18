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
  const maxActiveTodos = 1000;
  const activeTodoCount = await MyGlobal.prisma.todo_todos.count({
    where: {
      user_id: props.user.id,
      is_completed: false,
    },
  });
  if (activeTodoCount >= maxActiveTodos) {
    throw new HttpException(
      "You have reached the maximum number of active todo items (1000). Please complete or delete existing todos before adding more.",
      400,
    );
  }
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.todo_todos.create({
    data: {
      id: v4(),
      user_id: props.user.id,
      description: props.body.description,
      is_completed: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
    },
    include: {
      user: true,
    },
  });
  const userSummary = {
    id: created.user.id,
    email: created.user.email,
    created_at: toISOStringSafe(created.user.created_at),
    updated_at: toISOStringSafe(created.user.updated_at),
  };
  return {
    id: created.id,
    description: created.description,
    is_completed: created.is_completed,
    completed_at:
      created.completed_at === null
        ? null
        : toISOStringSafe(created.completed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    user: userSummary,
  };
}
