import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.user_id !== props.userId) {
    throw new HttpException(
      "Forbidden: This session belongs to a different user",
      403,
    );
  }

  return {
    id: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name === null ? undefined : session.user.name,
      created_at: toISOStringSafe(session.user.created_at),
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
  };
}
