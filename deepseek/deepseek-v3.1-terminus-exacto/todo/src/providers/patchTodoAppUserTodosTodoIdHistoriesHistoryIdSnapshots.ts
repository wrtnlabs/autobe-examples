import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshot";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistorySnapshotAtSummaryTransformer } from "../transformers/TodoAppTodoHistorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistoriesHistoryIdSnapshots(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistorySnapshot.IRequest;
}): Promise<IPageITodoAppTodoHistorySnapshot.ISummary> {
  // Validate hierarchical ownership: user -> todo -> history
  const todo = await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findFirstOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: todo.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Parse pagination parameters with validation
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  if (limit <= 0 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  if (page <= 0) {
    throw new HttpException("Page must be greater than 0", 400);
  }
  // Build date filters with proper validation
  const whereInput: Prisma.todo_app_todo_history_snapshotsWhereInput = {
    todo_app_todo_history_id: history.id,
  };
  // Add date range filters only if provided dates are valid
  if (props.body.search_start) {
    try {
      const startDate = new Date(props.body.search_start);
      if (isNaN(startDate.getTime())) {
        throw new HttpException("Invalid search_start date format", 400);
      }
      // Build date filter object explicitly without spreading
      const existingFilter = whereInput.snapshot_created_at;
      whereInput.snapshot_created_at = existingFilter
        ? { ...(existingFilter as Record<string, unknown>), gte: startDate }
        : { gte: startDate };
    } catch {
      throw new HttpException("Invalid search_start date format", 400);
    }
  }
  if (props.body.search_end) {
    try {
      const endDate = new Date(props.body.search_end);
      if (isNaN(endDate.getTime())) {
        throw new HttpException("Invalid search_end date format", 400);
      }
      // Build date filter object explicitly without spreading
      const existingFilter = whereInput.snapshot_created_at;
      whereInput.snapshot_created_at = existingFilter
        ? { ...(existingFilter as Record<string, unknown>), lte: endDate }
        : { lte: endDate };
    } catch {
      throw new HttpException("Invalid search_end date format", 400);
    }
  }
  // Execute parallel queries for performance
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_history_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { snapshot_created_at: "desc" },
      ...TodoAppTodoHistorySnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_todo_history_snapshots.count({
      where: whereInput,
    }),
  ]);
  // Transform data using available transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistorySnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
