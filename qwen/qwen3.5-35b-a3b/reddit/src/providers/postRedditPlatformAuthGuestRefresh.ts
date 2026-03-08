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

export async function postRedditPlatformAuthGuestRefresh(props: {
  body: IRedditPlatformGuest.IRefresh;
}): Promise<IRedditPlatformGuest.IAuthorized> {
  // Step 1: Verify refresh token signature and expiration
  let decoded: {
    id: string;
    session_id: string;
    created_at: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    ) as {
      id: string;
      session_id: string;
      created_at: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // Step 2: Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_platform_guest_id: decoded.id,
        expired_at: { gt: new Date() },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // Step 3: Validate guest account exists and is not deleted
  const guest = await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // Step 4: Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const newAccess: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "2h", issuer: "autobe" },
  );
  const newRefresh: string = jwt.sign(
    {
      type: "guest" as const,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh" as const,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // Step 5: Update session expiration
  await MyGlobal.prisma.reddit_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // Step 6: Query guest with sessions
  const guestWithSessions =
    await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
      where: { id: decoded.id },
      include: {
        sessions: {
          where: {
            expired_at: { gt: new Date() },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });
  // Step 7: Transform and return response
  const response: IRedditPlatformGuest.IAuthorized = {
    id: guestWithSessions.id,
    email: guestWithSessions.email,
    username: guestWithSessions.username,
    display_name: guestWithSessions.display_name,
    bio: guestWithSessions.bio,
    avatar_url: guestWithSessions.avatar_url,
    karma: guestWithSessions.karma,
    created_at: toISOStringSafe(guestWithSessions.created_at),
    updated_at: toISOStringSafe(guestWithSessions.updated_at),
    deleted_at:
      guestWithSessions.deleted_at !== null
        ? toISOStringSafe(guestWithSessions.deleted_at)
        : null,
    sessions: guestWithSessions.sessions.map((s) => ({
      id: s.id,
      reddit_platform_guest_id: s.reddit_platform_guest_id,
      ip: s.ip,
      referrer: s.referrer,
      href: s.href,
      created_at: toISOStringSafe(s.created_at),
      expired_at: toISOStringSafe(s.expired_at),
    })),
    token: {
      access: newAccess,
      refresh: newRefresh,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
  return response;
}
