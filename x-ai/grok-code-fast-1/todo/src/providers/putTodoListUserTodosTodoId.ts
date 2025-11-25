import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo || todo.deleted_at) {
    throw new HttpException("Todo not found", 404);
  }

  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this todo",
      403,
    );
  }

  // Check for unique title if title is changing
  if (props.body.title !== undefined && props.body.title !== todo.title) {
    const duplicate = await MyGlobal.prisma.todo_list_todos.findFirst({
      where: {
        title: props.body.title,
        deleted_at: null,
        todo_list_user_id: props.user.id,
        NOT: { id: props.todoId },
      },
    });
    if (duplicate) {
      throw new HttpException(
        "Another active todo with this title already exists.",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  let completed_at: string | null | undefined = todo.completed_at
    ? toISOStringSafe(todo.completed_at)
    : null;

  let status = todo.status;
  if (props.body.status !== undefined) {
    status = props.body.status;
    if (props.body.status === "completed") {
      completed_at = now;
    } else if (props.body.status === "pending") {
      completed_at = null;
    }
  }

  const updateData = {
    ...(props.body.title !== undefined ? { title: props.body.title } : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.status !== undefined ? { completed_at: completed_at } : {}),
    updated_at: now,
  };

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  return {
    id: updated.id,
    title: updated.title,
    description:
      typeof updated.description === "undefined"
        ? undefined
        : updated.description === null
          ? null
          : updated.description,
    status: typia.assert<"pending" | "completed">(updated.status),
    completed_at:
      typeof updated.completed_at === "undefined"
        ? undefined
        : updated.completed_at === null
          ? null
          : toISOStringSafe(updated.completed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      typeof updated.deleted_at === "undefined"
        ? undefined
        : updated.deleted_at === null
          ? undefined
          : toISOStringSafe(updated.deleted_at),
  };
}
