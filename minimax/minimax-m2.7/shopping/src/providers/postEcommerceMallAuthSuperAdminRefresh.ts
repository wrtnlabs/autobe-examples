import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
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

export async function postEcommerceMallAuthSuperAdminRefresh(props: {
  body: IEcommerceMallSuperAdmin.IRefresh;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refresh, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "super_admin") {
    throw new HttpException("Invalid token type for super admin refresh", 403);
  }
  // 3. Validate session exists and is not expired
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
        ecommerce_mall_super_admin_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Check if session expired_at is in the future
  const now = new Date();
  if (session.expired_at < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate super admin exists and is not soft-deleted
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUnique({
      where: { id: decoded.id },
    });
  if (!superAdmin) {
    throw new HttpException("Super admin account not found", 404);
  }
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "super_admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "super_admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 7. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 8. Return authorized response
  return {
    id: superAdmin.id as string & tags.Format<"uuid">,
    email: superAdmin.email as string & tags.Format<"email">,
    created_at: toISOStringSafe(superAdmin.created_at),
    updated_at: toISOStringSafe(superAdmin.updated_at),
    deleted_at: null,
    token: token,
  };
}
