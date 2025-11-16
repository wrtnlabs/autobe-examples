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

export async function getTodoListAdminUsersUserIdSessionsSessionId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException(
      "Session not found or does not belong to the specified user",
      404,
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

  return {
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    token: typia.random<string>(),
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    user: {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
    },
  };
}
