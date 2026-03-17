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

export async function postShoppingMallAuthSuperAdminLogin(props: {
  ip: string;
  body: IShoppingMallSuperAdmin.ILogin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  // 1. Find super admin by email
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.findFirst(
    {
      where: { email: props.body.email },
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // 2. Not found → 401 (do not reveal whether email exists)
  if (!superAdmin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Account deactivated (soft-deleted) → 401
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Verify plaintext password against stored hash
  const isValid = await PasswordUtil.verify(
    props.body.password,
    superAdmin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 5. Pre-generate session UUID and compute expiry timestamps
  const sessionId = v4();
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 6. Generate JWT tokens (both reference the same sessionId)
  const accessToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: sessionId,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdmin.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Persist new session record (multi-device: no prior session invalidation)
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_super_admin_id: superAdmin.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 8. Build and return IAuthorized response
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  } satisfies IAuthorizationToken;
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: toISOStringSafe(superAdmin.created_at),
    updated_at: toISOStringSafe(superAdmin.updated_at),
    deleted_at: null,
    token,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
