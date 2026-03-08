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
  // 1. Verify refresh token
  let decoded: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "guest";
    created_at: string & tags.Format<"date-time">;
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
  // 2. Validate type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and is active
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_guest_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest not deleted
  const guest = await MyGlobal.prisma.reddit_like_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 5. Generate new tokens (SAME session_id)
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const refreshExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: now.toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "2h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: now.toISOString() as string & tags.Format<"date-time">,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 6. Update session expiration
  await MyGlobal.prisma.reddit_like_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      expired_at: refreshExpires,
      updated_at: now,
    },
  });
  // 7. Return IAuthorized response
  return {
    id: guest.id,
    device_id: guest.device_id,
    created_at: guest.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updated_at: guest.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    access: accessToken,
    refresh: refreshToken,
    expired_at: accessExpires.toISOString() as string &
      tags.Format<"date-time">,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
    },
  } satisfies IRedditLikeGuest.IAuthorized;
}
