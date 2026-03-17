import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSuperAdminTransformer } from "../transformers/EcommerceMallSuperAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdminJoin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.IJoin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password as string);
  // 3. Create super admin record
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      grade: "super_admin",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
    ...EcommerceMallSuperAdminTransformer.select(),
  });
  // 4. Calculate token expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 5. Create session record
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4(),
        super_admin_id: superAdmin.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpires,
      },
      select: {
        id: true,
      },
    });
  // 6. Generate JWT tokens
  const tokenPayload = {
    type: "superAdmin" as const,
    id: superAdmin.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshTokenPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Build IAuthorizationToken
  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 8. Transform and return
  const transformedSuperAdmin =
    await EcommerceMallSuperAdminTransformer.transform(superAdmin);
  return {
    ...transformedSuperAdmin,
    token,
  };
}
