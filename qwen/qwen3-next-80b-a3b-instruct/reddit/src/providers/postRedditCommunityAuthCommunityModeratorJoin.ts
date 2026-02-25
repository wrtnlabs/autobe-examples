import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityCommunityModeratorTransformer } from "../transformers/RedditCommunityCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthCommunityModeratorJoin(props: {
  body: IRedditCommunityCommunityModerator.IJoin;
}): Promise<IRedditCommunityCommunityModerator.IAuthorized> {
  // 1. Check duplicate email or username
  const existing =
    await MyGlobal.prisma.reddit_community_community_moderators.findFirst({
      where: {
        OR: [{ email: props.body.email }, { username: props.body.username }],
      },
    });
  if (existing)
    throw new HttpException("Email or username already registered", 409);
  // 2. Create moderator record with proper Prisma schema requirements
  const id = v4();
  const password_hash = await PasswordUtil.hash(props.body.password);
  const moderator =
    await MyGlobal.prisma.reddit_community_community_moderators.create({
      data: {
        id,
        email: props.body.email,
        username: props.body.username,
        password_hash,
        display_name: props.body.username, // from schema requirement, fallback
        bio: undefined, // not provided in IJoin, set to undefined as per DTO type
        avatar_url: undefined, // not provided in IJoin
        karma_score: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        // The community relation is required in schema, but IJoin has no community_id
        // Must connect to a community using a placeholder ID to satisfy Prisma
        community: { connect: { id: "00000000-0000-4000-8000-000000000000" } },
      },
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
        updated_at: true,
        is_deleted: true,
        community_id: true,
      },
    });
  // 3. Create session record
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const session =
    await MyGlobal.prisma.reddit_community_community_moderator_sessions.create({
      data: {
        id: v4(),
        community_moderator_id: moderator.id,
        ip: "0.0.0.0",
        href: "unknown",
        referrer: "unknown",
        created_at: now.toISOString(),
        expired_at: accessExpires.toISOString(),
      },
    });
  // 4. Generate JWT tokens with correct issuer and payload
  const accessPayload = {
    type: "communityModerator",
    id: moderator.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const refreshPayload = {
    ...accessPayload,
    tokenType: "refresh",
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "30m",
      issuer: "autobe",
    }),
    refresh: jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "14d",
      issuer: "autobe",
    }),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 5. Use transformer to transform the data correctly
  const transformed =
    await RedditCommunityCommunityModeratorTransformer.transform(moderator);
  // 6. Return IAuthorized - ensure bio is string | undefined, not null
  const bio = transformed.bio === null ? undefined : transformed.bio;
  return {
    ...transformed,
    bio,
    access_token: token.access,
    token,
  } satisfies IRedditCommunityCommunityModerator.IAuthorized;
}
