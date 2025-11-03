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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAuthAdminJoin(props: {
  admin: AdminPayload;
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  const { body } = props;

  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: {
      email: body.email,
      deleted_at: null,
    },
  });

  if (existingAdmin !== null) {
    throw new HttpException("Email already registered", 409);
  }

  const hashedPassword = await PasswordUtil.hash(body.password);

  const now = toISOStringSafe(new Date());

  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: hashedPassword,
      full_name: body.full_name,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpired = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpired = new Date(Date.now() + 7 * 24 * 3600 * 1000);

  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      created_at: now,
      expired_at: toISOStringSafe(accessExpired),
      ip: "",
      href: "",
      referrer: "",
    },
  });

  const issuedAt = now;
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: issuedAt,
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
        session_id: session.id,
        tokenType: "refresh",
        created_at: issuedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpired),
    refreshable_until: toISOStringSafe(refreshExpired),
  };

  return {
    id: admin.id,
    email: admin.email,
    full_name: admin.full_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: null,
    token,
  };
}
