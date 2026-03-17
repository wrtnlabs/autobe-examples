import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

export async function postCommunityPlatformAuthAdminLogin(props: {
  ip: string;
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
    where: {
      email: props.body.email,
    },
    select: {
      id: true,
      email: true,
      status: true,
      email_verified_at: true,
      last_signed_in_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      password_hash: true,
    },
  });
  if (admin === null) {
    throw new HttpException("Invalid credentials", 401);
  }
  const passwordValid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  if (passwordValid === false) {
    throw new HttpException("Invalid credentials", 401);
  }
  if (admin.deleted_at !== null || admin.status !== "active") {
    throw new HttpException("Account is not allowed to sign in", 403);
  }
  const nowDate = new Date();
  const expiredAtDate = new Date(nowDate.getTime() + 60 * 60 * 1000);
  const refreshableUntilDate = new Date(
    nowDate.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const now: string & tags.Format<"date-time"> = toISOStringSafe(nowDate);
  const expired_at: string & tags.Format<"date-time"> =
    toISOStringSafe(expiredAtDate);
  const refreshable_until: string & tags.Format<"date-time"> =
    toISOStringSafe(refreshableUntilDate);
  const sessionId: string & tags.Format<"uuid"> = v4();
  await MyGlobal.prisma.community_platform_admins.update({
    where: {
      id: admin.id,
    },
    data: {
      last_signed_in_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.community_platform_admin_sessions.create({
    data: {
      id: sessionId,
      admin: {
        connect: {
          id: admin.id,
        },
      },
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at,
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at,
    refreshable_until,
  };
  return {
    id: admin.id,
    email: admin.email,
    status: admin.status,
    email_verified_at:
      admin.email_verified_at === null
        ? null
        : toISOStringSafe(admin.email_verified_at),
    last_signed_in_at: now,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: now,
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    token,
  };
}
