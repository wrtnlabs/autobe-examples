import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getRedditCommunityModeratorRedditCommunityModeratorsRedditCommunityModeratorIdSessionsId(props: {
  moderator: ModeratorPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModeratorSession> {
  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findFirst({
      where: {
        id: props.id,
        reddit_community_moderator_id: props.redditCommunityModeratorId,
      },
    });

  if (!session) {
    throw new HttpException("Moderator session not found", 404);
  }

  return {
    id: session.id,
    reddit_community_moderator_id: session.reddit_community_moderator_id,
    ip: session.ip === null ? undefined : (session.ip ?? undefined),
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expires_at:
      session.expired_at === null
        ? undefined
        : session.expired_at
          ? toISOStringSafe(session.expired_at)
          : undefined,
  };
}
