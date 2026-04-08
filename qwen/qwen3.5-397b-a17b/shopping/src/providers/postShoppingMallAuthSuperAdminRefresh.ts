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
  let decoded: jwt.JwtPayload;
  try {
    const verified = jwt.verify(
      props.body.refreshToken,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    decoded = typeof verified === "string" ? JSON.parse(verified) : verified;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "superadmin") {
    throw new HttpException("Invalid token type", 403);
  }
  const sessionId: string & tags.Format<"uuid"> = decoded.session_id;
  const superAdminId: string & tags.Format<"uuid"> = decoded.id;
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.findFirst({
      where: {
        id: sessionId,
        shopping_mall_super_admin_id: superAdminId,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  const superAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findUniqueOrThrow({
      where: { id: superAdminId },
    });
  if (superAdmin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const createdAt = toISOStringSafe(new Date());
  const token = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.update({
    where: { id: sessionId },
    data: { expired_at: refreshExpiresDate },
  });
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: toISOStringSafe(superAdmin.created_at),
    updated_at: toISOStringSafe(superAdmin.updated_at),
    deleted_at:
      superAdmin.deleted_at !== null
        ? toISOStringSafe(superAdmin.deleted_at)
        : null,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    } satisfies IAuthorizationToken,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
