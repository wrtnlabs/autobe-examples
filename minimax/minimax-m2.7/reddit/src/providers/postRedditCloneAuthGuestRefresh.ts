import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
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
  body: IRedditCloneGuestSession.IRefresh;
}): Promise<IRedditCloneGuestSession.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type for guest refresh", 403);
  }
  // 3. Validate session exists and not expired
  const session = await MyGlobal.prisma.reddit_clone_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_clone_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Validate guest account exists (reddit_clone_guests has no deleted_at field)
  await MyGlobal.prisma.reddit_clone_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens (SAME session_id)
  const accessExpires = new Date(Date.now() + 15 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "15m", issuer: "autobe" },
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
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    refreshable_until: refreshExpires.toISOString() as string &
      tags.Format<"date-time">,
  };
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_clone_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpires },
  });
  // 7. Return authorized response
  return {
    id: decoded.id as string & tags.Format<"uuid">,
    token: token,
  };
}
