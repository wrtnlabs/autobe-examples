import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorLogin(props: {
  body: IRedditLikeModerator.ILogin;
}): Promise<IRedditLikeModerator.IAuthorized> {
  const { body } = props;

  const moderator = await MyGlobal.prisma.reddit_like_moderators.findUnique({
    where: { email: body.email },
  });

  if (!moderator) {
    throw new HttpException("Invalid email or password", 401);
  }

  const now = toISOStringSafe(new Date());
  const currentTime = new Date();
  const fifteenMinutesAgo = new Date(currentTime.getTime() - 15 * 60 * 1000);

  let authCredentials =
    await MyGlobal.prisma.reddit_like_auth_credentials.findUnique({
      where: { reddit_like_user_id: moderator.id },
    });

  if (!authCredentials) {
    authCredentials = await MyGlobal.prisma.reddit_like_auth_credentials.create(
      {
        data: {
          id: v4() as string & tags.Format<"uuid">,
          reddit_like_user_id: moderator.id,
          failed_login_attempts: 0,
          created_at: now,
          updated_at: now,
        },
      },
    );
  }

  if (authCredentials.account_locked_until) {
    const lockUntil = new Date(authCredentials.account_locked_until);

    if (lockUntil > currentTime) {
      throw new HttpException(
        "Account is temporarily locked due to multiple failed login attempts. Please wait or reset your password.",
        423,
      );
    }
  }

  const isPasswordValid = await PasswordUtil.verify(
    body.password,
    moderator.password_hash,
  );

  if (!isPasswordValid) {
    const lastFailedAt = authCredentials.last_failed_login_at
      ? new Date(authCredentials.last_failed_login_at)
      : null;

    const isWithinWindow = lastFailedAt && lastFailedAt > fifteenMinutesAgo;
    const failedAttempts = isWithinWindow
      ? authCredentials.failed_login_attempts + 1
      : 1;

    const shouldLock = failedAttempts >= 5;

    await MyGlobal.prisma.reddit_like_auth_credentials.update({
      where: { id: authCredentials.id },
      data: {
        failed_login_attempts: failedAttempts,
        last_failed_login_at: now,
        account_locked_until: shouldLock
          ? toISOStringSafe(new Date(currentTime.getTime() + 30 * 60 * 1000))
          : undefined,
        updated_at: now,
      },
    });

    throw new HttpException("Invalid email or password", 401);
  }

  const accessTokenExpiresAt = new Date(currentTime.getTime() + 30 * 60 * 1000);
  const refreshTokenExpiresAt = new Date(
    currentTime.getTime() + 30 * 24 * 60 * 60 * 1000,
  );

  const accessToken = jwt.sign(
    {
      id: moderator.id,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: moderator.id,
      type: "moderator",
      tokenType: "refresh",
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
      reddit_like_user_id: moderator.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_token_expires_at: toISOStringSafe(accessTokenExpiresAt),
      refresh_token_expires_at: toISOStringSafe(refreshTokenExpiresAt),
      last_activity_at: now,
      created_at: now,
      updated_at: now,
    },
  });

  await MyGlobal.prisma.reddit_like_auth_credentials.update({
    where: { id: authCredentials.id },
    data: {
      failed_login_attempts: 0,
      last_successful_login_at: now,
      account_locked_until: null,
      updated_at: now,
    },
  });

  return {
    id: moderator.id as string & tags.Format<"uuid">,
    username: moderator.username,
    email: moderator.email as string & tags.Format<"email">,
    email_verified: moderator.email_verified,
    profile_bio: moderator.profile_bio ?? undefined,
    avatar_url: moderator.avatar_url ?? undefined,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTokenExpiresAt),
      refreshable_until: toISOStringSafe(refreshTokenExpiresAt),
    },
  };
}
