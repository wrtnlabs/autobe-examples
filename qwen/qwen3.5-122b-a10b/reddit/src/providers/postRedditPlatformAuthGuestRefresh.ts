import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
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
    type: "guest";
  };
  try {
    decoded = typia.assert<{
      id: string;
      session_id: string;
      type: "guest";
    }>(
      jwt.verify(props.body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
        issuer: "autobe",
      }),
    );
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate session exists and is not deleted
  const session =
    await MyGlobal.prisma.reddit_platform_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_platform_guest_id: decoded.id,
        deleted_at: null,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 3. Check if session is expired
  const now = new Date();
  const sessionExpiredAt = new Date(session.expired_at);
  if (sessionExpiredAt <= now) {
    throw new HttpException("Session expired", 401);
  }
  // 4. Generate new tokens (SAME session_id for token rotation)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const accessToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      id: decoded.id,
      session_id: decoded.session_id,
      type: "guest",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session timestamps
  await MyGlobal.prisma.reddit_platform_guest_sessions.update({
    where: { id: decoded.session_id },
    data: {
      updated_at: new Date(),
      expired_at: refreshExpires,
    },
  });
  // 6. Query guest record for response
  const guest = await MyGlobal.prisma.reddit_platform_guests.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  // 7. Verify guest is not deleted
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 8. Return authorized response
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
    created_at: toISOStringSafe(guest.created_at),
  } satisfies IRedditPlatformGuest.IAuthorized;
}
