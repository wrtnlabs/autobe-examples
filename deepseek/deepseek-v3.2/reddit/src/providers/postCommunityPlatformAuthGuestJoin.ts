import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
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

export async function postCommunityPlatformAuthGuestJoin(props: {
  ip: string;
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  // Check if guest with same anonymous_id already exists
  const existingGuest =
    await MyGlobal.prisma.community_platform_guests.findFirst({
      where: { anonymous_id: props.body.anonymous_id },
    });
  let guest;
  if (!existingGuest) {
    // Create new guest record
    guest = await MyGlobal.prisma.community_platform_guests.create({
      data: {
        id: v4(),
        anonymous_id: props.body.anonymous_id,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } else {
    // Update guest's updated_at timestamp
    guest = await MyGlobal.prisma.community_platform_guests.update({
      where: { id: existingGuest.id },
      data: { updated_at: toISOStringSafe(new Date()) },
    });
  }
  // Calculate session expiration (30 days from now)
  const now = new Date();
  const expiredAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  // Create session record
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.create({
      data: {
        id: v4(),
        community_platform_guest_id: guest.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: toISOStringSafe(now),
        expired_at: toISOStringSafe(expiredAt),
      },
    });
  // Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30d", issuer: "autobe" },
  );
  // Calculate token expiration times
  const accessExpiredAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshableUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiredAt),
      refreshable_until: toISOStringSafe(refreshableUntil),
    },
  };
}
