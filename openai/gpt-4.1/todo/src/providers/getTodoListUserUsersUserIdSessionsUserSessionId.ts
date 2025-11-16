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

export async function getTodoListUserUsersUserIdSessionsUserSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  userSessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.userSessionId },
  });
  if (!session || session.user_id !== props.userId) {
    throw new HttpException("Session not found or not owned by user", 404);
  }

  return {
    id: session.id,
    user: {
      id: user.id,
      email: user.email,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
