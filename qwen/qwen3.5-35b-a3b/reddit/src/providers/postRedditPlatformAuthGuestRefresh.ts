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
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    ) as {
      id: string;
      session_id: string;
      type: string;
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session
  const now = new Date();
  const session =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_platform_guest_id: decoded.id,
        expired_at: { gt: now },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest not deleted
  const guest = await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
    where: { id: decoded.id },
    include: { sessions: true },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 5. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "guest" as const,
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest" as const,
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh" as const,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return response
  const sessions: IRedditPlatformGuestSession.ISummary[] =
    await ArrayUtil.asyncMap(guest.sessions, async (s) => ({
      id: s.id as string & tags.Format<"uuid">,
      reddit_platform_guest_id: s.reddit_platform_guest_id as string &
        tags.Format<"uuid">,
      href: s.href as string & tags.Format<"uri">,
      referrer: s.referrer as (string & tags.Format<"uri">) | null,
      ip: s.ip,
      created_at: toISOStringSafe(s.created_at) as string &
        tags.Format<"date-time">,
      expired_at: toISOStringSafe(s.expired_at) as string &
        tags.Format<"date-time">,
    }));
  return {
    id: guest.id as string & tags.Format<"uuid">,
    email: guest.email as string & tags.Format<"email">,
    username: guest.username,
    display_name: guest.display_name,
    bio: guest.bio,
    avatar_url: guest.avatar_url,
    karma: guest.karma,
    created_at: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      guest.deleted_at !== null ? toISOStringSafe(guest.deleted_at) : null,
    sessions,
    token: token as IAuthorizationToken,
  };
}
