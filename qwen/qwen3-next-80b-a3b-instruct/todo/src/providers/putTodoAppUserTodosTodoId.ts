import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Verify todo exists and belongs to authenticated user
  const existing = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId, todo_app_user_id: props.user.id },
  });
  if (!existing) {
    throw new HttpException("Todo not found", 404);
  }
  // Update todo item with inline parameters
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
      title:
        props.body.title !== undefined && props.body.title !== null
          ? { set: props.body.title }
          : undefined,
      description:
        props.body.description !== undefined && props.body.description !== null
          ? { set: props.body.description }
          : undefined,
      start_date:
        props.body.start_date !== undefined && props.body.start_date !== null
          ? { set: props.body.start_date }
          : undefined,
      due_date:
        props.body.due_date !== undefined && props.body.due_date !== null
          ? { set: props.body.due_date }
          : undefined,
    },
  });
  // Return complete updated todo item with proper date formatting and null/undefined handling
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description === null ? undefined : updated.description,
    completion_status: updated.completion_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    start_date:
      updated.start_date === null ? null : toISOStringSafe(updated.start_date),
    due_date:
      updated.due_date === null ? null : toISOStringSafe(updated.due_date),
    is_deleted: updated.deleted_at !== null,
  };
}
