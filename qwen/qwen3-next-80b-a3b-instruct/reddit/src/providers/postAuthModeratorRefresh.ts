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

export async function postAuthModeratorRefresh(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.IRefresh;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  const { moderator } = props;

  // Fetch the user session using the moderator's member_id
  const session =
    await MyGlobal.prisma.community_platform_user_sessions.findFirst({
      where: {
        member_id: moderator.id,
        is_active: true,
      },
    });

  // Check if session exists and is valid
  if (!session) {
    throw new HttpException(
      "Unauthorized: Invalid or expired refresh token",
      401,
    );
  }

  // Get ISO string for current time
  const currentTimeISO = toISOStringSafe(new Date());

  // Convert session expiry and current time to milliseconds for comparison
  // This is required because we cannot use Date objects in type system
  const sessionExpiryTimeMs = Date.parse(
    toISOStringSafe(session.session_expiry),
  ); // Fixed: wrap session.session_expiry with toISOStringSafe() to ensure string
  const currentTimeMs = Date.parse(currentTimeISO);

  // Validate session has not expired
  if (sessionExpiryTimeMs <= currentTimeMs) {
    throw new HttpException("Unauthorized: Refresh token has expired", 401);
  }

  // Fetch member details to include email in token payload
  const member = await MyGlobal.prisma.community_platform_member.findUnique({
    where: { id: moderator.id },
  });

  if (!member) {
    throw new HttpException(
      "Internal Server Error: Member record not found",
      500,
    );
  }

  // Generate new access token
  const accessPayload = {
    userId: moderator.id,
    email: member.email,
  };
  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  // Generate new refresh token
  const refreshPayload = {
    userId: moderator.id,
    tokenType: "refresh",
  };
  const newRefreshToken = jwt.sign(
    refreshPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Hash the new refresh token for storage
  const hashedRefreshToken = await PasswordUtil.hash(newRefreshToken);

  // Calculate future timestamps in milliseconds and convert back to ISO strings
  const nowMs = Date.parse(currentTimeISO);
  const expiredAt = toISOStringSafe(new Date(nowMs + 60 * 60 * 1000)); // 1 hour from now
  const refreshableUntil = toISOStringSafe(
    new Date(nowMs + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days from now

  // Update the session with the new refresh token and extended expiry
  await MyGlobal.prisma.community_platform_user_sessions.update({
    where: { id: session.id },
    data: {
      refresh_token_hash: hashedRefreshToken,
      session_expiry: refreshableUntil,
    },
  });

  // Return successful response
  return {
    id: moderator.id,
    token: {
      access: accessToken,
      refresh: newRefreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
