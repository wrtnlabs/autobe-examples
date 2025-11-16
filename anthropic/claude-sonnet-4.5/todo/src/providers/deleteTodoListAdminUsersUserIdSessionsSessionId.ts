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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteTodoListAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_user_id !== props.userId) {
    throw new HttpException(
      "Session does not belong to the specified user",
      403,
    );
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: session.todo_list_user_id,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  const deletedSession = await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });

  const token = jwt.sign(
    {
      id: user.id,
      session_id: deletedSession.id,
      type: "user",
    },
    process.env.JWT_SECRET || "default-secret",
  );

  return {
    id: deletedSession.id,
    todo_list_user_id: deletedSession.todo_list_user_id,
    ip: deletedSession.ip,
    href: deletedSession.href,
    referrer: deletedSession.referrer,
    token: token,
    created_at: toISOStringSafe(deletedSession.created_at),
    expired_at: deletedSession.expired_at
      ? toISOStringSafe(deletedSession.expired_at)
      : null,
    user: {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at:
        user.deleted_at === null ? undefined : toISOStringSafe(user.deleted_at),
    },
  };
}
