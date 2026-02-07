import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import { ITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshotItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistorySnapshotItemAtSummaryTransformer } from "../transformers/TodoAppTodoHistorySnapshotItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistoriesHistoryIdSnapshots(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistorySnapshotItem.IRequest;
}): Promise<IPageITodoAppTodoHistorySnapshotItem.ISummary> {
  // Verify todo exists and belongs to user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) throw new HttpException("Todo not found", 404);
  // Verify history exists and belongs to the todo
  const history = await MyGlobal.prisma.todo_app_todo_histories.findFirst({
    where: {
      id: props.historyId,
      todo_app_todo_id: props.todoId,
      deleted_at: null,
    },
  });
  if (!history) throw new HttpException("History entry not found", 404);
  // Build WHERE clause for snapshot items with proper filtering
  const whereInput = {
    todo_app_todo_history_snapshot_id: {
      in: await MyGlobal.prisma.todo_app_todo_history_snapshots
        .findMany({
          where: { todo_app_todo_history_id: props.historyId },
          select: { id: true },
        })
        .then((snapshots) => snapshots.map((s) => s.id)),
    },
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.is_completed !== undefined && {
      is_completed: props.body.is_completed,
    }),
  } satisfies Prisma.todo_app_todo_history_snapshot_itemsWhereInput;
  // Pagination setup with validation
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 20));
  const skip = (page - 1) * limit;
  // Query data with pagination
  const data =
    await MyGlobal.prisma.todo_app_todo_history_snapshot_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [{ snapshot: { snapshot_created_at: "desc" } }, { id: "asc" }],
      ...TodoAppTodoHistorySnapshotItemAtSummaryTransformer.select(),
    });
  // Get total count
  const total =
    await MyGlobal.prisma.todo_app_todo_history_snapshot_items.count({
      where: whereInput,
    });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistorySnapshotItemAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
