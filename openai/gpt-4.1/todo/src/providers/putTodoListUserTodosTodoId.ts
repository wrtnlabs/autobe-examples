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

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Fetch and enforce ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or not authorized", 404);
  }

  // Prepare logic for completed/completed_at handling
  const now = toISOStringSafe(new Date());
  let completedValue = todo.completed;
  let completedAtValue: (string & tags.Format<"date-time">) | null | undefined =
    todo.completed_at ? toISOStringSafe(todo.completed_at) : null;
  if (props.body.completed !== undefined) {
    if (props.body.completed === true && todo.completed === false) {
      completedValue = true;
      completedAtValue = now;
    } else if (props.body.completed === false && todo.completed === true) {
      completedValue = false;
      completedAtValue = null;
    } else {
      completedValue = props.body.completed;
      // completedAtValue unchanged
    }
  }

  // Build update data object only with provided fields
  await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.title !== undefined ? { title: props.body.title } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.completed !== undefined
        ? { completed: completedValue }
        : {}),
      updated_at: now,
      completed_at: completedAtValue,
    },
  });

  // Retrieve the updated row (to fetch the actual state w/ conversions for all date fields)
  const updated = await MyGlobal.prisma.todo_list_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
  });

  return {
    id: updated.id,
    todo_list_user_id: updated.todo_list_user_id,
    title: updated.title,
    description: updated.description ?? undefined,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
  };
}
