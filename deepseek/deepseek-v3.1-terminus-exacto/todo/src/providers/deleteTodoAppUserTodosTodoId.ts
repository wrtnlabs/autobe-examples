import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists and belongs to user
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!existingTodo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  const now = toISOStringSafe(new Date());
  // Check if trash item already exists to avoid duplicates
  const existingTrashItem =
    await MyGlobal.prisma.todo_app_trash_items.findFirst({
      where: {
        todo_app_todo_id: props.todoId,
        restored_at: null,
        permanently_deleted_at: null,
      },
    });
  if (existingTrashItem) {
    throw new HttpException("Todo is already in trash", 400);
  }
  try {
    // Transaction for atomic soft deletion and trash item creation
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Soft delete the todo
      await tx.todo_app_todos.update({
        where: { id: props.todoId },
        data: {
          deleted_at: now,
          updated_at: now,
        },
      });
      // Create trash item record
      await tx.todo_app_trash_items.create({
        data: {
          id: v4(),
          todo_app_user_id: props.user.id,
          todo_app_todo_id: props.todoId,
          deleted_at: now,
          created_at: now,
          updated_at: now,
          restored_at: null,
          permanently_deleted_at: null,
        },
      });
    });
  } catch (error) {
    throw new HttpException("Failed to delete todo", 500);
  }
}
