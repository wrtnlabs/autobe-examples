import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: ICommunityPlatformAdmin.IRefresh;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // 1. Decode and validate refresh token
  let decoded: { id: string; session_id: string; type: string };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: string };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // 2. Find valid, unexpired session and admin
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        community_platform_admin_id: decoded.id,
      },
      include: {
        admin: true,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (
    session.expired_at &&
    new Date(session.expired_at).getTime() <= Date.now()
  ) {
    throw new HttpException("Session expired", 401);
  }
  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account deleted", 403);
  }

  // 3. Produce new tokens, expiration values
  const now = Date.now();
  const accessExpire = toISOStringSafe(new Date(now + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  );
  const nowIso = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // 4. Update session expiration (refreshExpire as date string parsed to Date by Prisma, but always use string in input)
  await MyGlobal.prisma.community_platform_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: new Date(now + 7 * 24 * 60 * 60 * 1000) },
  });

  // 5. Audit: log the refresh as a successful login attempt
  await MyGlobal.prisma.community_platform_admin_login_attempts.create({
    data: {
      id: v4(),
      community_platform_admin_id: session.admin.id,
      attempted_at: nowIso,
      ip: session.ip,
      success: true,
    },
  });

  // 6. Return full authorized DTO for admin: respect undefined/deleted_at and omit admin summary for refresh endpoint
  return {
    id: session.admin.id,
    email: session.admin.email,
    display_name: session.admin.display_name,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at: session.admin.deleted_at
      ? toISOStringSafe(session.admin.deleted_at)
      : undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpire,
      refreshable_until: refreshExpire,
    },
  };
}
