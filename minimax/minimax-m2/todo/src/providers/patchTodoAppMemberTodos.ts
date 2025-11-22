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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchTodoAppMemberTodos(props: {
  member: MemberPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build the where condition for filtering
  const whereConditions: any = {
    todo_app_member_id: props.member.id,
    deleted_at: null, // Only show non-deleted items
  };

  // Add text search filter
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }

  // Add status filtering
  if (props.body.status && props.body.status.length > 0) {
    whereConditions.status = { in: props.body.status };
  }

  // Add priority filtering
  if (props.body.priority && props.body.priority.length > 0) {
    whereConditions.priority = { in: props.body.priority };
  }

  // Add category filtering
  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  // Add business status filtering
  if (props.body.business_status && props.body.business_status.length > 0) {
    whereConditions.business_status = { in: props.body.business_status };
  }

  // Add date range filtering for creation dates
  if (props.body.date_from || props.body.date_to) {
    whereConditions.created_at = {};
    if (props.body.date_from)
      whereConditions.created_at.gte = props.body.date_from;
    if (props.body.date_to) whereConditions.created_at.lte = props.body.date_to;
  }

  // Add due date range filtering
  if (props.body.due_date_from || props.body.due_date_to) {
    whereConditions.due_date = {};
    if (props.body.due_date_from)
      whereConditions.due_date.gte = props.body.due_date_from;
    if (props.body.due_date_to)
      whereConditions.due_date.lte = props.body.due_date_to;
  }

  // Handle completed todo filtering
  if (props.body.include_completed === false) {
    whereConditions.status = { not: "completed" };
  }

  // Build sorting configuration
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  let orderBy: any;
  if (sortBy === "priority") {
    // Priority sorting with custom order mapping
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    orderBy = { priority: { sort: sortOrder, nulls: "last" } };
  } else if (sortBy === "title" || sortBy === "status") {
    orderBy = { [sortBy]: sortOrder };
  } else {
    // For date fields, handle potential null values
    orderBy = { [sortBy]: { sort: sortOrder, nulls: "last" } };
  }

  // Execute database queries in parallel for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        business_status: true,
        priority: true,
        category: true,
        due_date: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereConditions,
    }),
  ]);

  // Transform database results to API format
  const transformedData = data.map((todo) => ({
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
  const pages = Math.ceil(total / limit);
  const pagination = {
    current: page,
    limit,
    records: total,
    pages,
  };

  return {
    data: transformedData,
    pagination,
  };
}
