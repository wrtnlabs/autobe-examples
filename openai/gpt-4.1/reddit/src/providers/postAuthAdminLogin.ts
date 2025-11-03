import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const now = toISOStringSafe(new Date());

  // Find admin by email
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: { email: props.body.email },
  });
  if (!admin || admin.deleted_at !== null) {
    // Do not leak info; throw generic error
    throw new HttpException("Invalid credentials", 401);
  }

  // Check verified: must have at least one consumed verification token
  const isVerified =
    await MyGlobal.prisma.community_platform_admin_verification_tokens.findFirst(
      {
        where: {
          community_platform_admin_id: admin.id,
          consumed: true,
        },
      },
    );
  if (!isVerified) {
    await MyGlobal.prisma.community_platform_admin_login_attempts.create({
      data: {
        id: v4(),
        community_platform_admin_id: admin.id,
        attempted_at: now,
        ip: props.body.ip ?? "",
        success: false,
      },
    });
    throw new HttpException("Account not verified", 403);
  }

  // Rate limit: last 5 failures in the last 30 mins
  const thirtyMinAgo = toISOStringSafe(new Date(Date.now() - 30 * 60 * 1000));
  const failedAttempts =
    await MyGlobal.prisma.community_platform_admin_login_attempts.findMany({
      where: {
        community_platform_admin_id: admin.id,
        attempted_at: { gte: thirtyMinAgo },
        success: false,
      },
      orderBy: { attempted_at: "desc" },
      take: 5,
    });
  if (failedAttempts.length >= 5) {
    await MyGlobal.prisma.community_platform_admin_login_attempts.create({
      data: {
        id: v4(),
        community_platform_admin_id: admin.id,
        attempted_at: now,
        ip: props.body.ip ?? "",
        success: false,
      },
    });
    throw new HttpException(
      "Too many failed login attempts. Please try again later.",
      429,
    );
  }

  // Verify password
  const valid = await PasswordUtil.verify(
    props.body.password,
    admin.password_hash,
  );
  await MyGlobal.prisma.community_platform_admin_login_attempts.create({
    data: {
      id: v4(),
      community_platform_admin_id: admin.id,
      attempted_at: now,
      ip: props.body.ip ?? "",
      success: valid,
    },
  });
  if (!valid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Issue session
  const sessionId = v4();
  const accessExpire = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpire = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  await MyGlobal.prisma.community_platform_admin_sessions.create({
    data: {
      id: sessionId,
      community_platform_admin_id: admin.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  const token = {
    access: jwt.sign(
      {
        type: "admin",
        id: admin.id,
        session_id: sessionId,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpire,
    refreshable_until: refreshExpire,
  };

  return {
    id: admin.id,
    email: admin.email,
    display_name: admin.display_name,
    created_at: toISOStringSafe(admin.created_at),
    updated_at: toISOStringSafe(admin.updated_at),
    deleted_at:
      admin.deleted_at === null ? null : toISOStringSafe(admin.deleted_at),
    token,
  };
}
