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
  const now = toISOStringSafe(new Date());
  const todo = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description:
        props.body.description === undefined ? null : props.body.description,
      is_completed: false,
      created_at: now,
      updated_at: now,
    },
  });
  return {
    id: todo.id,
    title: todo.title,
    description:
      typeof todo.description === "string"
        ? todo.description
        : todo.description === null
          ? null
          : undefined,
    is_completed: todo.is_completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  };
}
