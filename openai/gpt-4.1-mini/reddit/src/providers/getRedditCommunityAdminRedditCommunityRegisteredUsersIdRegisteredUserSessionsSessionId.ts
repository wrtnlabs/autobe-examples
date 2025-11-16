import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUserSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getRedditCommunityAdminRedditCommunityRegisteredUsersIdRegisteredUserSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityRegisteredUserSession> {
  const session =
    await MyGlobal.prisma.reddit_community_registered_user_sessions.findFirst({
      where: {
        id: props.sessionId,
      },
    });

  if (!session) {
    throw new HttpException("Registered user session not found", 404);
  }

  return {
    id: session.id,
    user_id: session.reddit_community_registered_user_id,
    token: "",
    expires_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    created_at: toISOStringSafe(session.created_at),
    last_active: "",
    ip: session.ip ?? null,
    user_agent: "",
    referrer: session.referrer ?? null,
    is_active: false,
  };
}
