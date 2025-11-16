import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";
import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function putEconPolDiscussionBoardGuestEconPolDiscussionBoardGuestsGuestIdSessionsId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardGuestSession.IUpdate;
}): Promise<IEconPolDiscussionBoardGuestSession> {
  if (props.guest.id !== props.guestId) {
    throw new HttpException("Forbidden", 403);
  }

  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findUnique({
      where: { id: props.id },
    });

  if (!existing) {
    throw new HttpException("Guest session not found", 404);
  }

  if (existing.econ_pol_discussion_board_guest_id !== props.guestId) {
    throw new HttpException("Forbidden", 403);
  }

  const updated =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.update({
      where: { id: props.id },
      data: {
        ip:
          props.body.ip === undefined || props.body.ip === null
            ? undefined
            : props.body.ip,
        href:
          props.body.href === undefined || props.body.href === null
            ? undefined
            : props.body.href,
        referrer:
          props.body.referrer === undefined || props.body.referrer === null
            ? undefined
            : props.body.referrer,
        expired_at:
          props.body.expires_at === undefined || props.body.expires_at === null
            ? undefined
            : new Date(props.body.expires_at),
      },
    });

  return {
    id: updated.id,
    econ_pol_discussion_board_guest_id:
      updated.econ_pol_discussion_board_guest_id,
    ip: updated.ip,
    href: updated.href,
    referrer: updated.referrer,
    created_at: toISOStringSafe(updated.created_at),
    expired_at:
      updated.expired_at === null ? null : toISOStringSafe(updated.expired_at),
  };
}
