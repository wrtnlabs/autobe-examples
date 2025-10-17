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
  const { user, body } = props;

  const now = toISOStringSafe(new Date());
  const todoId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: todoId,
      todo_list_user_id: user.id,
      title: body.title,
      description: body.description ?? null,
      completed: false,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: todoId,
    title: created.title,
    description: created.description ?? undefined,
    completed: created.completed,
    created_at: now,
    updated_at: now,
  };
}
