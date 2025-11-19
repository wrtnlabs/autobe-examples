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
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestRefresh(props: {
  guest: GuestPayload;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  // Validate that the guest session exists and is active
  const guestRecord = await MyGlobal.prisma.discussion_board_guests.findFirst({
    where: {
      id: props.guest.id,
      deleted_at: null,
    },
  });

  if (!guestRecord) {
    throw new HttpException("Guest session not found or has been deleted", 404);
  }

  // Generate new tokens with the same session_id
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  let accessToken: string;
  let refreshToken: string;

  try {
    accessToken = jwt.sign(
      {
        type: "guest",
        id: props.guest.id,
        session_id: props.guest.session_id,
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    );

    refreshToken = jwt.sign(
      {
        type: "guest",
        id: props.guest.id,
        session_id: props.guest.session_id,
        tokenType: "refresh",
        created_at: new Date().toISOString(),
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    );
  } catch (error) {
    throw new HttpException("Failed to generate authentication tokens", 500);
  }

  const token = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update guest record with new timestamp
  const updatedGuest = await MyGlobal.prisma.discussion_board_guests.update({
    where: {
      id: props.guest.id,
    },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the refreshed guest authentication response
  return {
    id: updatedGuest.id as string & tags.Format<"uuid">,
    guest_token: updatedGuest.guest_token,
    created_at: toISOStringSafe(updatedGuest.created_at),
    updated_at: toISOStringSafe(updatedGuest.updated_at),
    deleted_at: updatedGuest.deleted_at
      ? toISOStringSafe(updatedGuest.deleted_at)
      : undefined,
    token: {
      access: token.access,
      refresh: token.refresh,
      expired_at: token.expired_at as string & tags.Format<"date-time">,
      refreshable_until: token.refreshable_until as string &
        tags.Format<"date-time">,
    },
  };
}
