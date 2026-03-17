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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const dir = props.body.sortDirection === "desc" ? "desc" : "asc";
  // Build WHERE
  const visibility = props.body.visibility ?? "active";
  const completionStatus = props.body.completionStatus ?? "all";
  const whereInput = {
    todo_app_member_id: props.member.id,
    ...(visibility === "trashed"
      ? { trashed_at: { not: null } }
      : { trashed_at: null }),
    ...(completionStatus === "completed"
      ? { is_completed: true }
      : completionStatus === "incomplete"
        ? { is_completed: false }
        : {}),
    ...(props.body.search != null && props.body.search.length > 0
      ? { title: { contains: props.body.search, mode: "insensitive" as const } }
      : {}),
  } satisfies Prisma.todo_app_todosWhereInput;
  // Build ORDER BY
  const sortBy = props.body.sortBy ?? "createdAt";
  const orderByInput: Prisma.todo_app_todosOrderByWithRelationInput[] =
    sortBy === "startedAt"
      ? [{ started_at: { sort: dir, nulls: "last" } }]
      : sortBy === "dueAt"
        ? [{ due_at: { sort: dir, nulls: "last" } }]
        : [{ created_at: dir }];
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
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
