import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Find and verify ownership
  const existing = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });
  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }
  // Prepare update fields
  const fields: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(props.body, "description")) {
    fields.description = props.body.description;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "due_date")) {
    fields.due_date =
      props.body.due_date === undefined ? null : props.body.due_date;
  }
  if (Object.prototype.hasOwnProperty.call(props.body, "completed")) {
    fields.completed = props.body.completed;
    // Only update completed_at if status is actually changed
    if (props.body.completed === true && !existing.completed) {
      fields.completed_at = toISOStringSafe(new Date());
    } else if (props.body.completed === false && existing.completed) {
      fields.completed_at = null;
    }
  }
  fields.updated_at = toISOStringSafe(new Date());
  // Save update
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: fields,
  });
  // Load owner summary
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: updated.user_id },
    select: { id: true },
  });
  return {
    id: updated.id,
    description: updated.description,
    due_date:
      updated.due_date instanceof Date
        ? toISOStringSafe(updated.due_date)
        : (updated.due_date ?? null),
    completed: updated.completed,
    completed_at:
      updated.completed_at instanceof Date
        ? toISOStringSafe(updated.completed_at)
        : (updated.completed_at ?? null),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    user: {
      id: user
        ? (user.id satisfies string as string)
        : (v4() satisfies string as string),
    },
  };
}
