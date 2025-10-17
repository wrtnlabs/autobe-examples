import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import { IPageIMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMinimalTodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchMinimalTodoTodos(props: {
  user: UserPayload;
  body: IMinimalTodoTodo.IRequest;
}): Promise<IPageIMinimalTodoTodo.ISummary> {
  const { body } = props;

  // Parse and validate pagination parameters with proper type handling
  const page = Number(body.page ?? 1) as number;
  const limit = Number(body.limit ?? 10) as number;
  const skip = (page - 1) * limit;

  // Build where conditions with proper null/undefined handling
  const where = {
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.trim().length > 0 && {
        content: { contains: body.search.trim() },
      }),
    ...(body.completed !== undefined &&
      body.completed !== null && {
        completed: body.completed,
      }),
  };

  // Determine sort field and order with validation
  const allowedSortFields = ["created_at", "updated_at", "content"];
  const sortField = allowedSortFields.includes(body.sort_by ?? "created_at")
    ? (body.sort_by ?? "created_at")
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Execute queries concurrently
  const [results, total] = await Promise.all([
    MyGlobal.prisma.minimal_todo_todos.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        content: true,
        completed: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.minimal_todo_todos.count({ where }),
  ]);

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  // Transform results to match ISummary interface with proper type handling
  const data = results.map((todo) => {
    // Ensure content is properly truncated to max 100 characters
    const content =
      todo.content.length > 100 ? todo.content.substring(0, 100) : todo.content;

    return {
      id: todo.id as string & tags.Format<"uuid">,
      content: content as string & tags.MaxLength<100>,
      completed: todo.completed,
      created_at: toISOStringSafe(todo.created_at),
    };
  });

  return {
    pagination: {
      current: Number(page) as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: Number(limit) as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: Number(total) as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Number(pages) as number & tags.Type<"int32"> & tags.Minimum<0>,
    },
    data,
  };
}
