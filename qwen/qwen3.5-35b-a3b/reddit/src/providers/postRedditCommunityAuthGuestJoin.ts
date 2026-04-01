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
  // Check for duplicate device fingerprint
  const existing = await MyGlobal.prisma.reddit_community_guests.findFirst({
    where: { device_id: props.body.device_id },
  });
  if (existing) {
    throw new HttpException("Device fingerprint already registered", 409);
  }
  // Create guest account
  const now = new Date();
  const guest_id = v4();
  const guest = await MyGlobal.prisma.reddit_community_guests.create({
    data: {
      id: guest_id,
      device_id: props.body.device_id,
      user_agent: props.body.user_agent ?? null,
      ip_address: props.body.ip ?? null,
      created_at: now,
      updated_at: now,
    },
  });
  // Create session
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session_id = v4();
  const session = await MyGlobal.prisma.reddit_community_guest_sessions.create({
    data: {
      id: session_id,
      reddit_community_guest_id: guest.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer ?? null,
      created_at: now,
      updated_at: now,
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const access: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh: string = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Return IAuthorized pattern
  return {
    id: guest.id,
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IRedditCommunityGuest.IAuthorized;
}
