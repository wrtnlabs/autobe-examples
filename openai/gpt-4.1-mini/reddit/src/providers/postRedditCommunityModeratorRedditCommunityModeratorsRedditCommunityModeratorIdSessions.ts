import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postRedditCommunityModeratorRedditCommunityModeratorsRedditCommunityModeratorIdSessions(props: {
  moderator: ModeratorPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.ICreate;
}): Promise<IRedditCommunityModeratorSession> {
  const existingModerator =
    await MyGlobal.prisma.reddit_community_moderators.findUnique({
      where: { id: props.redditCommunityModeratorId, deleted_at: null },
    });

  if (!existingModerator) {
    throw new HttpException("Moderators not found", 404);
  }

  const newId: string & tags.Format<"uuid"> = v4();

  const created =
    await MyGlobal.prisma.reddit_community_moderator_sessions.create({
      data: {
        id: newId,
        reddit_community_moderator_id: props.redditCommunityModeratorId,
        ip: (props.body.ip ?? "") satisfies string as string,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(new Date()),
        expired_at: props.body.expires
          ? toISOStringSafe(props.body.expires)
          : null,
      },
    });

  return {
    id: created.id,
    reddit_community_moderator_id: created.reddit_community_moderator_id,
    ip: created.ip ?? undefined,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expires_at: created.expired_at
      ? toISOStringSafe(created.expired_at)
      : undefined,
  };
}
