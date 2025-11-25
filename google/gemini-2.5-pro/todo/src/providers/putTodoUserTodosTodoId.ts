import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.IUpdate;
}): Promise<ITodoTodo> {
  // 1. Check todo existence & ownership
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo || todo.todo_user_id !== props.user.id) {
    throw new HttpException("Todo not found", 404);
  }

  // 2. Prepare fields
  const now = toISOStringSafe(new Date());
  const isCompleting = props.body.status === "complete";
  let completed_at: (string & tags.Format<"date-time">) | null = null;
  if (isCompleting) {
    completed_at = todo.completed_at
      ? typeof todo.completed_at === "string"
        ? todo.completed_at
        : toISOStringSafe(todo.completed_at)
      : now;
  }
  if (props.body.status === "incomplete") {
    completed_at = null;
  }

  // 3. Update
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: {
      title: props.body.title,
      description: Object.prototype.hasOwnProperty.call(
        props.body,
        "description",
      )
        ? props.body.description
        : undefined,
      status: props.body.status,
      updated_at: now,
      completed_at: completed_at,
    },
  });

  // 4. Fetch user summary
  const user = await MyGlobal.prisma.todo_users.findUnique({
    where: { id: updated.todo_user_id },
    select: { id: true },
  });

  // 5. Return mapped ITodoTodo response
  return {
    id: updated.id,
    title: updated.title,
    description:
      typeof updated.description !== "undefined"
        ? updated.description
        : undefined,
    status: typia.assert<"incomplete" | "complete">(updated.status as string),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      typeof updated.completed_at !== "undefined"
        ? updated.completed_at
          ? toISOStringSafe(updated.completed_at)
          : null
        : undefined,
    user: { id: user?.id ?? updated.todo_user_id },
  };
}
