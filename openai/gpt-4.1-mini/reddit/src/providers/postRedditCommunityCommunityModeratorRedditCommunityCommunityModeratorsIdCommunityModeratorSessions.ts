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

export async function postRedditCommunityCommunityModeratorRedditCommunityCommunityModeratorsIdCommunityModeratorSessions(props: {
  communityModerator: CommunitymoderatorPayload;
  id: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityModeratorSession.ICreate;
}): Promise<IRedditCommunityCommunityModeratorSession> {
  const now = toISOStringSafe(new Date());

  const id = v4() satisfies string as string;

  const created =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id,
        reddit_community_community_moderator_id: props.id,
        ip: (props.body.ip ?? "") satisfies string as string,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: props.body.expire_at ?? null,
      },
    });

  return {
    id: created.id,
    community_moderator_id: created.reddit_community_community_moderator_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(created.created_at),
    expire_at: created.expired_at ? toISOStringSafe(created.expired_at) : null,
  };
}
