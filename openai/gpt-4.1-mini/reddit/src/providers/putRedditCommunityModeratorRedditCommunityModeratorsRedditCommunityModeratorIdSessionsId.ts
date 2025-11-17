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

export async function putRedditCommunityModeratorRedditCommunityModeratorsRedditCommunityModeratorIdSessionsId(props: {
  moderator: ModeratorPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IUpdate;
}): Promise<IRedditCommunityModeratorSession> {
  const session =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUnique({
      where: { id: props.id },
    });

  if (
    !session ||
    session.reddit_community_moderator_id !== props.redditCommunityModeratorId
  ) {
    throw new HttpException("Session not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_moderator_sessions.update({
      where: { id: props.id },
      data: {
        ip:
          props.body.ip === undefined
            ? session.ip
            : (props.body.ip ?? undefined),
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at:
          props.body.expires === undefined
            ? session.expired_at
            : (props.body.expires ?? undefined),
      },
    });

  return {
    id: updated.id,
    reddit_community_moderator_id: updated.reddit_community_moderator_id,
    ip: updated.ip === null ? undefined : updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expires_at:
      updated.expired_at === null
        ? undefined
        : toISOStringSafe(updated.expired_at),
  };
}
