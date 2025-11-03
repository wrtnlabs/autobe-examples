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

export async function getRedditCommunityModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityModeratorSession> {
  const { moderatorId, sessionId } = props;

  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findFirstOrThrow({
      where: {
        id: sessionId,
        reddit_community_moderator_id: moderatorId,
      },
    });

  return {
    id: session.id,
    reddit_community_moderator_id: session.reddit_community_moderator_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
