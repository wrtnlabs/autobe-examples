import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { IPageITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Authorization check - user can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own sessions",
      403,
    );
  }

  const {
    page = 1,
    limit = 10,
    search,
    status,
    created_at_start,
    created_at_end,
    order_by = "created_at",
    order_direction = "desc",
  } = props.body;

  // Build WHERE clause
  const where = {
    todo_app_user_id: props.userId,
    ...(search && {
      OR: [
        { ip: { contains: search } },
        { referrer: { contains: search } },
        { href: { contains: search } },
      ],
    }),
    ...(status && {
      expired_at: status === "active" ? null : { not: null },
    }),
    ...((created_at_start || created_at_end) && {
      created_at: {
        ...(created_at_start && { gte: created_at_start }),
        ...(created_at_end && { lte: created_at_end }),
      },
    }),
  };

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  // Execute queries
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
      orderBy: { [order_by]: order_direction },
      skip,
      take,
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({ where }),
  ]);

  // Transform results - convert all Date fields to ISO strings
  const data = sessions.map((session) => ({
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      status: session.user.status,
      created_at: toISOStringSafe(session.user.created_at),
      updated_at: toISOStringSafe(session.user.updated_at),
      ...(session.user.deleted_at && {
        deleted_at: toISOStringSafe(session.user.deleted_at),
      }),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : toISOStringSafe(new Date(0)), // Use epoch date instead of null
  }));

  // Build pagination with proper type conversion
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return {
    pagination,
    data,
  };
}
