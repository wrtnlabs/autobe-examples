import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const guestRecord = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: { ip: props.guest.ip },
  });
  if (!guestRecord) {
    throw new HttpException("Guest not found", 404);
  }

  const accessExpires = Date.now() + 60 * 60 * 1000;
  const refreshExpires = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: props.guest.id,
        ip: props.guest.ip,
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: props.guest.id,
        ip: props.guest.ip,
        tokenType: "refresh",
        created_at: toISOStringSafe(new Date()),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(accessExpires)),
    refreshable_until: toISOStringSafe(new Date(refreshExpires)),
  };

  return {
    expiresIn: 3600,
    guestId: props.guest.id,
    token,
  };
}
