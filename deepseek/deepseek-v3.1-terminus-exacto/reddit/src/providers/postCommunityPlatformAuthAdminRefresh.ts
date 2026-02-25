import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function postCommunityPlatformAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
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
    ) as {
      id: string;
      session_id: string;
      type: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Get current timestamp as ISO string
  const now = new Date().toISOString();
  // 4. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_admin_id: decoded.id,
        expired_at: { gt: new Date(now) },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate admin account
  const admin =
    await MyGlobal.prisma.community_platform_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (!admin.is_active || admin.deleted_at !== null) {
    throw new HttpException("Admin account is inactive or deleted", 403);
  }
  // 6. Calculate new expiration times
  const nowDate = new Date(now);
  const accessExpiresDate = new Date(nowDate.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  ); // 7 days
  const accessExpires = accessExpiresDate.toISOString();
  const refreshExpires = refreshExpiresDate.toISOString();
  // 7. Generate new tokens
  const tokenPayload = {
    type: "admin",
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: now,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Update session with new tokens
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expired_at: refreshExpiresDate,
    },
  });
  // 9. Return admin profile with new tokens
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    permissions_level: admin.permissions_level,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at
      ? toISOStringSafe(admin.last_login_at)
      : null,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
