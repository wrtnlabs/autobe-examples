import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserSessionsSessionId(props: {
  user: UserPayload;
  sessionId: string;
}): Promise<IRedditPlatformUserSession> {
  const session =
    await MyGlobal.prisma.reddit_platform_user_sessions.findUnique({
      where: { id: props.sessionId },
    });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  // Authorization check: verify session belongs to the authenticated user or is accessed by admin
  if (session.reddit_platform_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: session.id,
    reddit_platform_user_id: session.reddit_platform_user_id,
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    access_token_expires_at: session.access_token_expires_at,
    refresh_token_expires_at: session.refresh_token_expires_at,
    ip: session.ip ?? undefined,
    user_agent: session.user_agent ?? undefined,
    created_at: session.created_at,
    expired_at: session.expired_at,
    last_activity_at: session.last_activity_at,
    is_active: session.is_active,
  };
}
