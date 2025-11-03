import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoUserSession> {
  // Verify user is accessing their own session
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own sessions",
      403,
    );
  }

  // Retrieve session with proper formatting
  const session = await MyGlobal.prisma.todo_user_sessions.findUniqueOrThrow({
    where: {
      id: props.sessionId,
      todo_user_id: props.userId,
    },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });

  // Return properly formatted session
  return {
    id: session.id as string & tags.Format<"uuid">,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
