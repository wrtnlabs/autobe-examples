import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

export async function getEconPolDiscussionBoardEconPolDiscussionBoardGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IEconPolDiscussionBoardGuest> {
  const guest =
    await MyGlobal.prisma.econ_pol_discussion_board_guests.findUnique({
      where: { id: props.guestId },
    });

  if (!guest) {
    throw new HttpException("Guest not found", 404);
  }

  return {
    id: guest.id,
    username: guest.username,
    created_at: toISOStringSafe(guest.created_at),
    updated_at: toISOStringSafe(guest.updated_at),
  };
}
