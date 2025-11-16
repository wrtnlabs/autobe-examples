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

export async function deleteTodoListUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_user_id !== props.userId) {
    throw new HttpException(
      "This session does not belong to the specified user",
      403,
    );
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: session.todo_list_user_id },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: { id: props.sessionId },
  });

  const token = jwt.sign(
    {
      id: user.id,
      session_id: session.id,
      type: "user",
    } satisfies UserPayload,
    process.env.JWT_SECRET || "fallback-secret",
  );

  return {
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    token: token,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    user: {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at
        ? toISOStringSafe(user.deleted_at)
        : undefined,
    },
  };
}
