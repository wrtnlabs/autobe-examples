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

export async function deleteTodoListUserUsersMeSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: { id: props.sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  if (session.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  const terminated = await MyGlobal.prisma.todo_list_user_sessions.update({
    where: { id: props.sessionId },
    data: {
      expired_at: new Date(),
    },
  });

  return {
    id: terminated.id,
    todo_list_user_id: terminated.todo_list_user_id,
    ip: terminated.ip,
    href: terminated.href,
    referrer: terminated.referrer,
    created_at: toISOStringSafe(terminated.created_at),
    expired_at: terminated.expired_at
      ? toISOStringSafe(terminated.expired_at)
      : null,
  };
}
