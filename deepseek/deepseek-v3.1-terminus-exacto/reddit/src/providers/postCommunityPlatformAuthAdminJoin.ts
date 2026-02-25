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

export async function postCommunityPlatformAuthAdminJoin(props: {
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Hash password
  const password_hash = await PasswordUtil.hash(props.body.password);
  const now = new Date().toISOString();
  // Create admin record
  const admin = await MyGlobal.prisma.community_platform_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: password_hash,
      display_name: props.body.display_name,
      permissions_level: props.body.permissions_level ?? "admin",
      is_active: true,
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // Create session with expiration
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.create({
      data: {
        id: v4(),
        community_platform_admin_id: admin.id,
        access_token: v4(), // Internal token for session tracking
        refresh_token: v4(), // Internal token for refresh tracking
        ip: "", // IP not provided in current props structure
        user_agent: "",
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    permissions_level: admin.permissions_level,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at?.toISOString() ?? null,
    created_at: admin.created_at.toISOString(),
    updated_at: admin.updated_at.toISOString(),
    deleted_at: admin.deleted_at?.toISOString() ?? null,
    token,
  } satisfies ICommunityPlatformAdmin.IAuthorized;
}
