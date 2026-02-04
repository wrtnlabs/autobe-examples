import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";

export async function postCommunityPlatformAuthModeratorRefresh(props: {
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Decode and verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "moderator";
  };
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "moderator";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Validate type matches expected actor type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  // Validate moderator session exists and is active
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        moderator_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Validate moderator account is still active
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (moderator.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Fetch associated member (user) and community using correct foreign key fields
  const member = await MyGlobal.prisma.community_platform_members.findUnique({
    where: { id: moderator.member_id },
  });
  if (!member) {
    throw new HttpException("Associated member not found", 404);
  }
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: moderator.community_id },
    });
  if (!community) {
    throw new HttpException("Associated community not found", 404);
  }
  // Calculate expiration timestamps using ISO string format
  const accessExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  );
  // Generate new JWT access and refresh tokens
  const newAccess = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  const newRefresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );
  // Update session expiration (extend by 30 days)
  await MyGlobal.prisma.community_platform_moderator_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });
  // Return authorized response with proper summary types
  return {
    user: member,
    community: {
      name: community.name,
      description: community.description,
      icon: community.icon
        ? (community.icon satisfies string as string)
        : "https://example.com/default-icon.png",
      created_at: toISOStringSafe(community.created_at),
      subscriber_count: community.subscriber_count,
    },
    id: moderator.id,
    token: {
      access: newAccess,
      refresh: newRefresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
