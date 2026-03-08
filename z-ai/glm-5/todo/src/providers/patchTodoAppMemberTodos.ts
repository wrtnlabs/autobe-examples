import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Build WHERE clause - always filter by member ownership
  const whereInput = {
    todo_app_member_id: props.member.id,
    deleted_at:
      props.body.deleted === "trashed"
        ? { not: null }
        : props.body.deleted === "all"
          ? undefined
          : null,
    completed:
      props.body.completed === "complete"
        ? true
        : props.body.completed === "incomplete"
          ? false
          : undefined,
  } satisfies Prisma.todo_app_todosWhereInput;
  // Build ORDER BY clause - NULL dates appear at end
  const sortField = props.body.sort_field ?? "created_at";
  const sortDirection = props.body.sort_direction ?? "desc";
  const orderByInput = (
    sortField === "created_at"
      ? { created_at: sortDirection }
      : sortField === "start_date"
        ? { start_date: { sort: sortDirection, nulls: "last" } }
        : { due_date: { sort: sortDirection, nulls: "last" } }
  ) satisfies Prisma.todo_app_todosOrderByWithRelationInput;
  // Query with transformer select
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  // Transform and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
