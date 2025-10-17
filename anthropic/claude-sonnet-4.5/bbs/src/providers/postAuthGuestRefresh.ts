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

  // Step 1: Verify and decode the refresh token
  let decoded: unknown;
  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate decoded token structure
  if (
    typeof decoded !== "object" ||
    decoded === null ||
    !("id" in decoded) ||
    !("type" in decoded) ||
    typeof decoded.id !== "string" ||
    typeof decoded.type !== "string"
  ) {
    throw new HttpException("Malformed refresh token payload", 401);
  }

  const payload = decoded as { id: string; type: string };

  // Validate token type is for guest
  if (payload.type !== "guest") {
    throw new HttpException("Invalid token type for guest refresh", 401);
  }

  // Step 2: Fetch guest session from database
  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { id: payload.id },
  });

  if (!guest) {
    throw new HttpException("Guest session not found", 404);
  }

  if (guest.deleted_at !== null) {
    throw new HttpException("Guest session has been terminated", 401);
  }

  // Step 3: Update last visit timestamp
  const now = new Date();
  const nowISO = toISOStringSafe(now);

  await MyGlobal.prisma.discussion_board_guests.update({
    where: { id: guest.id },
    data: {
      last_visit: nowISO,
      updated_at: nowISO,
    },
  });

  // Step 4: Calculate token expiration times
  const accessTokenExpiration = new Date(now);
  accessTokenExpiration.setMinutes(accessTokenExpiration.getMinutes() + 30);

  const refreshTokenExpiration = new Date(now);
  refreshTokenExpiration.setDate(refreshTokenExpiration.getDate() + 7);

  // Step 5: Generate new access token (30-minute expiration)
  const newAccessToken = jwt.sign(
    {
      id: guest.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Step 6: Generate new refresh token (7-day expiration) for token rotation security
  const newRefreshToken = jwt.sign(
    {
      id: guest.id,
      type: "guest",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  // Step 7: Return authorized response with new tokens
  return {
    id: guest.id,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(accessTokenExpiration),
      refreshable_until: toISOStringSafe(refreshTokenExpiration),
    },
  };
}
