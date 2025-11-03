import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
  body: IRedditCommunityGuest.IRefresh & { refreshToken: string };
}): Promise<IRedditCommunityGuest.IAuthorized> {
  let decoded: { id: string; session_id: string; type: "guest" };

  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as { id: string; session_id: string; type: "guest" };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }

  const session =
    await MyGlobal.prisma.reddit_community_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_community_guest_id: decoded.id,
      },
      include: {
        redditCommunityGuest: true,
      },
    });

  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }

  const deletedAtRaw = (session.redditCommunityGuest as any).deleted_at;
  if (deletedAtRaw !== null && deletedAtRaw !== undefined) {
    throw new HttpException("Account has been deleted", 403);
  }

  const nowIso = toISOStringSafe(new Date());
  const accessExpiresIso = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresIso = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  const access = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refresh = jwt.sign(
    {
      type: decoded.type,
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  await MyGlobal.prisma.reddit_community_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresIso },
  });

  const guestId = decoded.id;
  const createdAt = toISOStringSafe(
    session.redditCommunityGuest.created_at as Date,
  );

  // Defensive extraction where reddit_community_guest_sessions might be missing
  const guestSessions =
    (session.redditCommunityGuest as any).reddit_community_guest_sessions ??
    undefined;

  return {
    id: guestId,
    created_at: createdAt,
    reddit_community_guest_sessions: guestSessions,
    token: {
      access,
      refresh,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
    },
  } satisfies IRedditCommunityGuest.IAuthorized;
}
