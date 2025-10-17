import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";

export async function putMinimalTodoTodosTodoId(props: {
  todoId: string & tags.Format<"uuid">;
  body: IMinimalTodoTodo.IUpdate;
}): Promise<IMinimalTodoTodo> {
  const { todoId, body } = props;

  // Verify the todo exists
  const existingTodo = await MyGlobal.prisma.minimal_todo_todos.findUnique({
    where: { id: todoId },
  });

  if (!existingTodo) {
    throw new HttpException("Todo with ID " + todoId + " not found", 404);
  }

  // Prepare update data with proper null handling for required fields
  // For required fields (content, completed), convert null to undefined to skip update
  const updateData = {
    ...(body.content !== undefined && body.content !== null
      ? { content: body.content }
      : {}),
    ...(body.completed !== undefined && body.completed !== null
      ? { completed: body.completed }
      : {}),
    updated_at: toISOStringSafe(new Date()),
  };

  // If no fields to update (only updated_at), return existing todo
  if (Object.keys(updateData).length === 1) {
    return {
      id: existingTodo.id,
      content: existingTodo.content,
      completed: existingTodo.completed,
      created_at: toISOStringSafe(existingTodo.created_at),
      updated_at: toISOStringSafe(existingTodo.updated_at),
      deleted_at: existingTodo.deleted_at
        ? toISOStringSafe(existingTodo.deleted_at)
        : null,
    };
  }

  // Update the todo
  const updated = await MyGlobal.prisma.minimal_todo_todos.update({
    where: { id: todoId },
    data: updateData,
  });

  // Convert and return with proper API types
  return {
    id: updated.id,
    content: updated.content,
    completed: updated.completed,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
