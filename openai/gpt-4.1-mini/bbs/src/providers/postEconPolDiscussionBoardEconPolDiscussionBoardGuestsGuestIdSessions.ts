import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";

export async function postEconPolDiscussionBoardEconPolDiscussionBoardGuestsGuestIdSessions(props: {
  guestId: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardGuestSession.ICreate;
}): Promise<IEconPolDiscussionBoardGuestSession> {
  const nowISO = toISOStringSafe(new Date());

  const guest =
    await MyGlobal.prisma.econ_pol_discussion_board_guests.findUnique({
      where: { id: props.guestId },
    });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  const created =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.create({
      data: {
        id: v4(),
        econ_pol_discussion_board_guest_id: props.guestId,
        ip: props.body.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: nowISO,
        expired_at: props.body.expired_at ?? null,
      },
    });

  return {
    id: created.id,
    econ_pol_discussion_board_guest_id:
      created.econ_pol_discussion_board_guest_id,
    ip: created.ip,
    href: created.href,
    referrer: created.referrer,
    created_at: toISOStringSafe(new Date(created.created_at)),
    expired_at: created.expired_at
      ? toISOStringSafe(new Date(created.expired_at))
      : null,
  };
}
