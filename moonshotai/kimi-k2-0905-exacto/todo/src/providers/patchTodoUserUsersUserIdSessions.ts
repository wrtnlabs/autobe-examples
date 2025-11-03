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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoUserSession.IRequest;
}): Promise<IPageITodoUserSession.ISummary> {
  // Authorization check - users can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own session data",
      403,
    );
  }

  const { page, limit, sort_by, sort_order } = props.body;
  const skip = (page - 1) * limit;

  // Build where clause from filters - ALWAYS include user id filter
  const whereClause = {
    todo_user_id: props.userId, // CRITICAL: Only get sessions for this specific user
    ...(props.body.ip !== undefined && { ip: props.body.ip }),
    ...(props.body.referrer !== undefined && { referrer: props.body.referrer }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: props.body.created_before },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { not: null } : null,
    }),
  };

  // Determine Sort
  const orderBy = {
    created_at: sort_order ?? "desc",
  } as const;

  // Handle custom sort fields
  if (sort_by === "ip") {
    Object.assign(orderBy, { ip: sort_order ?? "desc" });
  } else if (sort_by === "expired_at") {
    Object.assign(orderBy, { expired_at: sort_order ?? "desc" });
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_user_sessions.findMany({
      where: whereClause,
      orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_user_sessions.count({ where: whereClause }),
  ]);

  const data: ITodoUserSession.ISummary[] = sessions.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : toISOStringSafe(new Date()),
  }));

  return {
    data,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(Math.ceil(total / limit)),
    },
  } satisfies IPageITodoUserSession.ISummary;
}
