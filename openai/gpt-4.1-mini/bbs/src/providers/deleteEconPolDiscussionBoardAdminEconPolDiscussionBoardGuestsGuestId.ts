import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteEconPolDiscussionBoardAdminEconPolDiscussionBoardGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_guests.findUnique({
      where: { id: props.guestId },
    });

  if (!existing) {
    throw new HttpException("EconPolDiscussionBoardGuest not found", 404);
  }

  await MyGlobal.prisma.econ_pol_discussion_board_guests.delete({
    where: { id: props.guestId },
  });
}
