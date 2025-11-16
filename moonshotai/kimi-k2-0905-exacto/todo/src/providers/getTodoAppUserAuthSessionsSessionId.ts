import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserAuthSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string;
}): Promise<ITodoAppUserSession.IInvert> {
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: { id: props.sessionId },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.user_id !== props.user.id) {
    throw new HttpException("Session does not belong to current user", 403);
  }

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
    user_id: session.user_id,
    user: {
      id: session.user.id,
      email: session.user.email,
    },
  };
}
