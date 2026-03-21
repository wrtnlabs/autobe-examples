import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAuthAdminJoin(props: {
  ip: string;
  body: IErpHrmAdmin.IJoin;
}): Promise<IErpHrmAdmin.IAuthorized> {
  // 1. Check for duplicate email
  const existingAdmin = await MyGlobal.prisma.erp_hrm_admins.findFirst({
    where: { email: props.body.email },
    select: { id: true },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Hash password using PasswordUtil
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 3. Create admin record
  const adminId = v4();
  const now = new Date();
  const admin = await MyGlobal.prisma.erp_hrm_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: passwordHash,
      display_name: props.body.display_name,
      avatar_uri: props.body.avatar_uri ?? null,
      phone: props.body.phone ?? null,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
      updated_at: true,
    },
  });
  // 4. Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  await MyGlobal.prisma.erp_hrm_admin_sessions.create({
    data: {
      id: sessionId,
      erp_hrm_admin_id: admin.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 5. Generate JWT tokens
  const tokenPayload = {
    type: "admin" as const,
    id: admin.id,
    session_id: sessionId,
    created_at: now.toISOString(),
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 6. Return IErpHrmAdmin.IAuthorized
  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    avatar_uri: admin.avatar_uri,
    phone: admin.phone,
    created_at: admin.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: admin.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  };
}
