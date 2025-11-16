import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function postAuthGuestJoin(props: {
  guest: GuestPayload;
  body: IEconPolDiscussionBoardGuest.ICreate;
}): Promise<IEconPolDiscussionBoardGuest.IAuthorized> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_guests.findFirst({
      where: { username: props.body.username },
    });

  if (existing !== null) {
    throw new HttpException("Username already exists", 409);
  }

  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const guestId: string & tags.Format<"uuid"> = v4();

  const guest = await MyGlobal.prisma.econ_pol_discussion_board_guests.create({
    data: {
      id: guestId,
      username: props.body.username,
      created_at: now,
      updated_at: now,
    },
  });

  const accessExpireDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpireDate: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId: string & tags.Format<"uuid"> = v4();

  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.create({
      data: {
        id: sessionId,
        econ_pol_discussion_board_guest_id: guestId,
        href: props.body.href satisfies string as string,
        referrer: props.body.referrer satisfies string as string,
        created_at: now,
        expired_at: accessExpireDate,
        ip: (props.body.ip ?? "") satisfies string,
      },
    });

  const token = {
    access: jwt.sign(
      {
        type: "guest",
        id: guest.id,
        session_id: session.id,
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
        session_id: session.id,
        tokenType: "refresh",
        created_at: now,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      {
        expiresIn: "7d",
        issuer: "autobe",
      },
    ),
    expired_at: accessExpireDate,
    refreshable_until: refreshExpireDate,
  };

  return {
    id: guest.id,
    username: guest.username,
    ip: props.body.ip ?? undefined,
    user_agent: props.body.user_agent ?? undefined,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
    token,
  };
}
