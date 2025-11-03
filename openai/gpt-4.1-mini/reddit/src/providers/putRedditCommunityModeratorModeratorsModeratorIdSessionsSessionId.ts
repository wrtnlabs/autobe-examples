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

export async function putRedditCommunityModeratorModeratorsModeratorIdSessionsSessionId(props: {
  moderator: ModeratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IUpdate;
}): Promise<IRedditCommunityModeratorSession> {
  const { moderator, moderatorId, sessionId, body } = props;

  // Authorization: verify moderator belongs to this moderatorId
  const foundModerator =
    await MyGlobal.prisma.reddit_community_moderator.findUniqueOrThrow({
      where: { id: moderatorId },
    });
  if (foundModerator.user_id !== moderator.id) {
    throw new HttpException("Forbidden: Unauthorized moderator access", 403);
  }

  // Update moderator session
  const updated =
    await MyGlobal.prisma.reddit_community_moderator_sessions.update({
      where: {
        id: sessionId,
        reddit_community_moderator_id: moderatorId,
      },
      data: {
        ip: body.ip,
        href: body.href,
        referrer: body.referrer,
        expired_at:
          body.expired_at === null || body.expired_at === undefined
            ? null
            : toISOStringSafe(body.expired_at),
      },
    });

  return {
    id: updated.id,
    reddit_community_moderator_id: updated.reddit_community_moderator_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at: updated.expired_at ? toISOStringSafe(updated.expired_at) : null,
  };
}
