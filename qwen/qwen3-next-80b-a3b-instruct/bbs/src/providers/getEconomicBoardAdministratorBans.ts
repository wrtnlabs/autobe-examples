import { IEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardBan";
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

export async function getEconomicBoardAdministratorBans(props: {
  administrator: AdministratorPayload;
}): Promise<IPageIEconomicBoardBan.ISummary> {
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.economic_board_bans.findMany({
    where: {},
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
    include: {
      citizen: { select: { display_name: true } },
      administrator: { select: { display_name: true } },
    },
  });
  const total = await MyGlobal.prisma.economic_board_bans.count({
    where: {},
  });
  return {
    data: data.map((ban) => ({
      id: ban.id,
      citizen_display_name: ban.citizen.display_name,
      administrator_display_name: ban.administrator.display_name,
      ban_reason: ban.ban_reason,
      banned_at: toISOStringSafe(ban.banned_at),
      unbanned_at: ban.unbanned_at ? toISOStringSafe(ban.unbanned_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
