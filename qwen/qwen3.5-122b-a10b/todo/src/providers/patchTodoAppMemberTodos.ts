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
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput: Prisma.todo_app_todosWhereInput = {
    todo_app_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.completed !== undefined &&
      props.body.completed !== "all" && {
        completed: props.body.completed === "complete",
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== "" && {
        OR: [
          {
            title: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: props.body.search,
              mode: "insensitive",
            },
          },
        ],
      }),
  } satisfies Prisma.todo_app_todosWhereInput;
  // Build order by with null handling for date fields
  const sortBy = props.body.sortBy ?? "createdAt";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderByInput: Prisma.todo_app_todosOrderByWithRelationInput =
    sortBy === "startDate" || sortBy === "dueDate" || sortBy === "deletedAt"
      ? {
          [sortBy === "startDate"
            ? "start_date"
            : sortBy === "dueDate"
              ? "due_date"
              : "deleted_at"]: sortOrder,
        }
      : { created_at: sortOrder };
  // Query for data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  // Query for total count
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereInput,
  });
  // Transform results
  return {
    data: await ArrayUtil.asyncMap(
      data,
      TodoAppTodoAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppTodo.ISummary;
}
