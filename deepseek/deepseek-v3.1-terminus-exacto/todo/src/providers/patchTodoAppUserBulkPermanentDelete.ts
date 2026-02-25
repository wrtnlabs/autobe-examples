import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppPermanentDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPermanentDeletion";
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
import { TodoAppPermanentDeletionTransformer } from "../transformers/TodoAppPermanentDeletionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserBulkPermanentDelete(props: {
  user: UserPayload;
  body: ITodoAppPermanentDeletion.IRequest;
}): Promise<ITodoAppPermanentDeletion> {
  const { user, body } = props;
  // Validate input
  if (!body.todo_ids || body.todo_ids.length === 0) {
    throw new HttpException("No todo IDs provided for permanent deletion", 400);
  }
  // Verify all todos belong to user and are in trash status
  const trashItems = await MyGlobal.prisma.todo_app_trash_items.findMany({
    where: {
      todo_app_todo_id: { in: body.todo_ids },
      todo_app_user_id: user.id,
      restored_at: null,
      permanently_deleted_at: null,
    },
    select: {
      todo_app_todo_id: true,
    },
  });
  const validTodoIds = trashItems.map((item) => item.todo_app_todo_id);
  const invalidCount = body.todo_ids.length - validTodoIds.length;
  if (invalidCount > 0) {
    throw new HttpException(
      `Cannot permanently delete ${invalidCount} todos - they may not exist, not belong to you, or not be in trash`,
      400,
    );
  }
  // Perform atomic bulk deletion
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const timestamp = new Date();
    // Create audit records for permanent deletion
    const permanentDeletionRecords = await Promise.all(
      validTodoIds.map(async (todoId) => {
        return await tx.todo_app_permanent_deletions.create({
          data: {
            id: v4(),
            todo_app_user_id: user.id,
            todo_app_todo_id: todoId,
            deleted_at: timestamp,
            reason: null,
            created_at: timestamp,
            updated_at: timestamp,
          },
          ...TodoAppPermanentDeletionTransformer.select(),
        });
      }),
    );
    // Update trash items to mark as permanently deleted
    await tx.todo_app_trash_items.updateMany({
      where: {
        todo_app_todo_id: { in: validTodoIds },
      },
      data: {
        permanently_deleted_at: timestamp,
        updated_at: timestamp,
      },
    });
    // Delete the todos (cascade will handle related records)
    await tx.todo_app_todos.deleteMany({
      where: {
        id: { in: validTodoIds },
      },
    });
    return permanentDeletionRecords[0]; // Return first record for response
  });
  // Transform database result to response DTO
  return await TodoAppPermanentDeletionTransformer.transform(result);
}
