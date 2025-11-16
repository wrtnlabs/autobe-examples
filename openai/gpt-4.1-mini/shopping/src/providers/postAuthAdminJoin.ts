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
  // Check if the admin with the given email already exists
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
    where: { email: props.body.email },
  });

  if (existingAdmin) {
    throw new HttpException("Email is already registered", 409);
  }

  // Hash the password securely
  const hashedPassword = await PasswordUtil.hash(props.body.password);

  // Prepare timestamp strings
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Generate UUIDs for admin and session
  const adminId = v4();
  const sessionId = v4();

  // Create the new admin record
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: adminId as string & tags.Format<"uuid">,
      email: props.body.email,
      name: props.body.name,
      password_hash: hashedPassword,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      business_status: "active",
      status: "enabled",
    },
  });

  // Create the new admin session record
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: sessionId as string & tags.Format<"uuid">,
      shopping_mall_admin_id: adminId,
      created_at: now,
      expired_at: accessExpires,
      ip: "",
      href: "",
      referrer: "",
    },
  });

  // Generate JWT access and refresh tokens
  const nowStr = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "admin",
      id: admin.id,
      session_id: session.id,
      created_at: nowStr,
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
      created_at: nowStr,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Compose the token response
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };

  // Return the authorized admin information
  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: props.body.role,
    is_active: true,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    token,
  };
}
