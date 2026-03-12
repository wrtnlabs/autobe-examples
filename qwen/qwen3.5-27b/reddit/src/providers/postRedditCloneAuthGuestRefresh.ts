import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthGuestRefresh(props: {
  body: IRedditCloneGuest.IRefresh;
}): Promise<IRedditCloneGuest.IAuthorized> {
  // 1. Decode and validate refresh token
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
    ) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Find and validate session
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_clone_guest_id: decoded.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Verify guest account exists and is not deleted
  const guest = await MyGlobal.prisma.reddit_clone_guests.findUniqueOrThrow({
    where: {
      id: decoded.id,
      deleted_at: null,
    },
  });
  // 5. Generate new session ID for token rotation
  const newSessionId = v4();
  // 6. Calculate expiration times
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  // 7. Generate new tokens with new session ID
  const newAccessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: newSessionId,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 8. Create new session record (append-only pattern)
  await MyGlobal.prisma.reddit_clone_guest_sessions.create({
    data: {
      id: newSessionId,
      reddit_clone_guest_id: guest.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      user_agent: session.user_agent,
      created_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 9. Return authorization response
  return {
    id: guest.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString(),
      refreshable_until: refreshExpires.toISOString(),
    },
  };
}
