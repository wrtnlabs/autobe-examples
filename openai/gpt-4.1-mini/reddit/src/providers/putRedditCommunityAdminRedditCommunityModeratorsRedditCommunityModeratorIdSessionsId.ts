import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModeratorSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityModeratorsRedditCommunityModeratorIdSessionsId(props: {
  admin: AdminPayload;
  redditCommunityModeratorId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityModeratorSession.IUpdate;
}): Promise<IRedditCommunityModeratorSession> {
  const existing =
    await MyGlobal.prisma.reddit_community_moderator_sessions.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("Moderator session not found", 404);
  }

  if (
    existing.reddit_community_moderator_id !== props.redditCommunityModeratorId
  ) {
    throw new HttpException(
      "Moderator session does not belong to the specified moderator",
      403,
    );
  }

  const updated =
    await MyGlobal.prisma.reddit_community_moderator_sessions.update({
      where: { id: props.id },
      data: {
        ip:
          props.body.ip === undefined
            ? existing.ip === null
              ? { set: undefined }
              : existing.ip
            : props.body.ip === null
              ? { set: undefined }
              : props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at:
          props.body.expires === undefined
            ? existing.expired_at
            : (props.body.expires ?? null),
      },
    });

  return {
    id: updated.id,
    reddit_community_moderator_id: updated.reddit_community_moderator_id,
    ip: updated.ip === null ? null : (updated.ip ?? undefined),
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
  } satisfies IRedditCommunityModeratorSession;
}
