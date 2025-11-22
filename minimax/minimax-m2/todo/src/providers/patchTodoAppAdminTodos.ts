import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminTodos(props: {
  admin: AdminPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const { admin, body } = props;

  // Pagination parameters
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic where conditions
  const whereConditions: Record<string, unknown> = {
    // Exclude soft-deleted todos
    deleted_at: null,

    // Status filtering
    ...(body.status &&
      body.status.length > 0 && {
        status: { in: body.status },
      }),

    // Business status filtering
    ...(body.business_status &&
      body.business_status.length > 0 && {
        business_status: { in: body.business_status },
      }),

    // Priority filtering
    ...(body.priority &&
      body.priority.length > 0 && {
        priority: { in: body.priority },
      }),

    // Category filtering
    ...(body.category && {
      category: { equals: body.category },
    }),

    // Text search in title and description
    ...(body.search && {
      OR: [
        { title: { contains: body.search, mode: "insensitive" } },
        { description: { contains: body.search, mode: "insensitive" } },
      ],
    }),

    // Date range filtering for creation
    ...((body.date_from || body.date_to) && {
      created_at: {
        ...(body.date_from && { gte: new Date(body.date_from) }),
        ...(body.date_to && { lte: new Date(body.date_to) }),
      },
    }),

    // Due date range filtering
    ...((body.due_date_from || body.due_date_to) && {
      due_date: {
        ...(body.due_date_from && { gte: new Date(body.due_date_from) }),
        ...(body.due_date_to && { lte: new Date(body.due_date_to) }),
      },
    }),

    // Include/exclude completed todos
    ...(body.include_completed === false && {
      status: { not: "completed" },
    }),
  };

  // Build orderBy conditions
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder = body.sort_order ?? "asc";

  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[sortBy] = sortOrder;

  // Execute query with pagination
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API interface
  const data = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    status: typia.assert<"pending" | "in_progress" | "completed" | "cancelled">(
      todo.status,
    ),
    business_status: typia.assert<"active" | "on_hold" | "archived">(
      todo.business_status,
    ),
    priority: typia.assert<"low" | "medium" | "high" | "urgent">(todo.priority),
    category: todo.category ?? undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: totalPages,
    },
  };
}
