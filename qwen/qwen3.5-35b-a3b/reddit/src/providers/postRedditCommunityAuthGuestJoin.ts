import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthGuestJoin(props: {
  ip: string;
  body: IRedditCommunityGuest.IJoin;
}): Promise<IRedditCommunityGuest.IAuthorized> {
  // 1. Check duplicate device fingerprint
  const existing = await MyGlobal.prisma.reddit_community_guests.findFirst({
    where: { device_id: props.body.device_id },
  });
  if (existing) {
    throw new HttpException("Device already registered", 409);
  }
  // 2. Create guest account
  const guestId: string & tags.Format<"uuid"> = v4();
  const createdAt: Date = new Date();
  const updatedAt: Date = new Date();
  const guest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id: guestId,
      device_id: props.body.device_id,
      user_agent: props.body.user_agent ?? null,
      ip_address: props.body.ip ?? null,
      created_at: createdAt,
      updated_at: updatedAt,
      deleted_at: null,
    },
    select: {
      id: true,
      device_id: true,
      user_agent: true,
      ip_address: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    } satisfies Prisma.reddit_community_guestsSelect,
  });
  // 3. Create session
  const accessExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpires: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();
  const sessionCreatedAt: Date = new Date();
  const sessionUpdatedAt: Date = new Date();
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_community_guest_id: guest.id,
      ip: props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: sessionCreatedAt,
      updated_at: sessionUpdatedAt,
      deleted_at: null,
      expired_at: accessExpires,
    },
    select: {
      id: true,
      reddit_community_guest_id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      expired_at: true,
    } satisfies Prisma.reddit_community_guest_sessionsSelect,
  });
  // 4. Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  // 5. Return IAuthorized
  return {
    id: guest.id,
    token,
  } satisfies IRedditCommunityGuest.IAuthorized;
}
