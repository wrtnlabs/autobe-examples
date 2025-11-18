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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersUserEmailSessions(props: {
  user: UserPayload;
  userEmail: string & tags.Format<"email">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Verify target user exists and is active
  const targetUser = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      email: props.userEmail,
      deleted_at: null,
      status: {
        in: ["active", "verified"],
      },
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  // Verify authorization - user can only access their own sessions
  if (targetUser.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions using Prisma's type-safe query
  const whereConditions: Prisma.todo_app_user_sessionsWhereInput = {
    todo_app_user_id: targetUser.id,
  };

  // Add status filter
  if (props.body.status === "active") {
    whereConditions.expired_at = null;
  } else if (props.body.status === "expired") {
    whereConditions.expired_at = { not: null };
  }

  // Add date range filters with proper ISO string handling
  if (props.body.created_after || props.body.created_before) {
    whereConditions.created_at = {};
    if (props.body.created_after) {
      whereConditions.created_at.gte = props.body.created_after;
    }
    if (props.body.created_before) {
      whereConditions.created_at.lte = props.body.created_before;
    }
  }

  if (props.body.last_activity_after || props.body.last_activity_before) {
    whereConditions.last_activity_at = {};
    if (props.body.last_activity_after) {
      whereConditions.last_activity_at.gte = props.body.last_activity_after;
    }
    if (props.body.last_activity_before) {
      whereConditions.last_activity_at.lte = props.body.last_activity_before;
    }
  }

  // Add search filter
  if (props.body.search) {
    whereConditions.OR = [
      { ip: { contains: props.body.search } },
      { user_agent: { contains: props.body.search } },
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }

  const [sessions, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions.map((session) => ({
      id: session.id,
      created_at: toISOStringSafe(session.created_at),
      last_activity_at: toISOStringSafe(session.last_activity_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : undefined,
    })),
  };
}
