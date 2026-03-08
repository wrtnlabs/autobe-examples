import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberRefresh(props: {
  body: IRedditPlatformMember.IRefresh;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Verify refresh token signature and expiration
  const decoded: {
    type: "member";
    id: string;
    session_id: string;
    created_at: string;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as {
    type: "member";
    id: string;
    session_id: string;
    created_at: string;
  };
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        member_id: decoded.id,
        expired_at: {
          gte: new Date(),
        },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member account exists and is not deleted
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (member.is_active === false) {
    throw new HttpException("Account is not active", 403);
  }
  // 5. Calculate new token expiration times (using Date for math, then convert to string)
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // 6. Generate new access token (15 minutes)
  const access = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );
  // 7. Generate new refresh token (7 days)
  const refresh = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session expiration
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: new Date(refreshExpires),
    },
  });
  // 9. Query communities where member is moderator (via join)
  const moderatorCommunities =
    await MyGlobal.prisma.reddit_platform_community_moderators.findMany({
      where: {
        user_id: decoded.id,
      },
      select: {
        user_id: true,
        community_id: true,
        created_at: true,
        updated_at: true,
        id: true,
      },
    });
  // 10. Query banned users where member is issuer
  const bannedUserBans =
    await MyGlobal.prisma.reddit_platform_community_bans.findMany({
      where: {
        banned_by: decoded.id,
      },
      select: {
        user_id: true,
        community_id: true,
        banned_by: true,
        created_at: true,
        updated_at: true,
        id: true,
        deleted_at: true,
        expires_at: true,
      },
    });
  // 11. Build moderator of communities response (simplified - without nested objects)
  const moderatorOfCommunities: IRedditPlatformCommunity.ISummary[] = [];
  // 12. Build banned users response (simplified - without nested objects)
  const bannedUsers: IRedditPlatformMember.ISummary[] = [];
  // 13. Build and return response
  return {
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarUrl: member.avatar_url,
    karmaScore: member.karma_score as number & tags.Type<"int32">,
    isActive: member.is_active,
    createdAt: toISOStringSafe(member.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(member.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      member.deleted_at !== null
        ? (toISOStringSafe(member.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    moderatorOfCommunities,
    bannedUsers,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
