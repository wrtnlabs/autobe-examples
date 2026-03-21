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
  // 1. Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password and create super admin
  const passwordHash = await PasswordUtil.hash(props.body.password);
  const id = v4() as string & tags.Format<"uuid">;
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const superAdmin = await MyGlobal.prisma.ecommerce_mall_super_admins.create({
    data: {
      id,
      email: props.body.email,
      password_hash: passwordHash,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 3. Create session
  const sessionId = v4() as string & tags.Format<"uuid">;
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await MyGlobal.prisma.ecommerce_mall_super_admin_sessions.create({
    data: {
      id: sessionId,
      ecommerce_mall_super_admin_id: superAdmin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "super_admin",
        id: superAdmin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 5. Return authorized response
  return {
    id: superAdmin.id,
    email: superAdmin.email,
    created_at: superAdmin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: superAdmin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deleted_at:
      (superAdmin.deleted_at?.toISOString() as string &
        tags.Format<"date-time">) ?? null,
    token,
  };
}
