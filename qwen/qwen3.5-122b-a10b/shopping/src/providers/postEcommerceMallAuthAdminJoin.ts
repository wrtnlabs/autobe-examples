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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAuthAdminJoin(props: {
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create admin record
  const id = v4() as string & tags.Format<"uuid">;
  const now = new Date();
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash: passwordHash,
      admin_grade: "regular",
      account_status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      admin_grade: true,
      account_status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    } satisfies Prisma.ecommerce_mall_adminsSelect,
  });
  // 4. Create session record
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_admin_id: admin.id,
      ip: "127.0.0.1",
      href: null,
      referrer: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Return IAuthorized response
  return {
    id: admin.id,
    email: admin.email,
    admin_grade: typia.assert<"regular" | "super">(admin.admin_grade),
    account_status: typia.assert<"active" | "suspended" | "banned">(
      admin.account_status,
    ),
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at: admin.deleted_at ? toISOStringSafe(admin.deleted_at) : null,
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
