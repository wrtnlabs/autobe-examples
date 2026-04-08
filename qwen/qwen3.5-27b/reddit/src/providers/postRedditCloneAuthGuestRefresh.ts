import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneGuestTransformer } from "../transformers/RedditCloneGuestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestRefresh(props: {
  body: IRedditCloneGuest.IRefresh;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Verify refresh token
  const decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
  } = jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
    issuer: "autobe",
  }) as any;
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find session
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_clone_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session not expired
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Find guest
  const guest = await MyGlobal.prisma.reddit_clone_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 6. Validate guest not deleted
  if (guest.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 7. Generate new tokens with same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires.toISOString(),
    refreshable_until: refreshExpires.toISOString(),
  };
  // 8. Update session expiration
  await MyGlobal.prisma.reddit_clone_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 9. Fetch guest with sessions using transformer
  const guestWithSessions =
    await MyGlobal.prisma.reddit_clone_guests.findUniqueOrThrow({
      where: { id: decoded.id },
      ...RedditCloneGuestTransformer.select(),
    });
  // 10. Transform and return
  const transformed =
    await RedditCloneGuestTransformer.transform(guestWithSessions);
  return {
    id: transformed.id,
    device_fingerprint: transformed.device_fingerprint,
    created_at: transformed.created_at,
    updated_at: transformed.updated_at,
    deleted_at: transformed.deleted_at,
    sessions: transformed.sessions,
    token: token,
  };
}
