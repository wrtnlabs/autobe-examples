import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Hash the incoming refresh token for lookup
  const refreshTokenHash = await PasswordUtil.hash(props.body.refresh_token);
  // 2. Find session by refresh token hash
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      refresh_token_hash: refreshTokenHash,
    },
    include: {
      admin: true,
    },
  });
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Validate session hasn't expired
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Validate admin account is active and not deleted
  if (
    session.admin.deleted_at !== null &&
    session.admin.deleted_at !== undefined
  ) {
    throw new HttpException("Account has been deleted", 403);
  }
  if (session.admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  // 5. Validate last activity within 30-minute inactivity window
  const inactivityThreshold = new Date(now.getTime() - 30 * 60 * 1000);
  if (session.last_activity_at < inactivityThreshold) {
    throw new HttpException("Session expired due to inactivity", 401);
  }
  // 6. Generate new access token (1-hour validity)
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 7. Generate new refresh token (7-day validity)
  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Hash new tokens
  const newAccessTokenHash = await PasswordUtil.hash(accessToken);
  const newRefreshTokenHash = await PasswordUtil.hash(refreshToken);
  // 9. Update session with new token hashes and reset last activity
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token_hash: newAccessTokenHash,
      refresh_token_hash: newRefreshTokenHash,
      last_activity_at: now,
    },
  });
  // 10. Return IAuthorized response
  return {
    id: session.admin.id,
    email: session.admin.email,
    grade: session.admin.grade,
    status: session.admin.status,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at:
      session.admin.deleted_at !== null &&
      session.admin.deleted_at !== undefined
        ? toISOStringSafe(session.admin.deleted_at)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(session.expired_at),
    },
  };
}
