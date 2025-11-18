import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSessions";

export async function getTodoListUsersUserIdSessionsSessionId(props: {
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSessions> {
  // Verify session exists and belongs to the specified user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.userId,
    },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Return session connection metadata for security auditing
  return {
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
  };
}
