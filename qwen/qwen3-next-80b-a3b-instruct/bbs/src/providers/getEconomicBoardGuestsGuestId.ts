import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardGuest";

export async function getEconomicBoardGuestsGuestId(props: {
  guestId: string & tags.Format<"uuid">;
}): Promise<IEconomicBoardGuest> {
  const guest = await MyGlobal.prisma.economic_board_guest.findUniqueOrThrow({
    where: { id: props.guestId },
  });

  return {
    id: guest.id,
    created_at: toISOStringSafe(guest.created_at),
    session_id: guest.session_id,
    ip_hash: guest.ip_hash !== null ? guest.ip_hash : undefined,
    last_active: toISOStringSafe(guest.last_active),
  };
}
