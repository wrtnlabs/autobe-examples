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
  const now = toISOStringSafe(new Date());
  // Step 1: fetch todo and validate ownership
  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
      // 'deleted_at' removed, not present in schema
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found or not accessible", 404);
  }
  // Step 2: determine completed_at update (business logic)
  let completed_at: (string & tags.Format<"date-time">) | null | undefined =
    existing.completed_at === null
      ? null
      : toISOStringSafe(existing.completed_at);
  if (Object.prototype.hasOwnProperty.call(props.body, "is_completed")) {
    if (props.body.is_completed === true && existing.is_completed === false) {
      completed_at = now;
    } else if (
      props.body.is_completed === false &&
      existing.is_completed === true
    ) {
      completed_at = null;
    }
  }
  // Step 3: prepare update fields
  const updateData: { [key: string]: unknown } = {
    updated_at: now,
  };
  if (Object.prototype.hasOwnProperty.call(props.body, "title"))
    updateData.title = props.body.title;
  if (Object.prototype.hasOwnProperty.call(props.body, "description"))
    updateData.description = props.body.description;
  if (Object.prototype.hasOwnProperty.call(props.body, "due_date"))
    updateData.due_date = props.body.due_date;
  if (Object.prototype.hasOwnProperty.call(props.body, "is_completed"))
    updateData.is_completed = props.body.is_completed;
  if (Object.prototype.hasOwnProperty.call(props.body, "is_completed"))
    updateData.completed_at = completed_at;
  // Step 4: execute update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });
  // Step 5: Construct ITodoListTodo response, enforce DTO types and null/undefined rules
  return {
    id: updated.id,
    todo_list_user_id: updated.todo_list_user_id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    due_date:
      updated.due_date === null ? undefined : toISOStringSafe(updated.due_date),
    is_completed: updated.is_completed,
    completed_at:
      updated.completed_at === null
        ? undefined
        : toISOStringSafe(updated.completed_at),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
