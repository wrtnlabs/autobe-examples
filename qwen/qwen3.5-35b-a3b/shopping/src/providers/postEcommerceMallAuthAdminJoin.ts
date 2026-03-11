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
  const accessExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
  });
  if (existingAdmin) {
    throw new HttpException("Email already registered", 409);
  }
  const hashedPassword: string = await PasswordUtil.hash(props.body.password);
  const adminId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.create({
    data: {
      id: adminId,
      email: props.body.email,
      password_hash: hashedPassword,
      is_banned: false,
      ban_reason: null,
      created_at: now,
      updated_at: now,
    },
    select: {
      id: true,
      email: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: adminId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpiresAt,
    },
  });
  const verificationTokenId: string & tags.Format<"uuid"> = v4();
  const verificationToken: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.ecommerce_mall_admin_email_verifications.create({
    data: {
      id: verificationTokenId,
      admin_id: adminId,
      token: verificationToken,
      email: props.body.email,
      status: "pending",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: adminId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  } satisfies IAuthorizationToken;
  return {
    id: admin.id,
    email: admin.email,
    isBanned: admin.is_banned,
    banReason: admin.ban_reason,
    createdAt: admin.created_at.toISOString(),
    updatedAt: admin.updated_at.toISOString(),
    token,
  } satisfies IEcommerceMallAdmin.IAuthorized;
}
