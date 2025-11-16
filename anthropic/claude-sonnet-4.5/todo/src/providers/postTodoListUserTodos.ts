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
  const created = await MyGlobal.prisma.todo_list_todos.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.user.id,
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "pending",
      priority: props.body.priority ?? "medium",
      due_date: props.body.due_date ?? null,
      completed: props.body.completed ?? false,
      completed_at:
        (props.body.completed ?? false) ? toISOStringSafe(new Date()) : null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description === null ? undefined : created.description,
    status: created.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "cancelled",
    priority:
      created.priority === null
        ? undefined
        : (created.priority as "low" | "medium" | "high"),
    due_date:
      created.due_date === null ? undefined : toISOStringSafe(created.due_date),
    completed: created.completed,
    completed_at:
      created.completed_at === null
        ? undefined
        : toISOStringSafe(created.completed_at),
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null
        ? undefined
        : toISOStringSafe(created.deleted_at),
  };
}
