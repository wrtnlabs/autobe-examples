import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchTodoAppAdminAdministratorsAdministratorIdTodos(props: {
  admin: AdminPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const { admin, body } = props;

  // Verify admin has permission to access todos (security validation)
  if (admin.type !== "admin") {
    throw new HttpException(
      "Unauthorized access to admin todo operations",
      403,
    );
  }

  // Build dynamic where conditions based on request filters
  const whereConditions: Record<string, unknown> = {
    // Ensure todos belong to the specified administrator
    todo_app_administrator_id: admin.id,
  };

  // Add text search across title and description
  if (body.search) {
    whereConditions.OR = [
      { title: { contains: body.search, mode: "insensitive" } },
      { description: { contains: body.search, mode: "insensitive" } },
    ];
  }

  // Filter by status values
  if (body.status && body.status.length > 0) {
    whereConditions.status = { in: body.status };
  }

  // Filter by priority levels
  if (body.priority && body.priority.length > 0) {
    whereConditions.priority = { in: body.priority };
  }

  // Filter by category
  if (body.category) {
    whereConditions.category = { equals: body.category };
  }

  // Filter by business workflow status
  if (body.business_status && body.business_status.length > 0) {
    whereConditions.business_status = { in: body.business_status };
  }

  // Handle completed todo inclusion
  if (body.include_completed === false) {
    whereConditions.status = { not: "completed" };
  }

  // Filter by creation date range
  if (body.date_from || body.date_to) {
    (whereConditions as any).created_at = {} as Prisma.DateTimeFilter;
    if (body.date_from)
      (whereConditions as any).created_at.gte = new Date(body.date_from);
    if (body.date_to)
      (whereConditions as any).created_at.lte = new Date(body.date_to);
  }

  // Filter by due date range
  if (body.due_date_from || body.due_date_to) {
    (whereConditions as any).due_date = {} as Prisma.DateTimeFilter;
    if (body.due_date_from)
      (whereConditions as any).due_date.gte = new Date(body.due_date_from);
    if (body.due_date_to)
      (whereConditions as any).due_date.lte = new Date(body.due_date_to);
  }

  // Setup pagination parameters with validation
  const page = Math.max(1, body.page ?? 1);
  const limit = Math.min(Math.max(1, body.limit ?? 20), 100); // Cap at 100 per page
  const skip = (page - 1) * limit;

  // Build sort order configuration
  let orderBy: Record<string, unknown> = {};
  switch (body.sort_by) {
    case "updated_at":
      orderBy = { updated_at: body.sort_order ?? "desc" };
      break;
    case "due_date":
      orderBy = { due_date: body.sort_order ?? "asc" };
      break;
    case "priority":
      // Standard priority ordering: urgent > high > medium > low
      orderBy = { priority: body.sort_order === "asc" ? "asc" : "desc" };
      break;
    case "title":
      orderBy = { title: body.sort_order ?? "asc" };
      break;
    case "status":
      orderBy = { status: body.sort_order ?? "asc" };
      break;
    default: // created_at
      orderBy = { created_at: body.sort_order ?? "desc" };
      break;
  }

  try {
    // Execute database operations with proper error handling
    const [todos, totalCount] = await Promise.all([
      MyGlobal.prisma.todo_app_todos.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
      }),
      MyGlobal.prisma.todo_app_todos.count({ where: whereConditions }),
    ]);

    // Transform database results to API format with proper datetime conversion
    const todoSummaries = todos.map((todo) => ({
      id: todo.id as string & tags.Format<"uuid">,
      title: todo.title,
      description: todo.description ?? undefined,
      status: todo.status as
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled",
      business_status: todo.business_status as
        | "active"
        | "on_hold"
        | "archived",
      priority: todo.priority as "low" | "medium" | "high" | "urgent",
      category: todo.category ?? undefined,
      due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      completed_at: todo.completed_at
        ? toISOStringSafe(todo.completed_at)
        : undefined,
    }));

    // Return paginated results with complete metadata
    return {
      data: todoSummaries,
      pagination: {
        current: page,
        limit,
        records: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    };
  } catch (error) {
    // Handle database operation errors gracefully
    throw new HttpException(
      "Failed to retrieve todos: " +
        (error instanceof Error ? error.message : "Unknown error"),
      500,
    );
  }
}
