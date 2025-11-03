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

export async function postAuthAdminJoin(props: {
  body: IShoppingAdmin.IJoin;
}): Promise<IShoppingAdmin.IAuthorized> {
  // Check for duplicate admin email
  const existingAdmin = await MyGlobal.prisma.shopping_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password (never store plain)
  const password_hash = await PasswordUtil.hash(props.body.password);
  // Generate UUID and timestamps
  const id = v4();
  const now = toISOStringSafe(new Date());

  // Create admin account
  const createdAdmin = await MyGlobal.prisma.shopping_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash,
      name: props.body.name,
      role: props.body.role,
      status: props.body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // ---
  // Generate stub JWT tokens (in real usage would perform login/auth, but
  // for join we can issue a valid format with dummy tokens for now)
  // ---
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessExpires = toISOStringSafe(accessExpiresDate);
  const refreshExpires = toISOStringSafe(refreshExpiresDate);
  const token: IShoppingAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id,
        session_id: v4(),
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id,
        session_id: v4(),
        created_at: now,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  return {
    id: createdAdmin.id,
    email: createdAdmin.email,
    name: createdAdmin.name,
    role: createdAdmin.role,
    status: createdAdmin.status,
    created_at: toISOStringSafe(createdAdmin.created_at),
    updated_at: toISOStringSafe(createdAdmin.updated_at),
    deleted_at:
      createdAdmin.deleted_at === null
        ? null
        : toISOStringSafe(createdAdmin.deleted_at),
    token,
  };
}
