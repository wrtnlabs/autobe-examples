import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

export async function postAuthAdminRefresh(props: {
  body: IShoppingAdmin.IRefresh;
}): Promise<IShoppingAdmin.IAuthorized> {
  let decoded: { id: string; session_id: string; type: string };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified === "string") {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    decoded = verified as { id: string; session_id: string; type: string };
  } catch (_) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Check actor type
  if (decoded.type !== "admin") {
    throw new HttpException("Invalid token type for admin refresh", 403);
  }

  // Load session and admin
  const session = await MyGlobal.prisma.shopping_admin_sessions.findFirst({
    where: {
      id: decoded.session_id,
      shopping_admin_id: decoded.id,
    },
    include: {
      admin: true,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.admin.deleted_at !== null) {
    throw new HttpException("Admin account is deleted", 403);
  }
  if (session.admin.status !== "active") {
    throw new HttpException("Admin account is not active", 403);
  }

  // Issue tokens
  const now = Date.now();
  const access_expires = now + 60 * 60 * 1000;
  const refresh_expires = now + 7 * 24 * 60 * 60 * 1000;
  const access = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "admin",
      id: session.admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Update session expiry
  await MyGlobal.prisma.shopping_admin_sessions.update({
    where: { id: session.id },
    data: { expired_at: toISOStringSafe(new Date(refresh_expires)) },
  });

  // Response mapping (all date fields as string)
  return {
    id: session.admin.id,
    email: session.admin.email,
    name: session.admin.name,
    role: session.admin.role,
    status: session.admin.status,
    created_at: toISOStringSafe(session.admin.created_at),
    updated_at: toISOStringSafe(session.admin.updated_at),
    deleted_at:
      session.admin.deleted_at === null
        ? null
        : toISOStringSafe(session.admin.deleted_at),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(new Date(access_expires)),
      refreshable_until: toISOStringSafe(new Date(refresh_expires)),
    },
  };
}
