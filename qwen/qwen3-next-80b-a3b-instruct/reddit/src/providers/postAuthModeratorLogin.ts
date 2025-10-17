import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorLogin(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.ILogin;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const { email, password } = props.body;

  // Find user by email
  const user = await MyGlobal.prisma.community_platform_member.findUnique({
    where: { email },
  });

  // Check if user exists and is not deleted
  if (!user || user.deleted_at) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if user is verified
  if (!user.is_verified) {
    throw new HttpException("Email not verified", 401);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, user.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Generate access token with 1 hour expiration
  const accessToken = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  // Generate refresh token with 7 day expiration
  const refreshToken = jwt.sign(
    {
      userId: user.id,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Calculate expiration times using string manipulation on current ISO time
  // Get current timestamp without using Date constructor
  const currentTimestamp = Date.now();
  const accessTokenExpiresAt = toISOStringSafe(
    new Date(currentTimestamp + 60 * 60 * 1000),
  );
  const refreshTokenExpiresAt = toISOStringSafe(
    new Date(currentTimestamp + 7 * 24 * 60 * 60 * 1000),
  );

  // Return authorized response
  return {
    id: user.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessTokenExpiresAt,
      refreshable_until: refreshTokenExpiresAt,
    },
  };
}
