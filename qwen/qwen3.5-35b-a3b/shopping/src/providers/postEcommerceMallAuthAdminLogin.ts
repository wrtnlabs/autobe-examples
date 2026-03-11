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
  const adminRecord = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: { email: props.body.email },
    select: {
      id: true,
      email: true,
      password_hash: true,
      is_banned: true,
      ban_reason: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!adminRecord) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (adminRecord.is_banned) {
    throw new HttpException(adminRecord.ban_reason ?? "Account is banned", 401);
  }
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    adminRecord.password_hash,
  );
  if (!passwordValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  const accessExpiresTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const nowTime: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const session = await MyGlobal.prisma.ecommerce_mall_admin_sessions.create({
    data: {
      id: sessionId,
      admin_id: adminRecord.id,
      ip: props.ip,
      href: "",
      referrer: "",
      created_at: nowTime,
      expired_at: accessExpiresTime,
    },
  });
  const tokenAccess: string = jwt.sign(
    {
      type: "admin" as const,
      id: adminRecord.id,
      session_id: sessionId,
      created_at: nowTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const tokenRefresh: string = jwt.sign(
    {
      type: "admin" as const,
      id: adminRecord.id,
      session_id: sessionId,
      tokenType: "refresh" as const,
      created_at: nowTime,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  const token: IAuthorizationToken = {
    access: tokenAccess,
    refresh: tokenRefresh,
    expired_at: accessExpiresTime,
    refreshable_until: refreshExpiresTime,
  };
  const response: IEcommerceMallAdmin.IAuthorized = {
    id: adminRecord.id,
    email: adminRecord.email,
    isBanned: adminRecord.is_banned,
    banReason: adminRecord.ban_reason,
    createdAt: toISOStringSafe(adminRecord.created_at),
    updatedAt: toISOStringSafe(adminRecord.updated_at),
    token,
  };
  return response;
}
