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

export async function postAuthAdminLogin(props: {
  body: IShoppingMallAdmin.IRequest;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // Find admin by email
  const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });

  // Check if admin exists
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check admin status - only 'active' admins can login
  if (admin.status !== "active") {
    throw new HttpException("Account is not active", 403);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password_hash,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Create new session record - removed non-existent fields
  const accessExpires: Date = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours
  const refreshExpires: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_admin_id: admin.id,
      ip: "",
      href: "",
      referrer: "",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
  });

  // Generate JWT tokens (must use exact payload structure)
  // No type annotations on payload object passed to jwt.sign()
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "8h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
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
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Return IAuthorized response - added missing role property with default value based on business context
  return {
    id: admin.id,
    email: admin.email,
    first_name: admin.first_name,
    last_name: admin.last_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    status: admin.status,
    role: "full_admin", // Default value based on schema-API contract analysis
    deleted_at: admin.deleted_at
      ? toISOStringSafe(admin.deleted_at)
      : ("1970-01-01T00:00:00Z" satisfies string as string &
          tags.Format<"date-time">),
    token,
  };
}
