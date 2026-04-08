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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthSuperAdminJoin(props: {
  ip: string;
  body: IEcommerceMallSuperAdmin.IJoin;
}): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  // Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const now = new Date();
  const superAdminId = v4();
  const sessionId = v4();
  // Create super admin record
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: superAdminId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      grade: "super_admin",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  // Create session record
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      super_admin_id: superAdminId,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "superadmin",
        id: superAdminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    grade: superAdmin.grade,
    createdAt: superAdmin.created_at.toISOString(),
    updatedAt: superAdmin.updated_at.toISOString(),
    deletedAt: superAdmin.deleted_at?.toISOString() ?? null,
    token,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
