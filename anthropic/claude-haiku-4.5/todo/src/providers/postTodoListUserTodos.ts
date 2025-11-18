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
  const now = new Date();

  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      priority: props.body.priority ?? "medium",
      due_date: props.body.due_date ?? null,
      completed: false,
      completed_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    completed: created.completed,
    priority:
      created.priority === null
        ? undefined
        : typia.assert<"low" | "medium" | "high">(created.priority),
    due_date:
      created.due_date === null ? undefined : toISOStringSafe(created.due_date),
    completed_at:
      created.completed_at === null
        ? undefined
        : toISOStringSafe(created.completed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
