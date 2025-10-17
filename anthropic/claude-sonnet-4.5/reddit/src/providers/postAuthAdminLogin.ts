import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminLogin(props: {
  body: IRedditLikeAdmin.ILogin;
}): Promise<IRedditLikeAdmin.IAuthorized> {
  const { body } = props;

  const admin = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      email: body.email,
      role: "admin",
      deleted_at: null,
    },
  });

  if (!admin) {
    throw new HttpException("Invalid email or password", 401);
  }

  const authCredentials =
    await MyGlobal.prisma.reddit_like_auth_credentials.findUnique({
      where: {
        reddit_like_user_id: admin.id,
      },
    });

  if (authCredentials?.account_locked_until) {
    const lockExpiry = new Date(authCredentials.account_locked_until);
    if (lockExpiry > new Date()) {
      throw new HttpException(
        "Your account has been temporarily locked due to multiple failed login attempts. Please try again in 30 minutes or reset your password.",
        403,
      );
    }
  }

  if (!admin.password_hash) {
    throw new HttpException("Invalid email or password", 401);
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    admin.password_hash,
  );

  if (!isPasswordValid) {
    const failedAttempts = (authCredentials?.failed_login_attempts || 0) + 1;
    const shouldLock = failedAttempts >= 5;

    await MyGlobal.prisma.reddit_like_auth_credentials.upsert({
      where: {
        reddit_like_user_id: admin.id,
      },
      update: {
        failed_login_attempts: failedAttempts,
        last_failed_login_at: toISOStringSafe(new Date()),
        account_locked_until: shouldLock
          ? toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000))
          : undefined,
        updated_at: toISOStringSafe(new Date()),
      },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_like_user_id: admin.id,
        failed_login_attempts: failedAttempts,
        last_failed_login_at: toISOStringSafe(new Date()),
        account_locked_until: shouldLock
          ? toISOStringSafe(new Date(Date.now() + 30 * 60 * 1000))
          : null,
        last_successful_login_at: null,
        last_login_ip: null,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  const now = new Date();
  const accessTokenExpiry = new Date(now.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const accessToken = jwt.sign(
    {
      id: admin.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: admin.id,
      tokenType: "refresh",
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.reddit_like_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_user_id: admin.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: toISOStringSafe(accessTokenExpiry),
      refresh_token_expires_at: toISOStringSafe(refreshTokenExpiry),
      ip_address: null,
      user_agent: null,
      last_activity_at: toISOStringSafe(now),
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
      deleted_at: null,
    },
  });

  await MyGlobal.prisma.reddit_like_auth_credentials.upsert({
    where: {
      reddit_like_user_id: admin.id,
    },
    update: {
      last_successful_login_at: toISOStringSafe(now),
      last_login_ip: null,
      failed_login_attempts: 0,
      account_locked_until: null,
      updated_at: toISOStringSafe(now),
    },
    create: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_like_user_id: admin.id,
      failed_login_attempts: 0,
      last_failed_login_at: null,
      account_locked_until: null,
      last_successful_login_at: toISOStringSafe(now),
      last_login_ip: null,
      created_at: toISOStringSafe(now),
      updated_at: toISOStringSafe(now),
    },
  });

  return {
    id: admin.id as string & tags.Format<"uuid">,
    username: admin.username,
    email: admin.email as string & tags.Format<"email">,
    email_verified: admin.email_verified,
    is_super_admin: admin.is_super_admin,
    profile_bio: admin.profile_bio ?? undefined,
    avatar_url: admin.avatar_url ?? undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiry),
      refreshable_until: toISOStringSafe(refreshTokenExpiry),
    },
  };
}
