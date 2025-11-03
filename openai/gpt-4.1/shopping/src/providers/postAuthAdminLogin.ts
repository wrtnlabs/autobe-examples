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

export async function postAuthAdminLogin(props: {
  body: IShoppingAdmin.ILogin;
}): Promise<IShoppingAdmin.IAuthorized> {
  const { email, password, ip, href, referrer } = props.body;

  // 1. Find admin by email, ensure not soft-deleted
  const admin = await MyGlobal.prisma.shopping_admins.findFirst({
    where: {
      email,
      deleted_at: null,
    },
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Verify password
  const passwordOk = await PasswordUtil.verify(password, admin.password_hash);
  if (!passwordOk) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Account must be active
  if (admin.status !== "active") {
    throw new HttpException("Your admin account is not active.", 403);
  }

  // 4. Create a new admin session
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  await MyGlobal.prisma.shopping_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_admin_id: admin.id,
      ip: typeof ip === "string" && ip ? ip : "",
      href,
      referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // 5. Generate JWT tokens
  const token: IShoppingAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
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
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // 6. Return authorized DTO with allowed fields only
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : undefined,
    token,
  };
}
