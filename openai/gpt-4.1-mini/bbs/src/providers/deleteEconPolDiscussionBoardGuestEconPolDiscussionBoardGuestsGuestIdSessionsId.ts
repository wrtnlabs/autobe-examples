import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { GuestPayload } from "../decorators/payload/GuestPayload";

export async function deleteEconPolDiscussionBoardGuestEconPolDiscussionBoardGuestsGuestIdSessionsId(props: {
  guest: GuestPayload;
  guestId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const session =
    await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.findUnique({
      where: {
        id: props.id,
      },
    });

  if (session === null) {
    throw new HttpException("Guest session not found", 404);
  }

  if (session.econ_pol_discussion_board_guest_id !== props.guestId) {
    throw new HttpException(
      "Forbidden: Cannot delete session of another guest",
      403,
    );
  }

  await MyGlobal.prisma.econ_pol_discussion_board_guest_sessions.delete({
    where: {
      id: props.id,
    },
  });
}
