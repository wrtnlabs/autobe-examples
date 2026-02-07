import { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEconomicBoardAdministratorBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string;
}): Promise<IEconomicBoardBan> {
  const ban = await MyGlobal.prisma.economic_board_bans.findUnique({
    where: { id: props.banId },
    select: {
      id: true,
      economic_board_citizens_id: true,
      economic_board_administrators_id: true,
      ban_reason: true,
      banned_at: true,
      unbanned_at: true,
    },
  });
  if (!ban || ban.unbanned_at !== null) {
    throw new HttpException("Ban not found", 404);
  }
  const updatedBan = await MyGlobal.prisma.economic_board_bans.update({
    where: { id: props.banId },
    data: {
      unbanned_at: toISOStringSafe(new Date()),
    },
  });
  return {
    id: updatedBan.id,
    economic_board_citizens_id: updatedBan.economic_board_citizens_id,
    economic_board_administrators_id:
      updatedBan.economic_board_administrators_id,
    ban_reason: updatedBan.ban_reason,
    banned_at: toISOStringSafe(updatedBan.banned_at),
    unbanned_at:
      updatedBan.unbanned_at !== null && updatedBan.unbanned_at !== undefined
        ? toISOStringSafe(updatedBan.unbanned_at)
        : null,
  };
}
