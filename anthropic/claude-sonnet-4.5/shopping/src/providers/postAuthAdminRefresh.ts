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
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };

  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: "admin";
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type", 403);
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

  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  return {
    id: session.admin.id,
    email: session.admin.email,
    full_name: session.admin.full_name,
    phone_number: session.admin.phone_number,
    admin_level: typia.assert<"super_admin" | "moderator" | "support">(
      session.admin.admin_level,
    ),
    email_verified: session.admin.email_verified,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at:
      session.admin.deleted_at === null
        ? undefined
        : toISOStringSafe(session.admin.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
