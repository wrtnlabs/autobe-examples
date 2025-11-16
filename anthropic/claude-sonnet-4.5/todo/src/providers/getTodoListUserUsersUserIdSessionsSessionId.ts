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
      "Forbidden: Cannot access sessions of other users",
      403,
    );
  }

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
      "Forbidden: Session does not belong to the specified user",
      403,
    );
  }

  const sessionUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: session.todo_list_user_id,
    },
  });

  if (!sessionUser) {
    throw new HttpException("User not found", 404);
  }

  const token = jwt.sign(
    {
      id: session.todo_list_user_id,
      session_id: session.id,
      type: "user",
    } satisfies UserPayload,
    MyGlobal.env.JWT_SECRET_KEY,
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
      id: sessionUser.id,
      email: sessionUser.email,
      email_verified: sessionUser.email_verified,
      created_at: toISOStringSafe(sessionUser.created_at),
      updated_at: toISOStringSafe(sessionUser.updated_at),
      deleted_at: sessionUser.deleted_at
        ? toISOStringSafe(sessionUser.deleted_at)
        : null,
    },
  };
}
