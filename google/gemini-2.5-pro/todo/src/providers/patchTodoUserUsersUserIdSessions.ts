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
  // Apply search filters from request
  const {
    created_at_start,
    created_at_end,
    expired_at_start,
    expired_at_end,
    ip,
    href,
    referrer,
    page = 1,
    limit = 100,
  } = props.body;

  // Pagination handling
  const take = Math.max(1, Math.min(Number(limit) || 100, 100));
  const skip = Math.max(0, ((Number(page) || 1) - 1) * take);

  // Build filter clauses
  const where: Record<string, unknown> = { todo_user_id: props.userId };

  if (ip !== undefined) where.ip = ip;
  if (href !== undefined) where.href = href;
  if (referrer !== undefined) where.referrer = referrer;

  // Date range filters
  if (created_at_start || created_at_end) {
    where.created_at = {
      ...(created_at_start && { gte: created_at_start }),
      ...(created_at_end && { lte: created_at_end }),
    };
  }
  if (expired_at_start || expired_at_end) {
    where.expired_at = {
      ...(expired_at_start && { gte: expired_at_start }),
      ...(expired_at_end && { lte: expired_at_end }),
    };
  }

  // Fetch paginated records and count in parallel
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_user_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    MyGlobal.prisma.todo_user_sessions.count({ where }),
  ]);

  // Project records
  const data = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null || session.expired_at === undefined
        ? undefined
        : toISOStringSafe(session.expired_at),
    user: { id: props.userId },
  }));

  return {
    data,
    pagination: {
      current: Number(page) || 1,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
  };
}
