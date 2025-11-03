import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getCommunityPlatformUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserSession> {
  // --- Authorization: Only allow if session owner matches auth user ---
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own sessions",
      403,
    );
  }
  // --- Fetch session by sessionId and userId ---
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session || session.community_platform_user_id !== props.userId) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: session.id,
    community_platform_user_id: session.community_platform_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at
      ? toISOStringSafe(session.expired_at)
      : undefined,
  };
}
