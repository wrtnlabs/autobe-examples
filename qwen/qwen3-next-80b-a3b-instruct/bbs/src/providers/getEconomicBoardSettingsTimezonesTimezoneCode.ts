import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardTimezoneSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardTimezoneSetting";

export async function getEconomicBoardSettingsTimezonesTimezoneCode(props: {
  timezoneCode: string;
}): Promise<IEconomicBoardTimezoneSetting> {
  const timezone =
    await MyGlobal.prisma.economic_board_timezone_settings.findUnique({
      where: { code: props.timezoneCode },
    });

  if (!timezone) {
    throw new HttpException("Timezone not found", 404);
  }

  return props.timezoneCode;
}
