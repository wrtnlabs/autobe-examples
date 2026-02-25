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

export async function postCommunityPlatformAuthAdminLogin(props: {
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      display_name: true,
      permissions_level: true,
      is_active: true,
      last_login_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true, // Explicitly add password_hash for verification
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if account is active
  if (!admin.is_active) {
    throw new HttpException("Account is inactive", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Generate JWT tokens first
  const currentTime = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days
  const tokenPayload = {
    type: "admin",
    id: admin.id,
    session_id: v4(),
    created_at: currentTime,
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
  // 5. Create session with actual JWT tokens
  const session =
    await MyGlobal.prisma.community_platform_admin_sessions.create({
      data: {
        id: tokenPayload.session_id,
        community_platform_admin_id: admin.id,
        access_token: accessToken,
        refresh_token: refreshToken,
        ip: "0.0.0.0", // Default IP - should come from request context
        user_agent: "", // Default user agent - should come from request context
        created_at: currentTime,
        expired_at: accessExpires,
      },
    });
  // 6. Update last login timestamp
  await MyGlobal.prisma.community_platform_admins.update({
    where: { id: admin.id },
    data: {
      last_login_at: currentTime,
    },
  });
  // 7. Return IAuthorized response
  return {
    id: admin.id as string & tags.Format<"uuid">,
    email: admin.email as string & tags.Format<"email">,
    display_name: admin.display_name,
    permissions_level: admin.permissions_level,
    is_active: admin.is_active,
    last_login_at: admin.last_login_at
      ? (admin.last_login_at.toISOString() as string & tags.Format<"date-time">)
      : undefined,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at: admin.deleted_at
      ? (admin.deleted_at.toISOString() as string & tags.Format<"date-time">)
      : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires as string & tags.Format<"date-time">,
      refreshable_until: refreshExpires as string & tags.Format<"date-time">,
    },
  } satisfies ICommunityPlatformAdmin.IAuthorized;
}
