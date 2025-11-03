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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoAppUserSession> {
  const { user, userId, sessionId } = props;

  // Verify the user ID in the URL matches the authenticated user
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only terminate your own sessions",
      403,
    );
  }

  // Retrieve the session to verify existence and ownership
  const session = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new HttpException("Session not found", 404);
  }

  // Verify the session belongs to the authenticated user
  if (session.todo_app_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only terminate your own sessions",
      403,
    );
  }

  // Prepare current timestamp for soft delete
  const currentTime = toISOStringSafe(new Date());

  // Soft delete by setting expired_at to current timestamp
  const updated = await MyGlobal.prisma.todo_app_user_sessions.update({
    where: { id: sessionId },
    data: {
      expired_at: currentTime,
    },
  });

  // Retrieve the user details with proper relationship
  const userRecord = await MyGlobal.prisma.todo_app_users.findUniqueOrThrow({
    where: { id: session.todo_app_user_id },
  });

  // Build the response with proper type conversions
  const userSummary: ITodoAppUser.ISummary = {
    id: userRecord.id,
    email: userRecord.email,
    status: userRecord.status,
    created_at: toISOStringSafe(userRecord.created_at),
    updated_at: toISOStringSafe(userRecord.updated_at),
    deleted_at: userRecord.deleted_at
      ? toISOStringSafe(userRecord.deleted_at)
      : undefined,
  };

  // Return the terminated session with proper type conversion
  return {
    id: updated.id,
    user: userSummary,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  };
}
