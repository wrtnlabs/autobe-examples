import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikeMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberSession";
import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { RedditLikeModeratorAtSummaryTransformer } from "../transformers/RedditLikeModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeModeratorSessionsMe(props: {
  moderator: ModeratorPayload;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_moderator_sessions.findUniqueOrThrow({
      where: { id: props.moderator.session_id },
      select: {
        id: true,
        ip: true,
        href: true,
        referrer: true,
        created_at: true,
        expired_at: true,
        moderator: RedditLikeModeratorAtSummaryTransformer.select(),
      },
    });
  return {
    id: session.id,
    actorType: "moderator",
    actor: await RedditLikeModeratorAtSummaryTransformer.transform(
      session.moderator,
    ),
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    userAgent: null,
    createdAt: session.created_at.toISOString(),
    expiredAt: session.expired_at?.toISOString() ?? null,
    expiresAt: session.expired_at?.toISOString() ?? null,
  };
}
