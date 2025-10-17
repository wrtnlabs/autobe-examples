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
  const { anonymous_token } = props.body;
  const guest = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      anonymous_token,
      deleted_at: null,
    },
  });
  if (!guest) {
    throw new HttpException("Invalid or expired anonymous_token", 404);
  }
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.discussion_board_guests.update({
    where: { id: guest.id },
    data: { updated_at: now },
  });
  // JWT token payload for guest
  const payload = { id: guest.id, type: "guest" };
  const expiresInSeconds = 60 * 60; // 1 hour
  const accessToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: expiresInSeconds,
    issuer: "autobe",
  });
  const refreshInSeconds = 60 * 60 * 24 * 7; // 7 days
  const refreshToken = jwt.sign(payload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: refreshInSeconds,
    issuer: "autobe",
  });
  const expired_at = toISOStringSafe(
    new Date(Date.now() + expiresInSeconds * 1000),
  );
  const refreshable_until = toISOStringSafe(
    new Date(Date.now() + refreshInSeconds * 1000),
  );
  return {
    id: guest.id,
    anonymous_token: guest.anonymous_token,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at,
      refreshable_until,
    },
  };
}
