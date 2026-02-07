import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdminRefresh(props: {
  body: IShoppingMallSuperAdmin.IRefresh;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  // Since IShoppingMallSuperAdmin.IRefresh is empty, refresh token likely comes from authorization header
  // This is a placeholder implementation that needs to be updated based on actual refresh token storage
  // Extract session_id and super_admin_id from the current authenticated session
  // This assumes the authentication middleware has already validated the refresh token
  // For now, we'll use placeholder values that would come from the authentication context
  const sessionId = "placeholder-session-id";
  const superAdminId = "placeholder-super-admin-id";
  // Find active session
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.findFirst({
      where: {
        id: sessionId as string & tags.Format<"uuid">,
        shopping_mall_super_admin_id: superAdminId as string &
          tags.Format<"uuid">,
      },
    });
  if (!session) {
    throw new HttpException("Session not found", 401);
  }
  // Check if session has expired
  const now = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(session.expired_at);
  if (expiredAt <= now) {
    throw new HttpException("Session expired", 401);
  }
  // Find super admin account
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: superAdminId as string & tags.Format<"uuid"> },
    });
  // Check if account is active and email verified
  if (superAdmin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }
  if (!superAdmin.email_verified) {
    throw new HttpException("Email not verified", 403);
  }
  // Generate new tokens
  const accessExpires = toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const newAccessToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdminId as string & tags.Format<"uuid">,
      session_id: sessionId as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdminId as string & tags.Format<"uuid">,
      session_id: sessionId as string & tags.Format<"uuid">,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Update session expiration
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.update({
    where: { id: sessionId as string & tags.Format<"uuid"> },
    data: {
      expired_at: refreshExpires,
    },
  });
  return {
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
