import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function getAuthGuestRefresh(props: {
  guest: GuestPayload;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // Validate that the guest token exists and is properly structured
  const { id } = props.guest;

  // Verify the guest session exists in the database
  const guestSession =
    await MyGlobal.prisma.community_platform_guest.findUnique({
      where: { id },
    });

  if (!guestSession) {
    throw new HttpException("Invalid or expired guest session", 401);
  }

  // Generate timestamps using toISOStringSafe
  const now = toISOStringSafe(new Date());
  const accessExpiresAt = toISOStringSafe(
    new Date(new Date().getTime() + 15 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(new Date().getTime() + 120 * 60 * 1000),
  );

  // Create access token (15-minute expiration)
  const accessToken = jwt.sign(
    {
      id: guestSession.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "15m",
      issuer: "autobe",
    },
  );

  // Create refresh token (2-hour maximum session life)
  const refreshToken = jwt.sign(
    {
      id: guestSession.id,
      type: "guest",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "2h",
      issuer: "autobe",
    },
  );

  // Update the guest's last active timestamp
  await MyGlobal.prisma.community_platform_guest.update({
    where: { id: guestSession.id },
    data: {
      last_active: now,
    },
  });

  // Return the new access and refresh tokens with their expiration times as formatted strings
  return {
    id: guestSession.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  };
}
