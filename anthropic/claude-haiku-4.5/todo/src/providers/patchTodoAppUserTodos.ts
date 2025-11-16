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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Cap at 100
  const skip = (page - 1) * limit;

  // Build WHERE condition for filtering
  const whereCondition: Record<string, unknown> = {
    // Data isolation: only user's own todos
    todo_app_user_id: props.user.id,
  };

  // Title filter - case-insensitive partial match
  if (props.body.title) {
    whereCondition.title = {
      contains: props.body.title,
      mode: "insensitive",
    };
  }

  // Full-text search across title and description
  if (props.body.search) {
    whereCondition.OR = [
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
    ];
  }

  // Completion status filter
  if (
    props.body.is_completed !== undefined &&
    props.body.is_completed !== null
  ) {
    whereCondition.is_completed = props.body.is_completed;
  }

  // Date range filtering
  if (props.body.created_after || props.body.created_before) {
    const dateFilter: Record<string, unknown> = {};

    if (props.body.created_after) {
      dateFilter.gte = new Date(props.body.created_after);
    }

    if (props.body.created_before) {
      dateFilter.lte = new Date(props.body.created_before);
    }

    whereCondition.created_at = dateFilter;
  }

  // Validate and set sort field
  const validSortFields = ["created_at", "updated_at", "completed_at", "title"];
  const sortBy = props.body.sort_by ?? "created_at";

  if (!validSortFields.includes(sortBy)) {
    throw new HttpException(
      `Invalid sort_by value. Allowed values: ${validSortFields.join(", ")}`,
      400,
    );
  }

  const order = props.body.order ?? "desc";

  // Execute paginated query with total count
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todo.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: order,
      },
    }),
    MyGlobal.prisma.todo_app_todo.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to API response format
  const data: IPageITodoAppTodo.ISummary["data"] = todos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    is_completed: todo.is_completed,
    completed_at:
      todo.completed_at === null
        ? undefined
        : toISOStringSafe(todo.completed_at),
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  // Calculate pagination info
  const pages = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
  };
}
