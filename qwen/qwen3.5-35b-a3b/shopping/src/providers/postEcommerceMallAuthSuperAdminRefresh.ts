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
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    type: string;
    id: string;
    session_id: string;
    created_at: string;
  };
  // 2. Validate type
  if (decoded.type !== "superAdmin") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session (only check session exists with given id)
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.findFirst({
      where: {
        id: decoded.session_id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate actor not deleted
  const superAdmin =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findUniqueOrThrow({
      where: { id: decoded.id },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Calculate token expiration times
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: decoded.type,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
  };
  // 6. Update session expiration
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    fullName: superAdmin.full_name,
    displayName: superAdmin.display_name,
    grade: superAdmin.grade,
    status: superAdmin.status,
    createdAt: toISOStringSafe(superAdmin.created_at),
    updatedAt: toISOStringSafe(superAdmin.updated_at),
    deletedAt: superAdmin.deleted_at
      ? toISOStringSafe(superAdmin.deleted_at)
      : null,
    access: token.access,
    refresh: token.refresh,
    expired_at: toISOStringSafe(accessExpires),
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
