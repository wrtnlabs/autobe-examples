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
    id: string;
    session_id: string;
    type: "guest";
  };
  try {
    decoded = jwt.verify(props.body.token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists and not expired
  const session = await MyGlobal.prisma.reddit_like_guest_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_like_guest_id: decoded.id,
      expired_at: {
        gt: new Date(),
      },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate guest exists and not soft-deleted
  const guest = await MyGlobal.prisma.reddit_like_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 5. Calculate new expiration times
  const now = Date.now();
  const accessExpiresAt = new Date(now + 60 * 60 * 1000); // 1 hour
  const refreshExpiresAt = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days
  // 6. Generate new tokens with SAME session_id
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.reddit_like_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresAt },
  });
  // 8. Return authorized response
  return {
    id: guest.id,
    deviceFingerprint: guest.device_fingerprint,
    createdAt: toISOStringSafe(guest.created_at),
    updatedAt: toISOStringSafe(guest.updated_at),
    deletedAt: guest.deleted_at ? toISOStringSafe(guest.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiresAt),
      refreshable_until: toISOStringSafe(refreshExpiresAt),
    },
  };
}
