import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserAuthUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListSession> {
  const session = await MyGlobal.prisma.todo_list_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip_address: session.ip_address,
    user_agent: session.user_agent,
    created_at: toISOStringSafe(session.created_at),
    last_activity_at: toISOStringSafe(session.last_activity_at),
    expired_at:
      session.expired_at === null
        ? undefined
        : toISOStringSafe(session.expired_at),
    absolute_timeout_at: toISOStringSafe(session.absolute_timeout_at),
  };
}
