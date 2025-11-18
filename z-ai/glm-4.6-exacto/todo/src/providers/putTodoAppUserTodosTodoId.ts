import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (
    !todo ||
    todo.todo_app_user_id !== props.user.id ||
    todo.status === "deleted"
  ) {
    throw new HttpException("Todo not found or no permission", 404);
  }

  if (props.body.title !== undefined) {
    const exists = await MyGlobal.prisma.todo_app_todos.findFirst({
      where: {
        id: { not: props.todoId },
        todo_app_user_id: props.user.id,
        status: { not: "deleted" },
        title: props.body.title,
      },
    });
    if (exists) {
      throw new HttpException("A todo with that title already exists.", 409);
    }
  }

  let completed_at = todo.completed_at;
  let deleted_at = todo.deleted_at;
  let status =
    typeof props.body.status !== "undefined" ? props.body.status : todo.status;

  const now = toISOStringSafe(new Date());

  if (props.body.status === "completed" && todo.status !== "completed") {
    completed_at = new Date();
    status = "completed";
  } else if (props.body.status === "deleted" && todo.status !== "deleted") {
    deleted_at = new Date();
    status = "deleted";
  } else if (props.body.status === "active") {
    status = "active";
    completed_at = null;
    deleted_at = null;
  }

  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.due_date !== undefined
        ? { due_date: props.body.due_date }
        : {}),
      status,
      completed_at,
      deleted_at,
      updated_at: new Date(),
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    status: typia.assert<"active" | "deleted" | "completed">(updated.status),
    due_date:
      updated.due_date === null || updated.due_date === undefined
        ? undefined
        : toISOStringSafe(updated.due_date),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at:
      updated.completed_at === null || updated.completed_at === undefined
        ? undefined
        : toISOStringSafe(updated.completed_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? undefined
        : toISOStringSafe(updated.deleted_at),
    todo_app_user_id: updated.todo_app_user_id,
  };
}
