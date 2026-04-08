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
  const now = toISOStringSafe(new Date());
  const existing = await MyGlobal.prisma.reddit_like_guests.findFirst({
    where: { device_fingerprint: props.body.device_fingerprint },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  const guestId = v4();
  await MyGlobal.prisma.reddit_like_guests.create({
    data: {
      id: guestId,
      device_fingerprint: props.body.device_fingerprint,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const sessionId = v4();
  await MyGlobal.prisma.reddit_like_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_like_guest_id: guestId,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      expired_at: toISOStringSafe(accessExpires),
    },
  });
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guestId,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  return {
    guest_id: guestId,
    token,
  };
}
