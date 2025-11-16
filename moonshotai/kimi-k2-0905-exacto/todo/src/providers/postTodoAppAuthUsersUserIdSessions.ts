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

export async function postTodoAppAuthUsersUserIdSessions(props: {
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.ICreate;
}): Promise<ITodoAppUserSession> {
  // Verify user exists
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  // Create session
  const session = await MyGlobal.prisma.todo_app_user_sessions.create({
    data: {
      id: props.body.id,
      user_id: props.userId,
      ip: props.body.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: props.body.expired_at
        ? new Date(props.body.expired_at)
        : null,
    },
  });

  return {
    id: session.id,
    user_id: session.user_id,
    user: {
      id: user.id,
      email: user.email,
    },
    ip: session.ip,
    href: session.href as string & tags.Format<"uri">,
    referrer: session.referrer as string & tags.Format<"uri">,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
