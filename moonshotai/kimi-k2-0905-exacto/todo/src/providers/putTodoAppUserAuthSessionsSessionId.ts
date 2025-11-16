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

export async function putTodoAppUserAuthSessionsSessionId(props: {
  sessionId: string & tags.Format<"uuid">;
  body: ITodoAppUserSession.IUpdate;
}): Promise<ITodoAppUserSession> {
  // Find existing session
  const existingSession =
    await MyGlobal.prisma.todo_app_user_sessions.findUnique({
      where: { id: props.sessionId },
      include: {
        user: true,
      },
    });

  if (!existingSession) {
    throw new HttpException("Session not found", 404);
  }

  // Update the session with provided data
  const updatedSession = await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: props.sessionId },
    data: {
      expired_at: props.body.expired_at
        ? new Date(props.body.expired_at)
        : props.body.expired_at !== undefined
          ? props.body.expired_at
          : undefined,
      href: props.body.href,
      ip: props.body.ip,
      referrer: props.body.referrer,
    },
    include: {
      user: true,
    },
  });

  return {
    id: updatedSession.id,
    user_id: updatedSession.user_id,
    ip: updatedSession.ip,
    href: updatedSession.href,
    referrer: updatedSession.referrer,
    created_at: toISOStringSafe(updatedSession.created_at),
    expired_at: updatedSession.expired_at
      ? toISOStringSafe(updatedSession.expired_at)
      : undefined,
    user: {
      id: updatedSession.user.id,
      email: updatedSession.user.email,
    },
  };
}
