import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAuthGuestRefresh(props: {
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
    created_at: string;
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
  // 3. Get current timestamp as ISO string
  const now = Date.now();
  const nowISO = toISOStringSafe(new Date(now));
  // 4. Validate session exists and not expired
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_guest_id: decoded.id,
        expired_at: { gt: nowISO },
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 5. Validate guest account exists and not deleted
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 6. Generate new tokens with updated expiration
  const accessExpiresISO = toISOStringSafe(new Date(now + 60 * 60 * 1000)); // 1 hour
  const refreshExpiresISO = toISOStringSafe(
    new Date(now + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days
  const tokenPayload = {
    type: "guest" as const,
    id: decoded.id,
    session_id: decoded.session_id,
    created_at: nowISO,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshTokenPayload = {
    ...tokenPayload,
    tokenType: "refresh" as const,
  };
  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: refreshExpiresISO },
  });
  // 8. Return refreshed authorization
  return {
    id: guest.id as string & tags.Format<"uuid">,
    device_fingerprint: guest.device_fingerprint,
    created_at: toISOStringSafe(guest.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(guest.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      guest.deleted_at !== null
        ? (toISOStringSafe(guest.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresISO as string & tags.Format<"date-time">,
      refreshable_until: refreshExpiresISO as string & tags.Format<"date-time">,
    },
  };
}
