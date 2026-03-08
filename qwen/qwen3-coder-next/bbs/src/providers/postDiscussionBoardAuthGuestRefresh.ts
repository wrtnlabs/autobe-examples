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
  // 1. Find session by token
  const session =
    await MyGlobal.prisma.discussion_board_guest_sessions.findFirst({
      where: {
        id: props.body.session_token,
      },
    });
  if (!session) {
    throw new HttpException("Invalid or expired session", 401);
  }
  // 2. Validate session not expired
  const now = new Date();
  if (session.expired_at <= now) {
    throw new HttpException("Session has expired", 401);
  }
  // 3. Validate guest exists and not deleted
  const guest = await MyGlobal.prisma.discussion_board_guests.findUniqueOrThrow(
    {
      where: { id: session.guest_id },
    },
  );
  // 4. Generate new tokens
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "guest",
      id: guest.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date()),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Update session metadata
  await MyGlobal.prisma.discussion_board_guest_sessions.update({
    where: { id: session.id },
    data: {
      expired_at: refreshExpires,
      ip: props.body.ip ?? session.ip,
    },
  });
  await MyGlobal.prisma.discussion_board_guests.update({
    where: { id: guest.id },
    data: {},
  });
  // 6. Return authorized response
  return {
    id: guest.id,
    session_token: guest.session_token,
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpires),
      refreshable_until: toISOStringSafe(refreshExpires),
    },
  };
}
