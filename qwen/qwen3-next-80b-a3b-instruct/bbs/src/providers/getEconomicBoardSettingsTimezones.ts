import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardTimezoneSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function getEconomicBoardSettingsTimezones(): Promise<IPageIEconomicBoardTimezoneSetting> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [timezones, total] = await Promise.all([
    MyGlobal.prisma.economic_board_timezone_settings.findMany({
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    MyGlobal.prisma.economic_board_timezone_settings.count(),
  ]);

  return {
    data: timezones.map((tz) => tz.name),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
