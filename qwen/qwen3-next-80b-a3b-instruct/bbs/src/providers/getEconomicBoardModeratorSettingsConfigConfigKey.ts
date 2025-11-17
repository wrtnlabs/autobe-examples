import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconomicBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSystemConfig";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getEconomicBoardModeratorSettingsConfigConfigKey(props: {
  moderator: ModeratorPayload;
  configKey: string;
}): Promise<IEconomicBoardSystemConfig> {
  const config = await MyGlobal.prisma.economic_board_system_config.findUnique({
    where: {
      key: props.configKey,
    },
  });

  if (!config) {
    throw new HttpException("Configuration key not found", 404);
  }

  return config.value;
}
