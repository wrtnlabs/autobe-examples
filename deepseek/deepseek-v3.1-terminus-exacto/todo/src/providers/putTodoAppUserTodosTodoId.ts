import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Verify todo exists and belongs to the authenticated user
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existingTodo) {
    throw new HttpException("Todo item not found", 404);
  }

  if (existingTodo.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to update this todo",
      403,
    );
  }

  // Build update data using Prisma's type-safe approach
  const updateData: {
    title?: string;
    description?: string | null;
    due_date?: Date | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };

  // Only include fields that are provided in the request body
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }

  if (props.body.description !== undefined) {
    updateData.description = props.body.description || null;
  }

  if (props.body.due_date !== undefined) {
    // Convert the ISO string to Date object for Prisma storage
    updateData.due_date = props.body.due_date
      ? new Date(props.body.due_date)
      : null;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Return the updated todo with proper type conversions
  return {
    id: updated.id,
    title: updated.title,
    description: updated.description ?? undefined,
    due_date: updated.due_date ? toISOStringSafe(updated.due_date) : undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
