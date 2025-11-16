import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  body: IShoppingMallAdmin.ICreate;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const duplicate = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (duplicate) {
    throw new HttpException("Email already registered.", 409);
  }

  // 2. Hash the admin password
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // 3. Insert new admin record into the DB
  const now = toISOStringSafe(new Date());
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: hashedPassword,
      name: props.body.name,
      is_email_verified: false,
      status: "active",
      created_at: now,
      updated_at: now,
    },
  });

  // 4. Insert session record for admin login
  const sessionId = v4();
  const accessExpiredAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiredAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_admin_id: admin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpiredAt,
    },
  });

  // 5. Issue JWT tokens as per requirements
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiredAt,
    refreshable_until: refreshExpiredAt,
  };

  // 6. Return admin authorized DTO
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    is_email_verified: admin.is_email_verified,
    status: admin.status,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  };
}
