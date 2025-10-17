import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthGuestRefresh(props: {
  body: IDiscussionBoardGuest.IRefresh;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const { body } = props;

  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new HttpException("Invalid token payload", 401);
  }

  if (
    !("session_token" in decoded) ||
    typeof (decoded as Record<string, unknown>).session_token !== "string"
  ) {
    throw new HttpException(
      "Invalid token payload: missing session_token",
      401,
    );
  }

  const sessionToken = (decoded as Record<string, unknown>)
    .session_token as string;

  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { session_token: sessionToken },
  });

  if (!guest || guest.deleted_at !== null) {
    throw new HttpException("Guest session not found or invalidated", 401);
  }

  const newAccessToken = jwt.sign(
    { id: guest.id, session_token: guest.session_token },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );

  const newRefreshToken = jwt.sign(
    { session_token: guest.session_token, token_type: "guest_refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 3600 * 1000));
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 3600 * 1000),
  );

  return {
    id: guest.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
