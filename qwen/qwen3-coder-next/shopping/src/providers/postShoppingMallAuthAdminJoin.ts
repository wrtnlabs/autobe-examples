import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthAdminJoin(props: {
  body: IShoppingMallAdmin.IJoin;
}): Promise<IShoppingMallAdmin.IAuthorized> {
  // 1. Check for existing admin with same email
  const existing = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create admin account with required fields
  const admin = await MyGlobal.prisma.shopping_mall_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      role_grade: "admin",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // 3. Create admin session with required fields
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.shopping_mall_admin_sessions.create({
    data: {
      id: v4(),
      shopping_mall_admin_id: admin.id,
      ip: "0.0.0.0",
      access_token: v4(),
      refresh_token: v4(),
      access_token_expires_at: accessExpires.toISOString(),
      refresh_token_expires_at: refreshExpires.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
  // 4. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin" as const,
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh" as const,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  // 5. Build and return IAuthorized response
  return {
    id: admin.id,
    email: admin.email,
    role_grade: admin.role_grade,
    status: "pending",
    reason: "",
    created_at: admin.created_at,
    updated_at: admin.updated_at,
    deleted_at: null,
    approved_at: null,
    rejected_at: null,
    rejection_reason: null,
    requester: {
      id: admin.id,
      email: admin.email,
      email_verified: false,
      created_at: admin.created_at,
      updated_at: admin.updated_at,
    },
    access_token: token.access,
    refresh_token: token.refresh,
    access_expired_at: token.expired_at,
    refresh_expired_at: token.refreshable_until,
    token,
  } satisfies IShoppingMallAdmin.IAuthorized;
}
