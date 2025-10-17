import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteMinimalTodoTodosTodoId(props: {
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoId } = props;

  // Check if the todo exists and get its current state
  const existingTodo = await MyGlobal.prisma.minimal_todo_todos.findUnique({
    where: { id: todoId },
    select: { id: true, deleted_at: true },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // If already soft deleted, return success (idempotent behavior)
  if (existingTodo.deleted_at !== null) {
    return;
  }

  // Perform soft delete by setting deleted_at and updated_at timestamps
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.minimal_todo_todos.update({
    where: { id: todoId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
