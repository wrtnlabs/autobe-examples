import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putTodoAppUserTrashTrashItemIdRestore(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  // Step 1: Find and validate trash item
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findUnique({
    where: { id: props.trashItemId },
    include: { todo: true },
  });
  if (!trashItem) {
    throw new HttpException("Trash item not found", 404);
  }
  if (trashItem.todo_app_user_id !== props.user.id) {
    throw new HttpException("Trash item does not belong to user", 403);
  }
  if (trashItem.restored_at !== null) {
    throw new HttpException("Trash item already restored", 400);
  }
  if (trashItem.permanently_deleted_at !== null) {
    throw new HttpException("Trash item permanently deleted", 400);
  }
  if (!trashItem.todo) {
    throw new HttpException("Associated todo not found", 404);
  }
  const now = toISOStringSafe(new Date());
  // Use transaction for atomic operations
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update trash item with restoration timestamp
    await tx.todo_app_trash_items.update({
      where: { id: props.trashItemId },
      data: {
        restored_at: now,
        updated_at: now,
      },
    });
    // Remove soft-delete flag from todo
    await tx.todo_app_todos.update({
      where: { id: trashItem.todo_app_todo_id },
      data: {
        deleted_at: null,
        updated_at: now,
      },
    });
    // Create restoration record
    await tx.todo_app_trash_restorations.create({
      data: {
        id: v4(),
        todo_app_trash_item_id: props.trashItemId,
        todo_app_user_id: props.user.id,
        created_at: now,
        updated_at: now,
      },
    });
    // Fetch and return restored todo
    const restoredTodo = await tx.todo_app_todos.findUnique({
      where: { id: trashItem.todo_app_todo_id },
      ...TodoAppTodoTransformer.select(),
    });
    if (!restoredTodo) {
      throw new HttpException("Failed to fetch restored todo", 500);
    }
    return restoredTodo;
  });
  return await TodoAppTodoTransformer.transform(result);
}
