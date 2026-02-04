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
}): Promise<IPageITodoAppTodo.ISummary> {
  const { user, body } = props;
  const status = body.status || "all";
  const sort = body.sort || "creation_date";
  const order = body.order || "desc";
  const page = body.page || 1;
  const limit = body.limit || 20;
  const skip = (page - 1) * limit;
  // Explicitly define type for whereConditions to include completion_status
  type WhereConditions = {
    user_id: string & tags.Format<"uuid">;
    deleted_at: null;
    completion_status?: boolean;
  };
  const whereConditions: WhereConditions = {
    user_id: user.id,
    deleted_at: null,
  };
  // Filter by status - only possible through completion_status which is in schema
  if (status !== "all") {
    whereConditions.completion_status = status === "complete";
  }
  // Build order by conditions
  let orderByCondition: Record<string, unknown>;
  // For date fields, use case statement to handle nulls properly
  if (sort === "creation_date") {
    orderByCondition = { created_at: order === "desc" ? "desc" : "asc" };
  } else if (sort === "start_date") {
    orderByCondition = { start_date: order === "desc" ? "desc" : "asc" };
  } else if (sort === "due_date") {
    orderByCondition = { due_date: order === "desc" ? "desc" : "asc" };
  } else {
    orderByCondition = { created_at: order === "desc" ? "desc" : "asc" }; // default
  }
  // Query todos - this MUST match what's in database schema
  const data = await MyGlobal.prisma.todo_app_todos.findMany({
    where: whereConditions,
    orderBy: orderByCondition,
    skip,
    take: limit,
  });
  // Count total records
  const total = await MyGlobal.prisma.todo_app_todos.count({
    where: whereConditions,
  });
  // Transform to ISummary
  const transformedData: ITodoAppTodo.ISummary[] = data.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: undefined,
    completion_status: todo.completion_status,
    created_at: todo.created_at ? toISOStringSafe(todo.created_at) : undefined,
    start_date: todo.start_date ? toISOStringSafe(todo.start_date) : undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
  }));
  // Return paginated result
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
