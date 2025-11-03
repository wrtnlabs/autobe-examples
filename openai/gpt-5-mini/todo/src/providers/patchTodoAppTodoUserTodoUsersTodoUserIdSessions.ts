import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodouserSession";
import { IPageITodoAppTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodouserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoUser";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function patchTodoAppTodoUserTodoUsersTodoUserIdSessions(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  body: ITodoAppTodouserSession.IRequest;
}): Promise<IPageITodoAppTodouserSession.ISummary> {
  const { todoUser, todoUserId, body } = props;

  // Ownership enforcement
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "Unauthorized: You can only list your own sessions",
      403,
    );
  }

  // Verify that the target todo user exists and is active
  const targetUser = await MyGlobal.prisma.todo_app_todouser.findUnique({
    where: { id: todoUserId },
    select: {
      id: true,
      display_name: true,
      is_verified: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  if (!targetUser || targetUser.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Pagination and sorting defaults
  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const limit = (body.pageSize ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number;
  const skip = (page - 1) * limit;

  const sortField = (
    body.sortBy === "expiredAt" ? "expired_at" : "created_at"
  ) as "created_at" | "expired_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // Prepare 'now' for active/expired filters
  const now = toISOStringSafe(new Date());

  // Build where condition using only DTO fields and schema-verified names
  const buildWhereCondition = () => {
    const where: Record<string, unknown> = {
      todo_app_todouser_id: todoUserId,
    };

    if (body.ip !== undefined && body.ip !== null) {
      where.ip = { contains: body.ip };
    }

    if (body.referrer !== undefined && body.referrer !== null) {
      where.referrer = { contains: body.referrer };
    }

    if (body.href !== undefined && body.href !== null) {
      where.href = { contains: body.href };
    }

    if (body.createdBefore !== undefined && body.createdBefore !== null) {
      where.created_at = {
        ...((where.created_at as Record<string, unknown>) ?? {}),
        lt: body.createdBefore,
      } as Record<string, unknown>;
    }

    if (body.createdAfter !== undefined && body.createdAfter !== null) {
      where.created_at = {
        ...((where.created_at as Record<string, unknown>) ?? {}),
        gt: body.createdAfter,
      } as Record<string, unknown>;
    }

    if (body.status === "active") {
      // active = not expired (expired_at is null OR expired_at > now)
      where.OR = [{ expired_at: null }, { expired_at: { gt: now } }];
    } else if (body.status === "expired") {
      // expired = expired_at is set and < now
      where.expired_at = { lt: now };
    }

    return where;
  };

  const whereCondition = buildWhereCondition();

  // Execute queries in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todouser_sessions.findMany({
      where: whereCondition,
      include: {
        todouser: {
          select: {
            id: true,
            display_name: true,
            is_verified: true,
            status: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
      orderBy: {
        [sortField]: sortOrder,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_app_todouser_sessions.count({ where: whereCondition }),
  ]);

  // Map results to DTO
  const data = rows.map((r) => {
    return {
      id: r.id as string & tags.Format<"uuid">,
      user: {
        id: r.todouser.id as string & tags.Format<"uuid">,
        displayName:
          r.todouser.display_name === null ? null : r.todouser.display_name,
        isVerified: r.todouser.is_verified,
        status: r.todouser.status ?? undefined,
        createdAt: toISOStringSafe(r.todouser.created_at),
        updatedAt: toISOStringSafe(r.todouser.updated_at),
      } satisfies ITodoAppTodoUser.ISummary,
      ip: r.ip,
      href: r.href === null ? undefined : r.href,
      referrer: r.referrer === null ? null : r.referrer,
      createdAt: toISOStringSafe(r.created_at),
      expiredAt: r.expired_at ? toISOStringSafe(r.expired_at) : null,
    } satisfies ITodoAppTodouserSession.ISummary;
  });

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Number(pages),
    },
    data,
  } satisfies IPageITodoAppTodouserSession.ISummary;
}
