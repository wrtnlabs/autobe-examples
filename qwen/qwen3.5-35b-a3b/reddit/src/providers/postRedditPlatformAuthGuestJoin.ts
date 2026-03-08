import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
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
  const now = new Date();
  const accessExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // Check for duplicate email
  const existing = await MyGlobal.prisma.reddit_platform_guests.findFirst({
    where: { email: props.body.email },
  });
  if (existing) {
    throw new HttpException("Email already registered", 409);
  }
  const guestId: string & tags.Format<"uuid"> = v4();
  // Create guest record
  const guest = await MyGlobal.prisma.reddit_platform_guests.create({
    data: {
      id: guestId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      avatar_url: "",
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const sessionId: string & tags.Format<"uuid"> = v4();
  // Create session
  const session = await MyGlobal.prisma.reddit_platform_guest_sessions.create({
    data: {
      id: sessionId,
      reddit_platform_guest_id: guest.id,
      ip: props.body.ip ?? "0.0.0.0",
      referrer: props.body.referrer ?? null,
      href: props.body.href,
      created_at: now,
      expired_at: accessExpires,
    },
  });
  // Generate JWT tokens
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        created_at: now.toISOString(),
      } as const,
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1d", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
        tokenType: "refresh",
        created_at: now.toISOString(),
      } as const,
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // Fetch sessions
  const sessions =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findMany({
      where: { reddit_platform_guest_id: guest.id },
    });
  return {
    id: guest.id,
    email: guest.email,
    username: guest.username,
    display_name: guest.display_name,
    bio: guest.bio,
    avatar_url: guest.avatar_url ?? null,
    karma: guest.karma,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    deleted_at: null,
    sessions: sessions.map((s) => ({
      id: s.id,
      reddit_platform_guest_id: s.reddit_platform_guest_id,
      ip: s.ip,
      referrer: s.referrer,
      href: s.href,
      created_at: s.created_at.toISOString(),
      expired_at: s.expired_at.toISOString(),
    })),
    token,
  } satisfies IRedditPlatformGuest.IAuthorized;
}
