import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IShoppingMallAdmin.IRefresh;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "admin" };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as { id: string; session_id: string; type: "admin" };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token subject", 403);
  }
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_admin_id: decoded.id,
    },
    include: {
      admin: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (!session.admin) {
    throw new HttpException("Admin account not found", 403);
  }
  if (session.admin.status !== "active") {
    throw new HttpException("Admin account is not active", 403);
  }
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: toISOStringSafe(now),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
    },
  });
  return {
    id: session.admin.id,
    email: session.admin.email,
    name: session.admin.name,
    is_email_verified: session.admin.is_email_verified,
    status: session.admin.status,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    token,
  };
}
