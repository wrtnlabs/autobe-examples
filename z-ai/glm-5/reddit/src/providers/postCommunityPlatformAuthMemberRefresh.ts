import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAuthMemberRefresh(props: {
  body: ICommunityPlatformMember.IRefresh;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.community_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_member_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate member exists and is not deleted
  const member =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate expiration timestamps using toISOStringSafe
  const now = Date.now();
  const accessExpiresAt = toISOStringSafe(new Date(now + 60 * 60 * 1000));
  const refreshExpiresAt = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const tokenCreatedAt = toISOStringSafe(new Date(now));
  // 6. Generate new tokens (SAME session_id)
  const accessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.community_platform_member_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpiresAt) },
  });
  // 8. Return IAuthorized
  return {
    id: member.id,
    username: member.username,
    displayName: member.display_name,
    bio: member.bio,
    avatarUrl: member.avatar_url,
    karma: member.karma,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
    member: {
      id: member.id,
      username: member.username,
      display_name: member.display_name,
      bio: member.bio,
      avatar_url: member.avatar_url,
      karma: member.karma,
      created_at: toISOStringSafe(member.created_at),
    },
  };
}
