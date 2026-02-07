import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashCleanupResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashCleanupResponse";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppTrashCleanup(): Promise<ITodoAppTrashCleanupResponse> {
  // Calculate the cutoff timestamp (30 days ago)
  const retentionPeriodDays = 30;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionPeriodDays);
  // Find all trash records older than retention period
  const oldTrashRecords = await MyGlobal.prisma.todo_app_todo_trashes.findMany({
    where: {
      deleted_at: {
        lte: toISOStringSafe(cutoffDate),
      },
    },
  });
  // Extract the todo IDs to delete
  const todoIds = oldTrashRecords.map((record) => record.todo_id);
  // Delete the todo items first (cascading to trash records would be handled by DB constraints)
  if (todoIds.length > 0) {
    await MyGlobal.prisma.todo_app_todos.deleteMany({
      where: {
        id: {
          in: todoIds,
        },
      },
    });
    // Delete the trash records themselves
    await MyGlobal.prisma.todo_app_todo_trashes.deleteMany({
      where: {
        todo_id: {
          in: todoIds,
        },
      },
    });
  }
  return {
    // Response should contain count of deleted items
  };
}
