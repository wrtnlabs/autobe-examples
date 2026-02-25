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

export async function deleteTodoAppUserTodosTrashTrashItemIdPermanentDelete(props: {
  user: UserPayload;
  trashItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify ownership and trash item existence
  const trashItem = await MyGlobal.prisma.todo_app_trash_items.findFirstOrThrow(
    {
      where: {
        id: props.trashItemId,
        todo_app_user_id: props.user.id,
        restored_at: null,
        permanently_deleted_at: null,
      },
      select: { todo_app_todo_id: true },
    },
  );
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create audit record before deletion
    await tx.todo_app_permanent_deletions.create({
      data: {
        id: v4(),
        todo_app_user_id: props.user.id,
        todo_app_todo_id: trashItem.todo_app_todo_id,
        deleted_at: now,
        created_at: now,
        updated_at: now,
      },
    });
    // Delete related todo data sequentially
    await tx.todo_app_todo_completions.deleteMany({
      where: { todo_app_todo_id: trashItem.todo_app_todo_id },
    });
    await tx.todo_app_todo_description_fields.deleteMany({
      where: { todo_app_todo_id: trashItem.todo_app_todo_id },
    });
    await tx.todo_app_todo_due_date_fields.deleteMany({
      where: { todo_app_todo_id: trashItem.todo_app_todo_id },
    });
    await tx.todo_app_todo_histories.deleteMany({
      where: { todo_app_todo_id: trashItem.todo_app_todo_id },
    });
    await tx.todo_app_todo_start_date_fields.deleteMany({
      where: { todo_app_todo_id: trashItem.todo_app_todo_id },
    });
    // Delete main todo record
    await tx.todo_app_todos.delete({
      where: { id: trashItem.todo_app_todo_id },
    });
    // Mark trash item as permanently deleted
    await tx.todo_app_trash_items.update({
      where: { id: props.trashItemId },
      data: { permanently_deleted_at: now },
    });
  });
}
