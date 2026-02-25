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
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoAppTodoAtSummaryTransformer } from "../transformers/TodoAppTodoAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTrash(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const {
    status,
    sortBy = "createdAt",
    sortDirection = "desc",
    page = 1,
    perPage = 10,
  } = props.body;
  // Validate perPage range
  const validPerPage = Math.min(Math.max(perPage, 1), 100);
  // Calculate pagination
  const skip = (page - 1) * validPerPage;
  const take = validPerPage;
  // Build where clause
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: { not: null },
  };
  // Add status filter if specified
  if (status && status !== "all") {
    where.is_completed = status === "completed";
  }
  // Build orderBy clause (only createdAt, startDate, and dueDate allowed)
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {};
  if (sortBy === "createdAt") {
    orderBy.created_at = sortDirection === "asc" ? "asc" : "desc";
  } else if (sortBy === "startDate") {
    orderBy.start_date = sortDirection === "asc" ? "asc" : "desc";
  } else if (sortBy === "dueDate") {
    orderBy.due_date = sortDirection === "asc" ? "asc" : "desc";
  } else {
    // Default to createdAt desc
    orderBy.created_at = sortDirection === "asc" ? "asc" : "desc";
  }
  // Query data and count
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    orderBy,
    skip,
    take,
    ...TodoAppTodoAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  // Transform data using loaded transformer
  const transformed = await ArrayUtil.asyncMap(
    data,
    TodoAppTodoAtSummaryTransformer.transform,
  );
  // Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: validPerPage,
      records: total,
      pages: Math.ceil(total / validPerPage),
    } satisfies IPage.IPagination,
  } satisfies IPageITodoAppTodo.ISummary;
}
