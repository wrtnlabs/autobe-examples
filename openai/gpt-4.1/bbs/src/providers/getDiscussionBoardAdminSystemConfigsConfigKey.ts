import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfig";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminSystemConfigsConfigKey(props: {
  admin: AdminPayload;
  configKey: string;
}): Promise<IDiscussionBoardSystemConfig> {
  const config =
    await MyGlobal.prisma.discussion_board_system_configs.findFirst({
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    });

  if (config === null) {
    throw new HttpException("Configuration entry not found", 404);
  }

  return {
    id: config.id,
    config_key: config.config_key,
    config_value: config.config_value,
    description:
      config.description === null
        ? null
        : config.description === undefined
          ? undefined
          : config.description,
    created_at: toISOStringSafe(config.created_at),
    updated_at: toISOStringSafe(config.updated_at),
    deleted_at:
      config.deleted_at === null || config.deleted_at === undefined
        ? undefined
        : toISOStringSafe(config.deleted_at),
  };
}
