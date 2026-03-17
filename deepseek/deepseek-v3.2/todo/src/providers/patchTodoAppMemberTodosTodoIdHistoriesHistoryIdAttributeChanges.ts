import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoHistoryAttributeChange";
import { ITodoAppTodoHistoryAttributeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistoryAttributeChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoHistoryAttributeChangeAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAttributeChangeAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodosTodoIdHistoriesHistoryIdAttributeChanges(props: {
  member: MemberPayload;
  todoId: string;
  historyId: string;
  body: ITodoAppTodoHistoryAttributeChange.IRequest;
}): Promise<IPageITodoAppTodoHistoryAttributeChange.ISummary> {
  // Import the transformer
  // import { TodoAppTodoHistoryAttributeChangeAtSummaryTransformer } from "../transformers/TodoAppTodoHistoryAttributeChangeAtSummaryTransformer"; // REMOVED
  // Verify ownership chain: todo must belong to member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: { id: true },
  });
  // Verify history belongs to this todo
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
      where: {
        id: props.historyId,
        todo_app_todo_id: props.todoId,
      },
      select: { id: true },
    });
  // Build search filters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Construct where clause with type safety
  const whereInput: Prisma.todo_app_todo_history_attribute_changesWhereInput = {
    todo_app_todo_history_id: props.historyId,
  };
  // Add attribute_name filter with partial matching
  if (
    props.body.attribute_name &&
    props.body.attribute_name.trim().length > 0
  ) {
    whereInput.attribute_name = {
      contains: props.body.attribute_name,
      mode: "insensitive" as const,
    };
  }
  // Add data_type filter with exact matching
  if (props.body.data_type && props.body.data_type.trim().length > 0) {
    whereInput.data_type = props.body.data_type;
  }
  // Add old_value filter with partial matching
  if (props.body.old_value && props.body.old_value.trim().length > 0) {
    whereInput.old_value = {
      contains: props.body.old_value,
      mode: "insensitive" as const,
    };
  }
  // Add new_value filter with partial matching
  if (props.body.new_value && props.body.new_value.trim().length > 0) {
    whereInput.new_value = {
      contains: props.body.new_value,
      mode: "insensitive" as const,
    };
  }
  // Add created_at date range filter
  if (props.body.created_at) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (props.body.created_at.from) {
      // Convert ISO string to Date for Prisma query
      createdAtFilter.gte = new Date(props.body.created_at.from);
    }
    if (props.body.created_at.to) {
      // Convert ISO string to Date for Prisma query
      createdAtFilter.lte = new Date(props.body.created_at.to);
    }
    if (Object.keys(createdAtFilter).length > 0) {
      whereInput.created_at = createdAtFilter;
    }
  }
  // Get paginated results with transformer select
  const data =
    await MyGlobal.prisma.todo_app_todo_history_attribute_changes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...TodoAppTodoHistoryAttributeChangeAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total =
    await MyGlobal.prisma.todo_app_todo_history_attribute_changes.count({
      where: whereInput,
    });
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoHistoryAttributeChangeAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
