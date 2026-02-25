import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityOwnerRefresh(props: {
  body: IRedditCommunityCommunityOwner.IRefresh;
}): Promise<IRedditCommunityCommunityOwner.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "communityOwner";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "redditCommunity" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type
  if (decoded.type !== "communityOwner") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate session
  const session =
    await MyGlobal.prisma.reddit_community_community_owner_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_community_owner_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate actor is not deleted
  const owner =
    await MyGlobal.prisma.reddit_community_community_owners.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (owner.is_deleted) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Generate new access token (7d) and reuse refresh token (30d)
  const accessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const accessPayload = {
    type: decoded.type,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: toISOStringSafe(new Date()),
  };
  const refreshPayload = {
    type: decoded.type,
    id: decoded.id,
    session_id: decoded.session_id,
    tokenType: "refresh",
    created_at: toISOStringSafe(new Date()),
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "redditCommunity",
  });
  const refreshToken = props.body.refresh_token;
  const expiredAt: string & tags.Format<"date-time"> =
    toISOStringSafe(accessExpires);
  const refreshableUntil: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshExpires);
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: expiredAt,
    refreshable_until: refreshableUntil,
  };
  // Update session expiration - removed updated_at since it's not a valid field in update input
  await MyGlobal.prisma.reddit_community_community_owner_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  // Build final response with correctly typed dates
  return {
    id: owner.id as string & tags.Format<"uuid">,
    email: owner.email as string & tags.Format<"email">,
    username: owner.username,
    display_name: owner.display_name,
    bio: owner.bio ?? null,
    avatar_url: owner.avatar_url ?? null,
    karma_score: owner.karma_score as number & tags.Type<"int32">,
    is_deleted: owner.is_deleted,
    created_at: toISOStringSafe(owner.created_at),
    updated_at: toISOStringSafe(owner.updated_at),
    token,
  };
}
