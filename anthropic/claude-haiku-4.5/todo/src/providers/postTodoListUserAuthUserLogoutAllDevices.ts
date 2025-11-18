import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListLogoutResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListLogoutResponse";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoListUserAuthUserLogoutAllDevices(props: {
  user: UserPayload;
}): Promise<ITodoListLogoutResponse> {
  const now = new Date();
  const nowISO = toISOStringSafe(now);

  // Get all active sessions for this user
  const activeSessions = await MyGlobal.prisma.todo_list_sessions.findMany({
    where: {
      todo_list_user_id: props.user.id,
      expired_at: null,
    },
  });

  const sessionCount = activeSessions.length;

  // Use transaction to ensure atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Mark all sessions as expired
    await tx.todo_list_sessions.updateMany({
      where: {
        todo_list_user_id: props.user.id,
        expired_at: null,
      },
      data: {
        expired_at: now,
      },
    });

    // Add all tokens to blacklist with global_logout reason
    // For each session, we create a blacklist entry
    // The token_jti would be the JTI from the JWT tokens associated with these sessions
    const tokenExpiryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const blacklistEntries = activeSessions.map((session) => ({
      id: v4() as string & tags.Format<"uuid">,
      todo_list_user_id: props.user.id,
      token_jti: session.id,
      revoked_at: now,
      expires_at: tokenExpiryTime,
      revocation_reason: "global_logout" as const,
    }));

    if (blacklistEntries.length > 0) {
      await tx.todo_list_token_blacklist.createMany({
        data: blacklistEntries,
      });
    }
  });

  return {
    success: true,
    message:
      sessionCount === 0
        ? "No active sessions to log out."
        : "You have been logged out from all devices. Please log in again.",
    sessions_affected: sessionCount as number & tags.Type<"int32">,
    logout_completed_at: nowISO,
  };
}
