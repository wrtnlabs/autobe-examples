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

export async function patchTodoAppMemberTodosTrashed(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortDirection =
    props.body.sortDirection === "desc" ? ("desc" as const) : ("asc" as const);
  const whereInput = {
    todo_app_member_id: props.member.id,
    trashed_at: { not: null },
    ...(props.body.search != null && {
      title: { contains: props.body.search, mode: "insensitive" as const },
    }),
    ...(props.body.completionStatus === "completed" && { is_completed: true }),
    ...(props.body.completionStatus === "incomplete" && {
      is_completed: false,
    }),
  } satisfies Prisma.todo_app_todosWhereInput;
  const orderByInput:
    | Prisma.todo_app_todosOrderByWithRelationInput
    | Prisma.todo_app_todosOrderByWithRelationInput[] =
    sortBy === "startedAt"
      ? [{ started_at: { sort: sortDirection, nulls: "last" } }]
      : sortBy === "dueAt"
        ? [{ due_at: { sort: sortDirection, nulls: "last" } }]
        : sortBy === "trashedAt"
          ? [{ trashed_at: { sort: sortDirection, nulls: "last" } }]
          : { created_at: sortDirection };
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
  };
}
