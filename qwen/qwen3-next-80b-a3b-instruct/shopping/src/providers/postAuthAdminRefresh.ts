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
  // Validate and decode refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "admin";
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token_hash,
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

  // Validate session exists and is active
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_mall_admin_id: decoded.id,
      expired_at: null,
    },
    include: {
      admin: true,
    },
  });

  if (!session || !session.admin) {
    throw new HttpException("Session expired or revoked", 401);
  }

  // Check if admin account is active
  if (session.admin.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }

  // Generate new tokens with same session_id
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
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

  const refresh = jwt.sign(
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

  // Update session expiration
  await MyGlobal.prisma.shopping_mall_admin_sessions.update({
    where: {
      id: decoded.session_id,
    },
    data: {
      expired_at: refreshExpires,
    },
  });

  // Return IAuthorized response
  return {
    id: decoded.id,
    email: session.admin.email,
    first_name: session.admin.first_name,
    last_name: session.admin.last_name,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    status: typia.assert<
      "active" | "pending_verification" | "suspended" | "deleted"
    >(session.admin.status),
    role: "full_admin",
    deleted_at: session.admin.deleted_at
      ? toISOStringSafe(session.admin.deleted_at)
      : "1970-01-01T00:00:00Z",
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
