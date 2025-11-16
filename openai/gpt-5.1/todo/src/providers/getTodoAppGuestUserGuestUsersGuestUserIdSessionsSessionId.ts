import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppGuestUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserSession";
import { GuestuserPayload } from "../decorators/payload/GuestuserPayload";

export async function getTodoAppGuestUserGuestUsersGuestUserIdSessionsSessionId(props: {
  guestUser: GuestuserPayload;
  guestUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppGuestUserSession> {
  const session = await MyGlobal.prisma.todo_app_guestuser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_app_guestuser_id: props.guestUserId,
    },
  });

  if (session === null) {
    throw new HttpException("Guest user session not found", 404);
  }

  return {
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
