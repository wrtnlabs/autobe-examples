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
  // 1. Check for duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing !== undefined) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password using PasswordUtil
  const passwordHash: string = await PasswordUtil.hash(props.body.password);
  // 3. Create super admin record
  const superAdminId: string & tags.Format<"uuid"> = v4();
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id: superAdminId,
      email: props.body.email,
      password_hash: passwordHash,
      full_name: props.body.display_name,
      display_name: props.body.display_name,
      grade: 1,
      status: "active",
      created_at: new Date(),
      updated_at: new Date(),
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
    } satisfies Prisma.ecommerce_mall_super_adminsSelect,
  });
  // 4. Create session
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpires: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session =
    await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
      data: {
        id: sessionId,
        super_admin_id: superAdmin.id,
        ip: props.ip,
        href: "",
        referrer: "",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        expired_at: new Date(accessExpires),
      },
    });
  // 5. Generate JWT tokens
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const access: string = jwt.sign(
    {
      type: "super_admin",
      id: superAdmin.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "super_admin",
      id: superAdmin.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IAuthorized
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    fullName: superAdmin.full_name,
    displayName: superAdmin.display_name,
    grade: superAdmin.grade,
    status: superAdmin.status,
    createdAt: superAdmin.created_at.toISOString(),
    updatedAt: superAdmin.updated_at.toISOString(),
    deletedAt: superAdmin.deleted_at?.toISOString() ?? null,
    access,
    refresh,
    expired_at: accessExpires,
    token: {
      access,
      refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    } satisfies IAuthorizationToken,
  } satisfies IEcommerceMallSuperAdmin.IAuthorized;
}
