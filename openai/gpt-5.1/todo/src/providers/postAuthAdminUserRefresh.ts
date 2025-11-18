import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminUserRefresh(props: {
  body: ITodoAppAdminUser.IRefresh;
}): Promise<ITodoAppAdminUser.IAuthorized> {
  // 1. Verify and decode the refresh token
  let decoded: any;

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
  } catch (_error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Basic structural checks on decoded token (JWT payload is external input)
  if (
    !decoded ||
    typeof decoded !== "object" ||
    typeof decoded.id !== "string" ||
    typeof decoded.session_id !== "string" ||
    typeof decoded.type !== "string"
  ) {
    throw new HttpException("Invalid token payload", 401);
  }

  // 2. Validate that this is an admin refresh token
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type for admin refresh", 403);
  }

  if (decoded.tokenType !== undefined && decoded.tokenType !== "refresh") {
    throw new HttpException("Token is not a refresh token", 403);
  }

  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: decoded.session_id,
      todo_app_adminuser_id: decoded.id,
    },
    include: {
      adminUser: true,
    },
  });

  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const now = new Date();

  if (
    session.expired_at !== null &&
    session.expired_at.getTime() <= now.getTime()
  ) {
    throw new HttpException("Session has expired", 401);
  }

  const admin = session.adminUser;

  // 4. Validate admin account status and logical deletion
  if (admin.deleted_at !== null) {
    throw new HttpException("Admin account has been deleted", 403);
  }

  if (admin.status !== "active") {
    throw new HttpException("Admin account is not active", 403);
  }

  // 5. (Optional) Security hardening via login attempts could be added here.

  // 6. Generate new access and refresh tokens using the SAME session_id
  const accessExpiryDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const refreshExpiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const accessToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(accessExpiryDate);
  const refreshableUntil = toISOStringSafe(refreshExpiryDate);

  // 7. Update session expiration to reflect the new refresh token lifetime
  await MyGlobal.prisma.todo_app_adminuser_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpiryDate,
    },
  });

  // 8. Update admin user timestamps to reflect recent security-related activity
  const updatedAdmin = await MyGlobal.prisma.todo_app_adminusers.update({
    where: { id: admin.id },
    data: {
      last_login_at: now,
      updated_at: now,
    },
  });

  // 9. Map database fields to ITodoAppAdminUser.IAuthorized response shape
  return {
    id: updatedAdmin.id,
    email: updatedAdmin.email,
    display_name:
      updatedAdmin.display_name === null ? null : updatedAdmin.display_name,
    status: updatedAdmin.status,
    failed_login_count: updatedAdmin.failed_login_count,
    last_login_at:
      updatedAdmin.last_login_at === null
        ? null
        : toISOStringSafe(updatedAdmin.last_login_at),
    created_at: toISOStringSafe(updatedAdmin.created_at),
    updated_at: toISOStringSafe(updatedAdmin.updated_at),
    deleted_at:
      updatedAdmin.deleted_at === null
        ? null
        : toISOStringSafe(updatedAdmin.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
