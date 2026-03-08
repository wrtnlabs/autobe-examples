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
  body: IRedditLikeGuest.IJoin;
}): Promise<IRedditLikeGuest.IAuthorized> {
  const now = new Date().toISOString();
  // Create or retrieve guest account
  const guest = await MyGlobal.prisma.reddit_like_guests.upsert({
    where: { device_id: props.body.device_id },
    create: {
      id: v4(),
      device_id: props.body.device_id,
      created_at: now,
      updated_at: now,
    },
    update: {
      updated_at: now,
    },
  });
  // Create session with connection context
  const accessExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.create({
    data: {
      id: v4(),
      reddit_like_guest_id: guest.id,
      ip: props.body.ip ?? "0.0.0.0",
      href: props.body.href,
      referrer: props.body.referrer,
      user_agent: props.body.user_agent ?? "",
      created_at: now,
      expired_at: accessExpires.toISOString(),
      updated_at: now,
    },
  });
  // Generate JWT tokens
  const tokenPayload = {
    type: "guest",
    id: guest.id,
    session_id: session.id,
    created_at: now,
  };
  const access = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "2h",
    issuer: "autobe",
  });
  const refresh = jwt.sign(
    {
      ...tokenPayload,
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "14d",
      issuer: "autobe",
    },
  );
  // Build response
  return {
    id: guest.id,
    device_id: guest.device_id,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    access,
    refresh,
    expired_at: accessExpires.toISOString(),
    token: {
      access,
      refresh,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  } satisfies IRedditLikeGuest.IAuthorized;
}
