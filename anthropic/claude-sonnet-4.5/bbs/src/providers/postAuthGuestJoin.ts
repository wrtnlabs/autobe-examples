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

export async function postAuthGuestJoin(props: {
  body: IDiscussionBoardGuest.ICreate;
}): Promise<IDiscussionBoardGuest.IAuthorized> {
  const existing = await MyGlobal.prisma.discussion_board_guests.findUnique({
    where: { session_identifier: props.body.session_identifier },
  });

  if (existing) {
    throw new HttpException("Session identifier already exists", 409);
  }

  const now = toISOStringSafe(new Date());
  const guestId = v4();

  const guest = await MyGlobal.prisma.discussion_board_guests.create({
    data: {
      id: guestId,
      session_identifier: props.body.session_identifier,
      ip_address: props.body.ip_address ?? "",
      user_agent: props.body.user_agent,
      first_visit_at: now,
      last_visit_at: now,
      page_views: 0,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpires = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: guest.id,
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
        id: guest.id,
        session_id: guest.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };

  return {
    id: guest.id,
    session_identifier: guest.session_identifier,
    ip_address: guest.ip_address,
    user_agent: guest.user_agent,
    first_visit_at: toISOStringSafe(guest.first_visit_at),
    last_visit_at: toISOStringSafe(guest.last_visit_at),
    page_views: guest.page_views,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    token,
  };
}
