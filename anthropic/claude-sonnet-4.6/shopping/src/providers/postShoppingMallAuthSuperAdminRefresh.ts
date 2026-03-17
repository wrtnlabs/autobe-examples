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
  // 1. Find session by refresh token (unique index lookup)
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.findUnique({
      where: { refresh_token: props.body.refresh },
      select: {
        id: true,
        shopping_mall_super_admin_id: true,
        expired_at: true,
      },
    });
  // 2. Validate session exists
  if (!session) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 3. Check session has not expired
  if (session.expired_at <= new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Load super admin and validate account is active
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: session.shopping_mall_super_admin_id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  // 5. Reject if super admin account is deactivated
  if (superAdmin.deleted_at !== null) {
    throw new HttpException(
      "Super administrator account has been deactivated",
      401,
    );
  }
  // 6. Compute new token expiry boundaries
  const now = Date.now();
  const accessExpires = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 7. Generate new JWT access token (same session_id — token rotation, not new session)
  const newAccessToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: session.id,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  // 8. Generate new JWT refresh token (same session_id — atomic rotation prevents replay)
  const newRefreshToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Atomically replace old tokens and extend session expiry
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 10. Return authorized response with newly issued tokens
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: superAdmin.created_at.toISOString(),
    updated_at: superAdmin.updated_at.toISOString(),
    deleted_at: null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    } satisfies IAuthorizationToken,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
