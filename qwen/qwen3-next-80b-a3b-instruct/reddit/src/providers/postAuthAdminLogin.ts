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
  email: string &
    tags.Format<"email"> &
    tags.MinLength<5> &
    tags.MaxLength<254>;
  password: string & tags.MinLength<8> & tags.MaxLength<128>;
  body: ICommunityPlatformAdmin.ILogin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  const { email, password } = props;

  // Find user by email
  const user = await MyGlobal.prisma.community_platform_member.findUnique({
    where: { email },
  });

  if (!user) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if account is deleted
  if (user.deleted_at !== null) {
    throw new HttpException("Account is deactivated", 401);
  }

  // Check if email is verified
  if (!user.is_verified) {
    throw new HttpException("Email not verified", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Generate access token (15 minutes)
  const accessToken = jwt.sign(
    {
      id: user.id,
      type: "admin",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  // Generate refresh token (7 days)
  const refreshToken = jwt.sign(
    {
      id: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Hash tokens for storage using bcrypt (not jwt.sign)
  const accessTokenHash = await PasswordUtil.hash(accessToken);
  const refreshTokenHash = await PasswordUtil.hash(refreshToken);

  // Create user session
  await MyGlobal.prisma.community_platform_user_sessions.create({
    data: {
      id: v4(), // Add required id property
      member: { connect: { id: user.id } }, // Use relation input instead of raw string
      refresh_token_hash: refreshTokenHash,
      access_token_hash: accessTokenHash,
      ip_address: "127.0.0.1", // Will be replaced with real IP in production
      user_agent: "unknown", // Will be replaced with real user agent in production
      session_start: toISOStringSafe(new Date()),
      session_expiry: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
      is_active: true,
    },
  });

  // Return IAuthorized response with proper date-time format
  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000)),
      refreshable_until: toISOStringSafe(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      ),
    },
  } as ICommunityPlatformAdmin.IAuthorized;
}
