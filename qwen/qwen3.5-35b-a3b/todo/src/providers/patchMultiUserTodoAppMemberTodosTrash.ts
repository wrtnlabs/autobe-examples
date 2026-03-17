import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppTodoAtSummaryTransformer } from "../transformers/MultiUserTodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAppMemberTodosTrash(props: {
  member: MemberPayload;
  body: IMultiUserTodoAppTodo.IRequest;
}): Promise<IPageIMultiUserTodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const statusFilter = props.body.status ?? "all";
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  // Build WHERE clause for trash items belonging to this member
  const whereInput: Prisma.multi_user_todo_app_todosWhereInput = {
    deleted_at: {
      not: null,
    },
    user_id: props.member.id,
  };
  // Apply status filter if not "all"
  if (statusFilter === "completed") {
    whereInput.is_completed = true;
  } else if (statusFilter === "incomplete") {
    whereInput.is_completed = false;
  }
  // Calculate pagination
  const skip = (page - 1) * limit;
  // Build ORDER BY array
  const orderByInput: Prisma.multi_user_todo_app_todosOrderByWithRelationInput[] =
    sortBy === "createdAt"
      ? [{ created_at: sortOrder }]
      : sortBy === "startDate"
        ? [{ start_date: sortOrder }]
        : sortBy === "dueDate"
          ? [{ due_date: sortOrder }]
          : [{ created_at: sortOrder }];
  // Query todos with transformer select
  const data = await MyGlobal.prisma.multi_user_todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...MultiUserTodoAppTodoAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.multi_user_todo_app_todos.count({
    where: whereInput,
  });
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoAppTodoAtSummaryTransformer.transform,
  );
  // Calculate total pages
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIMultiUserTodoAppTodo.ISummary;
}
