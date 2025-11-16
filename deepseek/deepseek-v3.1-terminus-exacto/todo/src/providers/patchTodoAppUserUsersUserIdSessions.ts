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

export async function patchTodoAppUserUsersUserIdSessions(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IRequest;
}): Promise<IPageITodoAppUserSession.ISummary> {
  // Validate that user can only access their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only access your own sessions", 403);
  }

  const { body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  // Build WHERE conditions
  const whereConditions: Prisma.todo_app_user_sessionsWhereInput = {
    todo_app_user_id: props.userId,
    ...(body.status &&
      body.status !== "all" && {
        expired_at: body.status === "active" ? null : { not: null },
      }),
    ...((body.created_at_start || body.created_at_end) && {
      created_at: {
        ...(body.created_at_start && { gte: body.created_at_start }),
        ...(body.created_at_end && { lte: body.created_at_end }),
      },
    }),
    ...(body.ip_pattern && {
      ip: { contains: body.ip_pattern },
    }),
    ...(body.href_pattern && {
      href: { contains: body.href_pattern },
    }),
    ...(body.referrer_pattern && {
      referrer: { contains: body.referrer_pattern },
    }),
  };

  // Build ORDER BY
  const orderBy: Prisma.todo_app_user_sessionsOrderByWithRelationInput = {};
  if (body.order_by) {
    orderBy[body.order_by] = body.order_direction || "desc";
  } else {
    orderBy.created_at = "desc";
  }

  // Execute queries concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_sessions.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_user_sessions.count({
      where: whereConditions,
    }),
  ]);

  // Convert to response format - handle expired_at null/undefined mismatch
  const sessions = data.map((session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : toISOStringSafe(session.created_at), // Fallback to created_at for active sessions
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: sessions,
  };
}
