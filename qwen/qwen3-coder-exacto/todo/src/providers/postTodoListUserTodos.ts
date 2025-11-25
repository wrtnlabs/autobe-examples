import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListUserTodo.ICreate;
}): Promise<ITodoListUserTodo> {
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description: undefined,
      completed: false,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    todo_list_user_id: created.todo_list_user_id,
    title: created.title,
    description: created.description ?? undefined,
    completed: created.completed,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
