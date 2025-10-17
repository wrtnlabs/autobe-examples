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
  const { user, body } = props;

  if (!user || !user.id) {
    throw new HttpException("Unauthorized", 401);
  }

  // Pagination defaults and coercion
  const rawPage = body.page ?? 1;
  const rawLimit = body.pageSize ?? 20;

  const page = Number(rawPage);
  let limit = Number(rawLimit);

  if (!Number.isFinite(page) || page < 1) {
    throw new HttpException("Bad Request: page must be a positive number", 400);
  }

  if (!Number.isFinite(limit) || limit < 1) {
    limit = 20;
  }

  const MAX_LIMIT = 100;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  // Sorting
  const sortBy = body.sortBy === "position" ? "position" : "created_at";
  const sortOrder = body.sortOrder === "desc" ? "desc" : "asc";

  // Normalize search query: treat empty string as not provided
  const q =
    typeof body.q === "string" && body.q.trim() !== "" ? body.q : undefined;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.todo_app_todos.findMany({
        where: {
          user_id: user.id,
          ...(body.isCompleted !== undefined &&
            body.isCompleted !== null && {
              is_completed: body.isCompleted,
            }),
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(q !== undefined && {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }),
        },
        select: {
          id: true,
          title: true,
          is_completed: true,
          completed_at: true,
          position: true,
          created_at: true,
          updated_at: true,
        },
        orderBy:
          sortBy === "position"
            ? { position: sortOrder }
            : { created_at: sortOrder },
        skip,
        take: limit,
      }),
      MyGlobal.prisma.todo_app_todos.count({
        where: {
          user_id: user.id,
          ...(body.isCompleted !== undefined &&
            body.isCompleted !== null && {
              is_completed: body.isCompleted,
            }),
          ...(body.includeDeleted !== true && { deleted_at: null }),
          ...(q !== undefined && {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }),
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      title: r.title,
      is_completed: r.is_completed,
      completed_at: r.completed_at ? toISOStringSafe(r.completed_at) : null,
      position: r.position ?? null,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
    }));

    const pages = Math.max(1, Math.ceil(total / limit));

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages,
      },
      data,
    };
  } catch (error) {
    // Log error if logging available (avoid leaking error details in response)
    // MyGlobal.logger?.error?.(error);
    throw new HttpException("Internal Server Error", 500);
  }
}
