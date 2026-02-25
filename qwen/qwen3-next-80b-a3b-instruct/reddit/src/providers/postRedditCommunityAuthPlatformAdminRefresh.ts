import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthPlatformAdminRefresh(props: {
  body: IRedditCommunityPlatformAdmin.IRefresh;
}): Promise<IRedditCommunityPlatformAdmin.IAuthorized> {
  let decoded: {
    id: string;
    session_id: string;
    type: "platformadmin";
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "platformadmin") {
    throw new HttpException("Invalid token type", 403);
  }
  const session =
    await MyGlobal.prisma.reddit_community_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        platform_admin_id: decoded.id,
      },
    });
  if (!session || session.expired_at <= new Date().toISOString()) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const platformAdmin =
    await MyGlobal.prisma.reddit_community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (platformAdmin.is_deleted) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const newAccessToken = jwt.sign(
    {
      type: "platformadmin",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "platformadmin",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  await MyGlobal.prisma.reddit_community_platform_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: refreshExpires.toISOString() },
  });
  return {
    id: platformAdmin.id,
    username: platformAdmin.username,
    display_name: platformAdmin.display_name,
    bio: platformAdmin.bio,
    avatar_url: platformAdmin.avatar_url,
    karma_score: platformAdmin.karma_score,
    created_at: platformAdmin.created_at.toISOString(),
    updated_at: platformAdmin.updated_at.toISOString(),
    email: platformAdmin.email,
    is_deleted: platformAdmin.is_deleted,
    access: newAccessToken,
    refresh: newRefreshToken,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IRedditCommunityPlatformAdmin.IAuthorized;
}
