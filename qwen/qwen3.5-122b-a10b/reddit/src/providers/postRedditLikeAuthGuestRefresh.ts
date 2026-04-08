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

export async function postRedditLikeAuthGuestRefresh(props: {
  body: IRedditLikeGuest.IRefresh;
}): Promise<IRedditLikeGuest.IAuthorized> {
  // 1. Validate refresh_token is provided
  if (!props.body.refresh_token || props.body.refresh_token.trim() === "") {
    throw new HttpException("Refresh token is required", 400);
  }
  // 2. Decode and verify refresh token
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
  // 3. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 401);
  }
  // 4. Verify guest exists and is not deleted
  const guest = await MyGlobal.prisma.reddit_like_guests.findUnique({
    where: { id: decoded.id },
  });
  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Verify session exists and is not expired
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session has expired", 410);
  }
  // 6. Generate new tokens with SAME session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      created_at: now.toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session's updated_at and expired_at
  await MyGlobal.prisma.reddit_like_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      updated_at: now,
      expired_at: refreshExpires,
    },
  });
  // 8. Return IRedditLikeGuest.IAuthorized
  const guestId: string & tags.Format<"uuid"> = guest.id as string &
    tags.Format<"uuid">;
  const expiredAt: string & tags.Format<"date-time"> =
    accessExpires.toISOString() as string & tags.Format<"date-time">;
  const refreshableUntil: string & tags.Format<"date-time"> =
    refreshExpires.toISOString() as string & tags.Format<"date-time">;
  return {
    guest_id: guestId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
