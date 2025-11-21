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
  // Check for existing admin with same email
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Create admin record with pending_verification status
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      first_name: props.body.first_name,
      last_name: props.body.last_name,
      status: "pending_verification" satisfies string as string,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  // Create admin session record - use defaults without attempting to access non-existent props.body properties
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      ip: "127.0.0.1",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens with exact payload structure
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Return authorized response with all required fields
  return {
    id: admin.id,
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    status: admin.status satisfies string as
      | "active"
      | "pending_verification"
      | "suspended"
      | "deleted",
    role: props.body.role satisfies string as
      | "super_admin"
      | "full_admin"
      | "limited_admin",
    deleted_at:
      admin.deleted_at === null
        ? "1970-01-01T00:00:00Z"
        : toISOStringSafe(admin.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  } satisfies IShoppingMallAdmin.IAuthorized;
}
