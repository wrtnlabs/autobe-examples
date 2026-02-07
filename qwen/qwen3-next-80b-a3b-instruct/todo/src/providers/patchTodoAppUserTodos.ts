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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISum> {
  // Default pagination values
  const page = 1;
  const limit = 100;
  // Validate pagination values
  if (page < 1) throw new HttpException("Page must be at least 1", 400);
  if (limit < 1 || limit > 1000)
    throw new HttpException("Limit must be between 1 and 1000", 400);
  const skip = (page - 1) * limit;
  // Define allowed sort fields and directions
  const allowedSortBy = ["created_at", "start_date", "due_date"] as const;
  const allowedSortDir = ["asc", "desc"] as const;
  const sortBy = allowedSortBy[0]; // Use default sort field since IRequest has no sortBy
  const sortDir = allowedSortDir[1]; // Use default sort direction since IRequest has no sortDir
  // Apply filter conditions - completed not available on IRequest
  const completedFilter = undefined;
  // Base where clause
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };
  // Apply completion filter - no completed field on IRequest, so skip
  // if (completedFilter !== undefined) {
  //   where.completed = completedFilter;
  // }
  // Build ORDER BY clause - use direct Prisma.SortOrder values, not object wrappers
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {};
  if (sortBy === "created_at") {
    orderBy.created_at = sortDir;
  } else if (sortBy === "start_date") {
    // Use standard Prisma.SortOrder values, no _nulls_last/_nulls_first suffixes
    orderBy.start_date = sortDir;
  } else if (sortBy === "due_date") {
    // Use standard Prisma.SortOrder values, no _nulls_last/_nulls_first suffixes
    orderBy.due_date = sortDir;
  }
  // Fetch data
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      title: true,
      completed: true,
      start_date: true,
      due_date: true,
      created_at: true,
    },
  });
  // Transform dates to correct string type for ITodoAppTodo.ISum
  const transformedData = data.map(
    (todo) =>
      ({
        title: todo.title,
        completed: todo.completed,
        start_date: todo.start_date ? toISOStringSafe(todo.start_date) : null,
        due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
        created_at: toISOStringSafe(todo.created_at),
      }) as ITodoAppTodo.ISum,
  );
  // Count total records
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where,
  });
  return {
    data: transformedData,
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  };
}
