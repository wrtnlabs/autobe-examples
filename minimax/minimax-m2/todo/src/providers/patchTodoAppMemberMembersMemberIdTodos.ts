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
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchTodoAppMemberMembersMemberIdTodos(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Verify member authorization
  if (props.member.id !== props.memberId) {
    throw new HttpException("Forbidden - can only access your own todos", 403);
  }

  // Extract pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build comprehensive where conditions
  const whereCondition = {
    // Only active todos (not soft-deleted)
    deleted_at: null,
    // Member ownership verification
    todo_app_member_id: props.memberId,

    // Status filtering
    ...(props.body.status &&
      props.body.status.length > 0 && {
        status: { in: props.body.status },
      }),

    // Priority filtering
    ...(props.body.priority &&
      props.body.priority.length > 0 && {
        priority: { in: props.body.priority },
      }),

    // Category filtering
    ...(props.body.category && {
      category: props.body.category,
    }),

    // Business status filtering
    ...(props.body.business_status &&
      props.body.business_status.length > 0 && {
        business_status: { in: props.body.business_status },
      }),

    // Text search across title and description
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),

    // Date range filtering
    ...(() => {
      const conditions: Record<string, unknown> = {};

      if (props.body.date_from) {
        conditions.created_at = {
          ...(conditions.created_at || {}),
          gte: props.body.date_from,
        };
      }
      if (props.body.date_to) {
        conditions.created_at = {
          ...(conditions.created_at || {}),
          lte: props.body.date_to,
        };
      }

      if (props.body.due_date_from) {
        conditions.due_date = {
          ...(conditions.due_date || {}),
          gte: props.body.due_date_from,
        };
      }
      if (props.body.due_date_to) {
        conditions.due_date = {
          ...(conditions.due_date || {}),
          lte: props.body.due_date_to,
        };
      }

      return conditions;
    })(),

    // Include/exclude completed todos
    ...(props.body.include_completed === false && {
      status: { not: "completed" },
    }),
  };

  // Determine sort configuration
  const sortField = props.body.sort_by || "created_at";
  const sortOrder = props.body.sort_order || "desc";

  const orderBy: Record<string, "asc" | "desc"> = {};
  orderBy[sortField] = sortOrder;

  // Execute paginated query and count
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_todos.count({ where: whereCondition }),
  ]);

  // Convert to API response format
  const data = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    status: todo.status as
      | "pending"
      | "in_progress"
      | "completed"
      | "cancelled",
    business_status: todo.business_status as "active" | "on_hold" | "archived",
    priority: todo.priority as "low" | "medium" | "high" | "urgent",
    category: todo.category ?? undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
  }));

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
