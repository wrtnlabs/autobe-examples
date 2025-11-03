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

  // Verify and decode the refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: "guest";
    created_at: string;
  };

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as {
      id: string;
      session_id: string;
      type: "guest";
      created_at: string;
    };
  } catch (error) {
    throw new HttpException("Invalid or expired refresh token", 401);
  }

  // Validate type matches expected actor type
  if (decoded.type !== "guest") {
    throw new HttpException("Invalid token type for guest refresh", 403);
  }

  // Validate guest exists
  const guest = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { id: decoded.id },
  });

  if (!guest) {
    throw new HttpException("Guest session not found or expired", 401);
  }

  // Generate new tokens with SAME session_id
  const now = toISOStringSafe(new Date());
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "1h",
        issuer: "autobe",
      },
    ),
    refresh: jwt.sign(
      {
        type: "guest",
        id: decoded.id,
        session_id: decoded.session_id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "14d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  // Update guest's last activity timestamp
  const updatedGuest = await MyGlobal.prisma.discussion_board_guests.update({
    where: { id: decoded.id },
    data: {
      last_activity_at: now,
    },
  });

  // Return complete guest information with new tokens
  return {
    id: updatedGuest.id as string & tags.Format<"uuid">,
    session_token: updatedGuest.session_token,
    ip_address: updatedGuest.ip_address,
    user_agent: updatedGuest.user_agent ?? null,
    last_activity_at: toISOStringSafe(updatedGuest.last_activity_at),
    created_at: toISOStringSafe(updatedGuest.created_at),
    token,
  };
}
