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
  // Authorization: Verify user can only delete their own sessions
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only delete your own sessions", 403);
  }

  // Find the session to verify it exists and belongs to the user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
    },
    include: {
      user: true,
    },
  });

  // Check if session exists
  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify session belongs to the specified user
  if (session.user_id !== props.userId) {
    throw new HttpException("Session not found", 404);
  }

  // Delete the session
  const deleted = await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
    include: {
      user: true,
    },
  });

  // Return the deleted session information
  return {
    id: deleted.id,
    user: {
      id: deleted.user.id,
      email: deleted.user.email,
      name: deleted.user.name === null ? undefined : deleted.user.name,
      created_at: toISOStringSafe(deleted.user.created_at),
    },
    ip: deleted.ip,
    href: deleted.href,
    referrer: deleted.referrer,
    created_at: toISOStringSafe(deleted.created_at),
    expired_at: deleted.expired_at ? toISOStringSafe(deleted.expired_at) : null,
  };
}
