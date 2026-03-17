import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallSuperAdminTransformer } from "../transformers/ShoppingMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAuthSuperAdminJoin(props: {
  ip: string;
  body: IShoppingMallSuperAdmin.IJoin;
}): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.shopping_mall_super_admins.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create super admin record
  const now = new Date();
  const superAdminId = v4();
  const superAdmin = await MyGlobal.prisma.shopping_mall_super_admins.create({
    data: {
      id: superAdminId,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...ShoppingMallSuperAdminTransformer.select(),
  });
  // 4. Generate JWT tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  const tokenCreatedAt = new Date().toISOString();
  const accessToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdminId,
      session_id: sessionId,
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "superAdmin",
      id: superAdminId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: tokenCreatedAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Create session record
  await MyGlobal.prisma.shopping_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      shopping_mall_super_admin_id: superAdminId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 6. Build and return IAuthorized response
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  } satisfies IAuthorizationToken;
  return {
    ...(await ShoppingMallSuperAdminTransformer.transform(superAdmin)),
    token,
  } satisfies IShoppingMallSuperAdmin.IAuthorized;
}
