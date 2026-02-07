import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistory";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistory.IRequest;
}): Promise<IPageITodoAppTodoHistory.ISummary> {
  // Validate todo ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException(
      "Todo not found or you don't have permission to access it",
      404,
    );
  }
  // Validate and set pagination values
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  // Build date range filter using string comparison
  let dateRangeFilter = {};
  if (props.body.date_range) {
    const dateFilter: any = {};
    if (props.body.date_range.start_date) {
      dateFilter.gte = props.body.date_range.start_date;
    }
    if (props.body.date_range.end_date) {
      dateFilter.lte = props.body.date_range.end_date;
    }
    if (Object.keys(dateFilter).length > 0) {
      dateRangeFilter = { created_at: dateFilter };
    }
  }
  // Query history entries sequentially for clarity
  const data = await MyGlobal.prisma.todo_app_todo_histories.findMany({
    where: {
      todo_app_todo_id: props.todoId,
      deleted_at: null,
      ...dateRangeFilter,
    },
    ...TodoAppTodoHistoryAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.todo_app_todo_histories.count({
    where: {
      todo_app_todo_id: props.todoId,
      deleted_at: null,
      ...dateRangeFilter,
    },
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistoryAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
