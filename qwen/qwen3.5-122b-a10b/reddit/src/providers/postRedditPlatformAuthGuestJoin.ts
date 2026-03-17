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
  // 1. Check for duplicate device fingerprint
  const existing = await MyGlobal.prisma.reddit_platform_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  // 2. Create guest record
  const guestId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = new Date().toISOString();
  const guest = await MyGlobal.prisma.reddit_platform_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.device_fingerprint,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
    },
  });
  // 3. Create session record
  const sessionId: string & tags.Format<"uuid"> = v4();
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_platform_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_platform_guest_id: guest.id,
      ip: props.body.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      updated_at: now,
      expired_at: toISOStringSafe(accessExpires),
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_platform_guest_id: true,
      created_at: true,
    },
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now,
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
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 5. Return authorized response
  return {
    id: guest.id,
    device_fingerprint: guest.device_fingerprint,
    token: token,
    created_at: toISOStringSafe(guest.created_at),
  } satisfies IRedditPlatformGuest.IAuthorized;
}
