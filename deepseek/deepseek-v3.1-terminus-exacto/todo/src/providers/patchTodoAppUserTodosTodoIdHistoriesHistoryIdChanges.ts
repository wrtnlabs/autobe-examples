import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryChange";
import { ITodoAppTodoHistoryChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoHistoryChangeAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodosTodoIdHistoriesHistoryIdChanges(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
  body: ITodoAppTodoHistoryChange.IRequest;
}): Promise<IPageITodoAppTodoHistoryChange.ISummary> {
  // First verify that the history entry belongs to the user's todo
  const history = await MyGlobal.prisma.todo_app_todo_histories.findFirst({
    where: {
      id: props.historyId,
      todo: {
        id: props.todoId,
        todo_app_user_id: props.user.id,
        deleted_at: null,
      },
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!history) {
    throw new HttpException("History entry not found", 404);
  }
  // Validate field_name if provided
  if (
    props.body.field_name &&
    !["title", "description", "start_date", "due_date"].includes(
      props.body.field_name,
    )
  ) {
    throw new HttpException("Invalid field name", 400);
  }
  // Build WHERE clause based on request filters
  const whereInput: Prisma.todo_app_todo_history_changesWhereInput = {
    todo_app_todo_history_id: props.historyId,
  };
  // Apply field name filter if provided
  if (props.body.field_name) {
    whereInput.field_name = props.body.field_name;
  }
  // Apply search filter if provided
  if (props.body.search) {
    const searchCondition = {
      OR: [
        {
          previous_value: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          new_value: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    };
    // If we already have field_name filter, combine with AND
    if (props.body.field_name) {
      whereInput.AND = [{ field_name: props.body.field_name }, searchCondition];
      // Remove the individual field_name filter
      delete whereInput.field_name;
    } else {
      whereInput.OR = searchCondition.OR;
    }
  }
  // Set pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Set sorting
  const orderBy: Prisma.todo_app_todo_history_changesOrderByWithRelationInput =
    props.body.sort === "created_at:asc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  // Get paginated data
  const data = await MyGlobal.prisma.todo_app_todo_history_changes.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...TodoAppTodoHistoryChangeAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.todo_app_todo_history_changes.count({
    where: whereInput,
  });
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistoryChangeAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
