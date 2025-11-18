import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { IPageITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoUserSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only view your own sessions.",
      403,
    );
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Construct Prisma where clause for filtering
  const where: Record<string, any> = {
    todo_user_id: props.userId,
  };

  // Date range filters
  if (props.body.created_from) {
    where.created_at = where.created_at || {};
    where.created_at.gte = props.body.created_from;
  }
  if (props.body.created_to) {
    where.created_at = where.created_at || {};
    where.created_at.lte = props.body.created_to;
  }

  // Filter by IP (exact match if specified)
  if (props.body.ip) {
    where.ip = props.body.ip;
  }
  // Search across ip, href, referrer (contains, case-insensitive) if search present
  if (props.body.search) {
    const search = props.body.search;
    where.OR = [
      { ip: { contains: search, mode: "insensitive" } },
      { href: { contains: search, mode: "insensitive" } },
      { referrer: { contains: search, mode: "insensitive" } },
    ];
  }
  // Status filter: active = expired_at IS NULL, expired = expired_at IS NOT NULL
  if (props.body.status === "active") {
    where.expired_at = null;
  } else if (props.body.status === "expired") {
    where.expired_at = { not: null };
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_user_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      include: {
        todoUser: true,
      },
    }),
    MyGlobal.prisma.todo_user_sessions.count({ where }),
  ]);

  const data = sessions.map((session) => {
    return {
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : null,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      user: {
        id: session.todoUser.id,
        email: session.todoUser.email,
        created_at: toISOStringSafe(session.todoUser.created_at),
        deleted_at: session.todoUser.deleted_at
          ? toISOStringSafe(session.todoUser.deleted_at)
          : null,
      },
    };
  });

  return {
    pagination: {
      current: page,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
