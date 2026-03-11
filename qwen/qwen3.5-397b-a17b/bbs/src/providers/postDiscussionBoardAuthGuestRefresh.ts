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
  };
  try {
    const verified = jwt.verify(
      props.body.refresh_token,
      MyGlobal.env.JWT_SECRET_KEY,
      { issuer: "autobe" },
    );
    if (typeof verified !== "object" || verified === null) {
      throw new HttpException("Invalid token format", 401);
    }
    const tokenPayload = verified as Record<string, unknown>;
    if (
      typeof tokenPayload.id !== "string" ||
      typeof tokenPayload.session_id !== "string" ||
      typeof tokenPayload.type !== "string"
    ) {
      throw new HttpException("Invalid token payload", 401);
    }
    decoded = {
      id: tokenPayload.id,
      session_id: tokenPayload.session_id,
      type: tokenPayload.type as "guest",
    };
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type", 403);
  }
  // 3. Validate session exists
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        id: decoded.session_id,
        discussion_board_guest_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session not expired
  const now = toISOStringSafe(new Date());
  const expiredAt = toISOStringSafe(session.expired_at);
  if (expiredAt < now) {
    throw new HttpException("Session has expired", 401);
  }
  // 5. Validate guest not deleted
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id: decoded.id },
    },
  );
  if (guest.deleted_at !== null) {
    throw new HttpException("Guest account has been deleted", 403);
  }
  // 6. Generate new tokens with same session_id
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const createdAt = toISOStringSafe(new Date());
  const access = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refresh = jwt.sign(
    {
      type: "guest",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: createdAt,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session expiration
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: decoded.session_id },
    data: { expired_at: new Date(refreshExpires) },
  });
  // 8. Return authorized response
  return {
    id: decoded.id,
    token: {
      access: access,
      refresh: refresh,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
    },
  };
}
