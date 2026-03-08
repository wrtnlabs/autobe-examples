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
  body: ICommunityPlatformGuest.IJoin;
}): Promise<ICommunityPlatformGuest.IAuthorized> {
  const now = new Date();
  // Find existing active guest by device fingerprint
  const existingGuest =
    await MyGlobal.prisma.community_platform_guests.findFirst({
      where: {
        device_fingerprint: props.body.device_fingerprint,
        deleted_at: null,
      },
    });
  let guest;
  if (existingGuest) {
    // Update existing guest's updated_at timestamp
    guest = await MyGlobal.prisma.community_platform_guests.update({
      where: { id: existingGuest.id },
      data: { updated_at: now },
    });
  } else {
    // Create new guest
    guest = await MyGlobal.prisma.community_platform_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // Calculate expiration times
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  // Create session
  const session =
    await MyGlobal.prisma.community_platform_guest_sessions.create({
      data: {
        id: v4(),
        community_platform_guest_id: guest.id,
        ip: props.body.ip ?? "",
        href: props.body.href ?? "",
        referrer: props.body.referrer ?? "",
        created_at: now,
        expired_at: accessExpires,
      },
    });
  // Generate JWT tokens
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  return {
    id: guest.id,
    token,
  };
}
