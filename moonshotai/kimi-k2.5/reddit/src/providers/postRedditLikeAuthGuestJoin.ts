import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeAuthGuestJoin(props: {
  ip: string;
  body: IRedditLikeGuest.IJoin;
}): Promise<IRedditLikeGuest.IAuthorized> {
  // 1. Check for existing guest by device fingerprint
  let guest = await MyGlobal.prisma.reddit_like_guests.findFirst({
    where: { device_fingerprint: props.body.deviceFingerprint },
  });
  const now = new Date();
  if (guest) {
    // Update existing guest's updated_at
    guest = await MyGlobal.prisma.reddit_like_guests.update({
      where: { id: guest.id },
      data: { updated_at: now },
    });
  } else {
    // 2. Create new guest record
    guest = await MyGlobal.prisma.reddit_like_guests.create({
      data: {
        id: v4(),
        device_fingerprint: props.body.deviceFingerprint,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
  }
  // 3. Create guest session
  const accessExpires = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.create({
    data: {
      id: v4(),
      reddit_like_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // 4. Generate JWT tokens
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
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Return IRedditLikeGuest.IAuthorized
  return {
    id: guest.id as string & tags.Format<"uuid">,
    deviceFingerprint: guest.device_fingerprint,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt:
      guest.deleted_at === null ? null : toISOStringSafe(guest.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    } satisfies IAuthorizationToken,
  } satisfies IRedditLikeGuest.IAuthorized;
}
