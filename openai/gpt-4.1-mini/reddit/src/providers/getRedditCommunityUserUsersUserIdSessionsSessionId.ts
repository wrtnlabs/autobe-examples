import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getRedditCommunityUserUsersUserIdSessionsSessionId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityUserSession> {
  const { user, userId, sessionId } = props;

  if (user.id !== userId) {
    throw new HttpException(
      "Forbidden: Cannot access other user's session",
      403,
    );
  }

  const session =
    await MyGlobal.prisma.reddit_community_user_sessions.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        reddit_community_user_id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
      },
    });

  if (session === null || session.reddit_community_user_id !== userId) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    reddit_community_user_id: session.reddit_community_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    updated_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
