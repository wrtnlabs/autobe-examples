import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuestSession";

export async function getEconPolDiscussionBoardEconPolDiscussionBoardGuestsGuestIdSessionsId(props: {
  guestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardGuestSession> {
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findFirst({
      where: {
        id: props.id,
        econ_pol_discussion_board_guest_id: props.guestId,
      },
    });

  if (session === null) {
    throw new HttpException("Guest session not found", 404);
  }

  return {
    id: session.id,
    econ_pol_discussion_board_guest_id:
      session.econ_pol_discussion_board_guest_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null
        ? null
        : session.expired_at === undefined
          ? undefined
          : toISOStringSafe(session.expired_at),
  };
}
