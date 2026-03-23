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
  ip: string;
  body: IEcommerceMallAdmin.IJoin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // Check duplicate email
  const existing = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existing) throw new HttpException("Email already registered", 409);
  // Create admin
  const password_hash = await PasswordUtil.hash(props.body.password);
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: password_hash,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      grade: "regular",
      graded_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      email: true,
      created_at: true,
      updated_at: true,
      grade: true,
      graded_at: true,
    },
  });
  // Create admin session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      ip: props.ip,
      href: "/ecommerceMall/auth/admin/join",
      created_at: toISOStringSafe(new Date()),
      expired_at: toISOStringSafe(accessExpires),
    },
    select: {
      id: true,
      admin_id: true,
      ip: true,
      created_at: true,
      expired_at: true,
    },
  });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: session.id,
        created_at: toISOStringSafe(new Date()),
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
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires) as string &
      tags.Format<"date-time">,
    refreshable_until: toISOStringSafe(refreshExpires) as string &
      tags.Format<"date-time">,
  };
  return {
    id: admin.id as string & tags.Format<"uuid">,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at,
      refreshable_until: token.refreshable_until,
    },
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
