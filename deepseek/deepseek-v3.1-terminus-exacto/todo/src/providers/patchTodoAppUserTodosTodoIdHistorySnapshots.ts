import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistorySnapshotItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistorySnapshotItem";
import { ITodoAppTodoHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistorySnapshot";
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

export async function patchTodoAppUserTodosTodoIdHistorySnapshots(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistorySnapshotItem.IRequest;
}): Promise<IPageITodoAppTodoHistorySnapshotItem.ISummary> {
  // Verify todo ownership - user can only access their own todos
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Build pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper ISO string date handling
  const whereInput = {
    todo_app_todo_id: props.todoId,
    ...(props.body.search && {
      OR: [
        {
          title: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          description: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
    ...(props.body.from_date && {
      snapshot: {
        snapshot_created_at: {
          gte:
            props.body.from_date === null
              ? undefined
              : new Date(props.body.from_date),
        },
      },
    }),
    ...(props.body.to_date && {
      snapshot: {
        snapshot_created_at: {
          lte:
            props.body.to_date === null
              ? undefined
              : new Date(props.body.to_date),
        },
      },
    }),
  } satisfies Prisma.todo_app_todo_history_snapshot_itemsWhereInput;
  // Execute queries sequentially for reliable pagination
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo_history_snapshot_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { snapshot: { snapshot_created_at: "desc" as const } },
      ...TodoAppTodoHistorySnapshotItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.todo_app_todo_history_snapshot_items.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoHistorySnapshotItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
