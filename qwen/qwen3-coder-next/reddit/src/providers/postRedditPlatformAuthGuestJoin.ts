import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthGuestJoin(props: {
  body: IRedditPlatformGuest.IJoin;
}): Promise<IRedditPlatformGuest.IAuthorized> {
  // 1. Check for existing guest with same device fingerprint
  const existingGuest = await MyGlobal.prisma.reddit_platform_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  // 2. Create new guest or retrieve existing
  const guest =
    existingGuest ||
    (await MyGlobal.prisma.reddit_platform_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.device_fingerprint,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    }));
  // 3. Create guest session with all required fields (ip, href, referrer)
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const session = await MyGlobal.prisma.reddit_platform_guest_sessions.create({
    data: {
      id: v4(),
      reddit_platform_guest_id: guest.id,
      expired_at: accessExpires,
      created_at: toISOStringSafe(new Date()),
      ip: "0.0.0.0",
      href: "",
      referrer: "",
    },
  });
  // 4. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
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
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Build response with proper typing
  const now = new Date();
  const accessTime = new Date(now.getTime() + 60 * 60 * 1000);
  const refreshTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: guest.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessTime),
      refreshable_until: toISOStringSafe(refreshTime),
    },
  };
}
