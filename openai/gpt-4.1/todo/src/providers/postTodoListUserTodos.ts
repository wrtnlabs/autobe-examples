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
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4(),
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description:
        props.body.description !== undefined ? props.body.description : null,
      completed: false,
      created_at: now,
      updated_at: now,
      completed_at: null,
    },
  });
  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    title: created.title,
    ...(created.description !== undefined && {
      description: created.description,
    }),
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    ...(created.completed_at !== undefined && {
      completed_at:
        created.completed_at !== null
          ? toISOStringSafe(created.completed_at)
          : created.completed_at,
    }),
  };
}
