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

export async function getEconomicBoardAdministratorBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string;
}): Promise<IEconomicBoardBan> {
  const ban = await MyGlobal.prisma.economic_board_bans.findUnique({
    where: { id: props.banId },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  return {
    id: ban.id,
    economic_board_citizens_id: ban.economic_board_citizens_id,
    economic_board_administrators_id: ban.economic_board_administrators_id,
    ban_reason: ban.ban_reason,
    banned_at: toISOStringSafe(ban.banned_at),
    unbanned_at: ban.unbanned_at ? toISOStringSafe(ban.unbanned_at) : null,
  };
}
