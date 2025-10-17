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
  const { body } = props;

  // Check for existing email
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: body.email, deleted_at: null },
    select: { id: true },
  });
  if (existing) {
    throw new HttpException("Email already exists", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(body.password_hash);

  // Prepare timestamps
  const now = toISOStringSafe(new Date());

  // Create admin
  const created = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: body.email,
      password_hash: hashedPassword,
      full_name: body.full_name ?? null,
      phone_number: body.phone_number ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      full_name: true,
      phone_number: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });

  // Generate tokens
  const accessToken = jwt.sign(
    {
      userId: created.id,
      email: created.email,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      userId: created.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: created.id,
    email: created.email,
    password_hash: created.password_hash,
    full_name: created.full_name ?? null,
    phone_number: created.phone_number ?? null,
    status: created.status satisfies string as
      | "active"
      | "suspended"
      | "disabled",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
    shopping_mall_report_count: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 3600 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 3600 * 1000),
      ),
    },
  };
}
