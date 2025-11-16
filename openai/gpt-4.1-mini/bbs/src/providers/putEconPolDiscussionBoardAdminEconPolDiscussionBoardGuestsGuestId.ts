import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconPolDiscussionBoardAdminEconPolDiscussionBoardGuestsGuestId(props: {
  admin: AdminPayload;
  guestId: string & tags.Format<"uuid">;
  body: IEconPolDiscussionBoardGuest.IUpdate;
}): Promise<IEconPolDiscussionBoardGuest> {
  const existing =
    await MyGlobal.prisma.econ_pol_discussion_board_guests.findUnique({
      where: { id: props.guestId },
    });

  if (!existing) {
    throw new HttpException(`Guest not found: ${props.guestId}`, 404);
  }

  const updated = await MyGlobal.prisma.econ_pol_discussion_board_guests.update(
    {
      where: { id: props.guestId },
      data: {
        username: props.body.username,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        username: true,
        created_at: true,
        updated_at: true,
      },
    },
  );

  return {
    id: updated.id,
    username: updated.username,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
