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

export async function postTodoListUserTodoListTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.ICreate;
}): Promise<ITodoListTodo> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id: string & tags.Format<"uuid"> = v4();

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id,
      user: { connect: { id: props.user.id } },
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status,
      due_date: props.body.due_date ?? null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description ?? null,
    status: created.status as "pending" | "completed" | "deleted",
    due_date:
      created.due_date === null || created.due_date === undefined
        ? null
        : toISOStringSafe(created.due_date),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
