import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function getRedditCommunityCommunityModeratorRedditCommunityCommunityModeratorsIdCommunityModeratorSessionsSessionId(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityCommunityModeratorSession> {
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findUnique(
      {
        where: {
          id: props.sessionId,
          reddit_community_community_moderator_id: props.id,
        },
      },
    );

  if (session === null) {
    throw new HttpException("Community moderator session not found", 404);
  }

  return {
    id: session.id,
    community_moderator_id: session.reddit_community_community_moderator_id,
    ip: session.ip === null ? undefined : session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expire_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
