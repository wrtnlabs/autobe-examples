import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";

export async function getDiscussionBoardConfigurationsConfigKey(props: {
  configKey: string;
}): Promise<IDiscussionBoardConfiguration> {
  const configuration =
    await MyGlobal.prisma.discussion_board_configurations.findFirst({
      where: {
        config_key: props.configKey,
      },
    });

  if (!configuration) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  return {
    id: configuration.id,
    config_key: configuration.config_key,
    config_value: configuration.config_value,
    config_type: configuration.config_type,
    description: configuration.description,
    created_at: toISOStringSafe(configuration.created_at),
    updated_at: toISOStringSafe(configuration.updated_at),
  };
}
