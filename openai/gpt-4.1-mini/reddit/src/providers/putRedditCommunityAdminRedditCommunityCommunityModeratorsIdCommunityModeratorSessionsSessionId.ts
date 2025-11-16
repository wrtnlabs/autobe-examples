import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModeratorSession";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putRedditCommunityAdminRedditCommunityCommunityModeratorsIdCommunityModeratorSessionsSessionId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModeratorSession.IUpdate;
}): Promise<IRedditCommunityCommunityModeratorSession> {
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.findUnique(
      {
        where: {
          id: props.sessionId,
        },
      },
    );

  if (session === null) {
    throw new HttpException("Community moderator session not found", 404);
  }

  const updated =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.update({
      where: {
        id: props.sessionId,
      },
      data: {
        ip: props.body.ip ?? undefined,
        href: props.body.href,
        referrer: props.body.referrer,
        expired_at: props.body.expire_at ?? null,
      },
    });

  return {
    id: updated.id,
    community_moderator_id:
      updated.reddit_community_community_moderator_id satisfies string as string,
    ip: updated.ip ?? null,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expire_at:
      updated.expired_at !== null ? toISOStringSafe(updated.expired_at) : null,
  } satisfies IRedditCommunityCommunityModeratorSession;
}
