import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoListTodoAtSummaryTransformer } from "../transformers/TodoListTodoAtSummaryTransformer";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const {
    page = 1,
    limit = 20,
    q,
    status,
    createdAtFrom,
    createdAtTo,
    sortBy = "createdAt",
    order = "asc",
  } = props.body;
  // Validate page and limit
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("Limit must be between 1 and 100", 400);
  // Build where clause dynamically
  const whereInput = {
    todo_list_user_id: props.user.id,
    deleted_at: null,
    ...(q && {
      OR: [{ title: { contains: q } }, { description: { contains: q } }],
    }),
    ...(status && { status: status }),
    ...(createdAtFrom && { created_at: { gte: createdAtFrom } }),
    ...(createdAtTo && { created_at: { lte: createdAtTo } }),
  } satisfies Prisma.todo_list_todosWhereInput;
  // Build order by clause
  const orderByInput = (
    sortBy === "title"
      ? { title: order as "asc" | "desc" }
      : { created_at: order as "asc" | "desc" }
  ) satisfies Prisma.todo_list_todosOrderByWithRelationInput;
  // Query data
  const data = await MyGlobal.prisma.todo_list_todos.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip: (page - 1) * limit,
    take: limit,
    ...TodoListTodoAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.todo_list_todos.count({
    where: whereInput,
  });
  // Transform data manually using transformer logic
  const transformedData = data.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? undefined,
    is_completed: item.status === "completed",
  }));
  // Return paginated response
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
