import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postShoppingMallAuthSuperAdminJoin(props: {
  body: IShoppingMallSuperAdmin.IJoin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  // Validate email uniqueness across all actor tables
  const existingSuperAdmin =
    await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
      where: { email: props.body.email },
    });
  if (existingSuperAdmin) {
    throw new HttpException("Email already registered for superAdmin", 409);
  }
  const existingCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { email: props.body.email },
    });
  if (existingCustomer) {
    throw new HttpException("Email already registered for customer", 409);
  }
  const existingSeller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
    where: { email: props.body.email },
  });
  if (existingSeller) {
    throw new HttpException("Email already registered for seller", 409);
  }
  const existingAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered for admin", 409);
  }
  // Hash the password before storage
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Create the superAdmin record
  const createdAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      created_at: createdAt,
      updated_at: createdAt,
      role: "super", // Required field from schema
    },
  });
  // Create the email verification record
  const verificationExpiresAt = toISOStringSafe(
    new Date(Date.now() + 24 * 60 * 60 * 1000),
  ) as string & tags.Format<"date-time">;
  const verification =
    await MyGlobal.prisma.shopping_mall_super_admin_email_verifications.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        superAdmin: { connect: { id: superAdmin.id } },
        token: v4(),
        expires_at: verificationExpiresAt,
        created_at: createdAt,
        used: false, // Fixed: 'used' must be boolean, not null. This indicates not used initially.
      },
    });
  // Create the superAdmin session for JWT token
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionCreatedAt = toISOStringSafe(new Date()) as string &
    tags.Format<"date-time">;
  const session =
    await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        superAdmin: { connect: { id: superAdmin.id } },
        ip: "",
        created_at: sessionCreatedAt,
        expired_at: toISOStringSafe(accessExpires) as string &
          tags.Format<"date-time">,
        href: "", // Required field from schema
        referrer: "", // Required field from schema
      },
    });
  // Generate JWT tokens with proper types
  const token = {
    access: jwt.sign(
      {
        type: "super",
        id: superAdmin.id,
        session_id: session.id,
        created_at: sessionCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "super",
        id: superAdmin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: sessionCreatedAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  // Return the authorized response matching IShoppingMallSuperAdmin.IAuthorized
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    createdAt: createdAt,
    updatedAt: createdAt,
    adminType: "super",
    name: undefined,
    phone_number: undefined,
    avatar_url: undefined,
    token,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
