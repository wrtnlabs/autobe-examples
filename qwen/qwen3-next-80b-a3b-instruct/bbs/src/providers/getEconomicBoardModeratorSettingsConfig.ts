import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorSettingsConfig(props: {
  moderator: ModeratorPayload;
}): Promise<IEconomicBoardSystemConfig> {
  const configs = await MyGlobal.prisma.economic_board_system_config.findMany({
    select: { value: true },
  });

  if (configs.length === 0) {
    throw new HttpException("No system configuration found", 404);
  }

  // Return the first configuration value as per the expected DTO type IEconomicBoardSystemConfig = string
  return configs[0].value;
}
