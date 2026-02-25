import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function postCommunityPlatformAuthModeratorRefresh(props: {
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "moderator") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session using string-based date comparison
  const nowISO = toISOStringSafe(new Date());
  const session =
    await MyGlobal.prisma.community_platform_moderator_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_moderator_id: decoded.id,
        expired_at: { gt: new Date(nowISO) },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate moderator
  const moderator =
    await MyGlobal.prisma.community_platform_moderators.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (!moderator.is_active || moderator.deleted_at !== null) {
    throw new HttpException("Moderator account is inactive or deleted", 403);
  }
  // 5. Generate new tokens with ISO string dates
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "moderator",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.community_platform_moderator_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return moderator profile with properly typed tokens
  return {
    id: moderator.id,
    email: moderator.email,
    username: moderator.username,
    display_name: moderator.display_name,
    bio: moderator.bio,
    avatar_url: moderator.avatar_url,
    is_active: moderator.is_active,
    permission_level: moderator.permission_level,
    last_login_at:
      moderator.last_login_at !== null
        ? toISOStringSafe(moderator.last_login_at)
        : null,
    created_at: toISOStringSafe(moderator.created_at),
    updated_at: toISOStringSafe(moderator.updated_at),
    deleted_at:
      moderator.deleted_at !== null
        ? toISOStringSafe(moderator.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
