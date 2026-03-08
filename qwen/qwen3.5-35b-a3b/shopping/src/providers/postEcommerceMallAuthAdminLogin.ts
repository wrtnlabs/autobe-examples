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

export async function postEcommerceMallAuthAdminLogin(props: {
  ip: string;
  body: IEcommerceMallAdmin.ILogin;
}): Promise<IEcommerceMallAdmin.IAuthorized> {
  // 1. Find admin by email with password_hash
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
      password_hash: true,
    } satisfies Prisma.ecommerce_mall_adminsSelect,
  });
  if (!admin) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Check if banned
  if (admin.is_banned) {
    throw new HttpException("Account is banned", 401);
  }
  // 3. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 4. Create new session with timestamps as string & tags.Format<'date-time'>
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const created_at: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin: { connect: { id: admin.id } },
      created_at: created_at,
      expired_at: accessExpires,
      ip: props.ip,
      href: "",
      referrer: "",
    } satisfies Prisma.ecommerce_mall_admin_sessionsCreateInput,
  });
  // 5. Generate JWT tokens using only string timestamps
  const tokenPayload: {
    type: "admin";
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    created_at: string & tags.Format<"date-time">;
  } = {
    type: "admin",
    id: admin.id,
    session_id: session.id,
    created_at: created_at,
  };
  const token: IAuthorizationToken = {
    access: jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      {
        ...tokenPayload,
        tokenType: "refresh",
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 6. Return IAuthorized with admin data and token
  return {
    id: admin.id,
    email: admin.email,
    is_banned: admin.is_banned,
    ban_reason: admin.ban_reason,
    created_at: toISOStringSafe(admin.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(admin.updated_at) as string &
      tags.Format<"date-time">,
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
