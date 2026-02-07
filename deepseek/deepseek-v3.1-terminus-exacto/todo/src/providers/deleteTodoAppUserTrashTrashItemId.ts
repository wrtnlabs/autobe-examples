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

export async function deleteTodoAppUserTrashTrashItemId(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the trash item and verify ownership
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findUnique({
    where: { id: props.trashItemId },
  });
  if (!trashItem) {
    throw new HttpException("Trash item not found", 404);
  }
  // Verify ownership
  if (trashItem.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if already restored or permanently deleted
  if (trashItem.restored_at !== null) {
    throw new HttpException(
      "Cannot permanently delete a restored trash item",
      400,
    );
  }
  if (trashItem.permanently_deleted_at !== null) {
    throw new HttpException(
      "Trash item has already been permanently deleted",
      400,
    );
  }
  // Verify the referenced todo still exists
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: trashItem.todo_app_todo_id },
  });
  if (!todo) {
    throw new HttpException("Referenced todo not found", 404);
  }
  const currentTime = toISOStringSafe(new Date());
  // Use transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create audit record
    await tx.todo_app_permanent_deletions.create({
      data: {
        id: v4(),
        todo_app_user_id: props.user.id,
        todo_app_todo_id: trashItem.todo_app_todo_id,
        deleted_at: currentTime,
        created_at: currentTime,
        updated_at: currentTime,
      },
    });
    // Update trash item
    await tx.todo_app_trash_items.update({
      where: { id: props.trashItemId },
      data: {
        permanently_deleted_at: currentTime,
        updated_at: currentTime,
      },
    });
  });
}
