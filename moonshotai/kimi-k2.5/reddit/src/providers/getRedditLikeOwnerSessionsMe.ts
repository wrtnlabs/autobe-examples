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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeOwnerSessionsMe(props: {
  owner: OwnerPayload;
}): Promise<IRedditLikeMemberSession> {
  const session =
    await MyGlobal.prisma.reddit_like_owner_sessions.findUniqueOrThrow({
      where: { id: props.owner.session_id },
    });
  const owner = await MyGlobal.prisma.reddit_like_owners.findUniqueOrThrow({
    where: { id: props.owner.id },
  });
  return {
    id: session.id,
    actorType: "owner",
    actor: {
      id: owner.id,
      username: owner.username,
      displayName: owner.display_name,
      email: owner.email,
      isActive: owner.is_active,
    },
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    userAgent: null,
    createdAt: toISOStringSafe(session.created_at),
    expiredAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
    expiresAt: session.expired_at ? toISOStringSafe(session.expired_at) : null,
  };
}
