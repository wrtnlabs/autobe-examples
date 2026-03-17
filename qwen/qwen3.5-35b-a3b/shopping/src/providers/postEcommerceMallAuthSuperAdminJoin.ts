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
  // 1. Check for existing email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Create super administrator account
  const now = new Date();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const admin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      full_name: props.body.display_name,
      display_name: props.body.display_name,
      grade: 0,
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      full_name: true,
      display_name: true,
      grade: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 3. Create session
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        super_admin_id: admin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: now,
        updated_at: now,
        deleted_at: null,
        expired_at: toISOStringSafe(accessExpires),
      },
      select: {
        id: true,
        super_admin_id: true,
      },
    });
  // 4. Generate JWT tokens
  const access = jwt.sign(
    {
      type: "superAdmin",
      id: admin.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "superAdmin",
      id: admin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return authorized response
  return {
    id: admin.id,
    email: admin.email,
    fullName: admin.full_name,
    displayName: admin.display_name,
    grade: admin.grade,
    status: admin.status,
    createdAt: toISOStringSafe(admin.created_at),
    updatedAt: toISOStringSafe(admin.updated_at),
    deletedAt: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    access,
    refresh,
    expired_at: toISOStringSafe(accessExpires),
    token: {
      access,
      refresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
