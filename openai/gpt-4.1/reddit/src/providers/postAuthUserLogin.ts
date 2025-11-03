import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthUserLogin(props: {
  body: ICommunityPlatformUser.ILogin;
}): Promise<ICommunityPlatformUser.IAuthorized> {
  const now = toISOStringSafe(new Date());

  // 1. User lookup: match by email, only active (not deleted)
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { email: props.body.email, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // 2. Check that there is NO unconsumed, unexpired verification token (if any, user not verified)
  const verificationToken =
    await MyGlobal.prisma.community_platform_user_verification_tokens.findFirst(
      {
        where: {
          community_platform_user_id: user.id,
          consumed: false,
          expires_at: { gt: now },
        },
      },
    );
  if (verificationToken) {
    await MyGlobal.prisma.community_platform_user_login_attempts.create({
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        attempted_at: now,
        ip: props.body.ip ?? "",
        success: false,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // 3. Lockout: deny login after 5 failed attempts in last 5 min
  const fiveMinAgo = toISOStringSafe(new Date(Date.now() - 5 * 60 * 1000));
  const failedAttempts =
    await MyGlobal.prisma.community_platform_user_login_attempts.count({
      where: {
        community_platform_user_id: user.id,
        attempted_at: { gt: fiveMinAgo },
        success: false,
      },
    });
  if (failedAttempts >= 5) {
    await MyGlobal.prisma.community_platform_user_login_attempts.create({
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        attempted_at: now,
        ip: props.body.ip ?? "",
        success: false,
      },
    });
    throw new HttpException(
      "Account locked due to repeated failed attempts. Please try again later.",
      401,
    );
  }

  // 4. Password verification
  const passwordOk = await PasswordUtil.verify(
    props.body.password,
    user.password_hash,
  );
  if (!passwordOk) {
    await MyGlobal.prisma.community_platform_user_login_attempts.create({
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        attempted_at: now,
        ip: props.body.ip ?? "",
        success: false,
      },
    });
    throw new HttpException("Invalid credentials", 401);
  }

  // 5. Log successful login attempt
  await MyGlobal.prisma.community_platform_user_login_attempts.create({
    data: {
      id: v4(),
      community_platform_user_id: user.id,
      attempted_at: now,
      ip: props.body.ip ?? "",
      success: true,
    },
  });

  // 6. Create new authenticated session
  const accessExpireAt = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpireAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const session = await MyGlobal.prisma.community_platform_user_sessions.create(
    {
      data: {
        id: v4(),
        community_platform_user_id: user.id,
        ip: props.body.ip ?? "",
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: now,
        expired_at: accessExpireAt,
      },
    },
  );

  // 7. Construct JWT token (access & refresh)
  const accessToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "user",
      id: user.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // 8. API return structure (IAuthorized):
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at !== null ? toISOStringSafe(user.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireAt,
      refreshable_until: refreshExpireAt,
    },
  };
}
