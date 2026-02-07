import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashCleanupLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTrashCleanupLogTransformer } from "../transformers/TodoAppTrashCleanupLogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppUserTrashCleanupNow(props: {
  user: UserPayload;
}): Promise<ITodoAppTrashCleanupLog.IResponse> {
  // Verify user authorization
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: props.user.id,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  const now = toISOStringSafe(new Date());
  let itemsProcessed = 0;
  let itemsDeleted = 0;
  let errorMessage: string | null = null;
  try {
    // Query cleanup-eligible items with proper joins
    const eligibleItems = await MyGlobal.prisma.todo_app_trash_items.findMany({
      where: {
        todo_app_user_id: props.user.id,
        permanently_deleted_at: null,
        restored_at: null,
        metadatum: {
          cleanup_eligible: true,
          retention_expires_at: { lte: new Date() },
        },
      },
      include: {
        metadatum: true,
        todo: true,
      },
    });
    itemsProcessed = eligibleItems.length;
    if (itemsProcessed === 0) {
      // Create cleanup log for empty operation without foreign key dependency
      const cleanupLog =
        await MyGlobal.prisma.todo_app_trash_cleanup_logs.create({
          data: {
            id: v4(),
            todo_app_trash_item_id: v4(), // Use generated UUID since no items
            operation_type: "immediate_cleanup",
            items_processed: 0,
            items_deleted: 0,
            cleanup_criteria: "retention_expired",
            operation_status: "completed",
            error_message: null,
            started_at: new Date(now),
            completed_at: new Date(now),
            created_at: new Date(now),
            updated_at: new Date(now),
          },
          ...TodoAppTrashCleanupLogTransformer.select(),
        });
      return typia.assert<ITodoAppTrashCleanupLog.IResponse>(
        await TodoAppTrashCleanupLogTransformer.transform(cleanupLog),
      );
    }
    const successfulDeletions: string[] = [];
    const failedDeletions: Array<{
      id: string;
      error: string;
    }> = [];
    // Process items in transaction
    await MyGlobal.prisma.$transaction(async (tx) => {
      for (const trashItem of eligibleItems) {
        try {
          // Delete the todo permanently
          await tx.todo_app_todos.delete({
            where: { id: trashItem.todo_app_todo_id },
          });
          // Mark trash item as permanently deleted
          await tx.todo_app_trash_items.update({
            where: { id: trashItem.id },
            data: { permanently_deleted_at: new Date(now) },
          });
          // Update metadata as processed
          if (trashItem.metadatum) {
            await tx.todo_app_trash_item_metadata.update({
              where: { id: trashItem.metadatum.id },
              data: { cleanup_processed_at: new Date(now) },
            });
          }
          successfulDeletions.push(trashItem.id);
        } catch (error) {
          failedDeletions.push({
            id: trashItem.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      itemsDeleted = successfulDeletions.length;
      if (failedDeletions.length > 0) {
        errorMessage = `Failed to delete ${failedDeletions.length} items: ${failedDeletions.map((f) => f.id).join(", ")}`;
      }
    });
    // Create cleanup log using the first successful item or first item if all failed
    const referenceItemId =
      successfulDeletions.length > 0
        ? successfulDeletions[0]
        : eligibleItems[0].id;
    const cleanupLog = await MyGlobal.prisma.todo_app_trash_cleanup_logs.create(
      {
        data: {
          id: v4(),
          todo_app_trash_item_id: referenceItemId,
          operation_type: "immediate_cleanup",
          items_processed: itemsProcessed,
          items_deleted: itemsDeleted,
          cleanup_criteria: "retention_expired",
          operation_status:
            failedDeletions.length === 0
              ? "completed"
              : itemsDeleted > 0
                ? "partial_success"
                : "failed",
          error_message: errorMessage,
          started_at: new Date(now),
          completed_at: new Date(now),
          created_at: new Date(now),
          updated_at: new Date(now),
        },
        ...TodoAppTrashCleanupLogTransformer.select(),
      },
    );
    return typia.assert<ITodoAppTrashCleanupLog.IResponse>(
      await TodoAppTrashCleanupLogTransformer.transform(cleanupLog),
    );
  } catch (error) {
    // Create error log for transaction failure
    const cleanupLog = await MyGlobal.prisma.todo_app_trash_cleanup_logs.create(
      {
        data: {
          id: v4(),
          todo_app_trash_item_id: v4(),
          operation_type: "immediate_cleanup",
          items_processed: itemsProcessed,
          items_deleted: itemsDeleted,
          cleanup_criteria: "retention_expired",
          operation_status: "failed",
          error_message: error instanceof Error ? error.message : String(error),
          started_at: new Date(now),
          completed_at: new Date(now),
          created_at: new Date(now),
          updated_at: new Date(now),
        },
        ...TodoAppTrashCleanupLogTransformer.select(),
      },
    );
    return typia.assert<ITodoAppTrashCleanupLog.IResponse>(
      await TodoAppTrashCleanupLogTransformer.transform(cleanupLog),
    );
  }
}
