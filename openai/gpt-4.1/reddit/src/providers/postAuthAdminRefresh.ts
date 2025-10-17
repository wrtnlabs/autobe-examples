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
  // Try to get refresh token from request context: cookies or headers
  const req = (MyGlobal as any).requestContext?.req;
  const refreshToken =
    req?.cookies?.refresh ||
    req?.cookies?.refresh_token ||
    req?.headers?.["x-refresh-token"] ||
    req?.headers?.refresh ||
    req?.headers?.authorization ||
    undefined;

  if (!refreshToken || typeof refreshToken !== "string") {
    throw new HttpException("Refresh token not provided", 401);
  }

  let decoded: any = null;
  try {
    decoded = jwt.verify(refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (err) {
    const t = toISOStringSafe(new Date());
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id:
          decoded && decoded.id
            ? decoded.id
            : "00000000-0000-0000-0000-000000000000",
        action_type: "refresh",
        target_table: "community_platform_admins",
        target_id: decoded && decoded.id ? decoded.id : null,
        details: "Refresh token invalid or expired",
        created_at: t,
      },
    });
    throw new HttpException("Refresh token invalid or expired", 401);
  }

  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { id: decoded.id },
  });
  if (!admin) {
    const t = toISOStringSafe(new Date());
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id: decoded.id,
        action_type: "refresh",
        target_table: "community_platform_admins",
        target_id: decoded.id,
        details: "Admin not found for refresh",
        created_at: t,
      },
    });
    throw new HttpException("Admin not found", 401);
  }
  if (admin.status !== "active" || admin.deleted_at) {
    const t = toISOStringSafe(new Date());
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id: admin.id,
        action_type: "refresh",
        target_table: "community_platform_admins",
        target_id: admin.id,
        details: "Admin not active (status/deleted_at)",
        created_at: t,
      },
    });
    throw new HttpException("Admin is not active", 403);
  }

  const now = new Date();
  const accessExpiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const nowStr = toISOStringSafe(now);
  const accessExpStr = toISOStringSafe(accessExpiresAt);
  const refreshExpStr = toISOStringSafe(refreshExpiresAt);
  const payload = { id: admin.id, type: "admin" };
  const access = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "1h",
  });
  const refresh = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
    expiresIn: "7d",
  });

  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: admin.id,
      action_type: "refresh",
      target_table: "community_platform_admins",
      target_id: admin.id,
      details: "Refresh token granted successfully",
      created_at: nowStr,
    },
  });

  return {
    id: admin.id,
    email: admin.email,
    superuser: admin.superuser,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token: {
      access,
      refresh,
      expired_at: accessExpStr,
      refreshable_until: refreshExpStr,
    },
  };
}
