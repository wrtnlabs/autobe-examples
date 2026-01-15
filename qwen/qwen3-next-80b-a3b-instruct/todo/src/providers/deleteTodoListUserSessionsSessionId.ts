import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.sessionId,
      todo_list_user_id: props.user.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  await MyGlobal.prisma.todo_list_user_sessions.delete({
    where: {
      id: props.sessionId,
    },
  });
  // Per schema, these fields don't exist: last_activity_at, is_active
  // Return minimal compliant object with available fields and proper values
  return {
    id: session.id,
    created_at: toISOStringSafe(session.created_at),
    expires_at: toISOStringSafe(session.expired_at),
    last_activity_at: toISOStringSafe(session.expired_at), // Use expires_at as the last activity timestamp
    is_active: false, // Session is being deleted, so it's no longer active
  };
}
