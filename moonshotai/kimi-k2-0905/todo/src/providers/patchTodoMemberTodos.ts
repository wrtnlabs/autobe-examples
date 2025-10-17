import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchTodoMemberTodos(props: {
  member: MemberPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const { member, body } = props;

  // Extract and validate pagination parameters
  const page = body.page ?? (1 satisfies number as number);
  const limit = body.limit ?? (100 satisfies number as number);

  // Calculate skip for Prisma pagination
  const skip = (page - 1) * limit;

  // Build where clause with base filter - proper Prisma typing
  const whereConditions: Prisma.todo_todosWhereInput = {
    member_id: member.id,
  };

  // Apply completion status filter if provided
  if (body.completed !== undefined && body.completed !== null) {
    whereConditions.completed = body.completed;
  }

  // Apply priority filter if provided
  if (body.priority !== undefined && body.priority !== null) {
    whereConditions.priority = body.priority;
  }

  // Apply search filter if provided (text search on title)
  if (body.search !== undefined) {
    whereConditions.title = { contains: body.search };
  }

  // Execute queries with pagination
  const [todos, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_todos.findMany({
      where: whereConditions,
      orderBy: body.sort_by
        ? { [body.sort_by]: "desc" as const }
        : { created_at: "desc" as const },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_todos.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to API structure
  const summaries = todos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    completed: todo.completed,
    priority: todo.priority as IETodoPriority,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  // Return paginated response with Typia tag compatibility
  return {
    pagination: {
      current: (body.page ?? 1) satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: (body.limit ?? 100) satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: totalCount,
      pages: Math.ceil(totalCount / (body.limit ?? 100)),
    },
    data: summaries,
  };
}
