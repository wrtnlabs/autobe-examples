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

export async function postAuthAdminLogin(props: {
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { email, password } = props.body;

  // Look up admin by email (unique)
  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: { email },
  });

  // Helper for current time as ISO branded string
  const now = toISOStringSafe(new Date());

  // If not found, or status not 'active', always log attempt and fail
  if (!admin || admin.status !== "active") {
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id: admin?.id ?? "00000000-0000-0000-0000-000000000000",
        action_type: "login",
        target_table: "community_platform_admins",
        target_id: admin?.id ?? undefined,
        details: JSON.stringify({
          email,
          reason: !admin ? "no such admin" : `admin.status:${admin.status}`,
        }),
        created_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // Password check (never reveal if pw or email wrong)
  const valid = await PasswordUtil.verify(password, admin.password_hash);
  if (!valid) {
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4(),
        actor_type: "admin",
        actor_id: admin.id,
        action_type: "login",
        target_table: "community_platform_admins",
        target_id: admin.id,
        details: JSON.stringify({ email, reason: "bad password" }),
        created_at: now,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // JWT token issue
  const oneHourMs = 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const expiredAt = toISOStringSafe(new Date(Date.now() + oneHourMs));
  const refreshableUntil = toISOStringSafe(new Date(Date.now() + sevenDaysMs));
  const access = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Log successful login
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4(),
      actor_type: "admin",
      actor_id: admin.id,
      action_type: "login",
      target_table: "community_platform_admins",
      target_id: admin.id,
      details: JSON.stringify({ email, reason: "success" }),
      created_at: now,
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
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
