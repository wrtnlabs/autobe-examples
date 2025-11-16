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

export async function patchTodoAppUserAuthSessions(props: {
  user: UserPayload;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions for filtering
  const whereConditions: Prisma.todo_app_user_sessionsWhereInput = {
    user_id: props.user.id,
  };

  // Apply created_at date range filtering if provided
  if (props.body.created_at_start || props.body.created_at_end) {
    whereConditions.created_at = {};
    if (props.body.created_at_start) {
      whereConditions.created_at.gte = props.body.created_at_start;
    }
    if (props.body.created_at_end) {
      whereConditions.created_at.lte = props.body.created_at_end;
    }
  }

  // Apply expired_at status filtering if provided
  if (props.body.expired_at !== undefined && props.body.expired_at !== null) {
    // Filter by expired status
    if (props.body.expired_at === true) {
      // Want expired sessions (expired_at is not null)
      whereConditions.expired_at = { not: null };
    } else {
      // Want active sessions (expired_at is null)
      whereConditions.expired_at = null;
    }
  }

  // Execute parallel queries for data and total count
  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true, // Include user data for summary
      },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API response format
  const transformedSessions: ITodoAppUserSession[] = sessions.map(
    (session) => ({
      id: session.id,
      user_id: session.user_id,
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    }),
  );

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedSessions,
  };
}
