import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminTransformer } from "../transformers/EcommerceMallAdminTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminJoin(props: {
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // Check email uniqueness with case-insensitive comparison
  const existing = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      email: {
        equals: props.body.email,
        mode: "insensitive",
      },
    },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // Hash password using BCrypt
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Create administrator with default regular grade and active status
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: passwordHash,
      grade: "regular",
      status: "active",
      nickname: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    ...EcommerceMallAdminTransformer.select(),
  });
  // Create session with connection metadata
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4(),
      admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      expired_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString(),
    },
    select: {
      id: true,
    },
  });
  // Generate JWT access and refresh tokens
  const now = new Date().toISOString();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpires = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // Transform admin and attach token
  const transformed = await EcommerceMallAdminTransformer.transform(admin);
  return {
    ...transformed,
    token,
  };
}
