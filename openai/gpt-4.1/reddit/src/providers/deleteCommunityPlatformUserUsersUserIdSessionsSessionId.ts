import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteCommunityPlatformUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization: can only delete own session
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only manage your own sessions",
      403,
    );
  }
  // Find the session for this user and sessionId
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session || session.community_platform_user_id !== props.userId) {
    // Not found or does not belong, do not leak existence
    throw new HttpException("Session not found", 404);
  }
  // Already expired session: treat as not found
  if (session.expired_at !== null) {
    throw new HttpException("Session not found", 404);
  }
  // Hard delete
  await MyGlobal.prisma.community_platform_user_sessions.delete({
    where: { id: props.sessionId },
  });
}
